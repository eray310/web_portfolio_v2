// Tests with FAKE data only:  node server/test.mjs
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { start, validTc } from "./index.mjs";

let fails = 0;
const ok = (c, m) => {
  console.log((c ? "PASS " : "FAIL ") + m);
  if (!c) fails++;
};

// A made-up T.C. number that passes the checksum (not a real person's).
const base = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const t10 = ((base[0] + base[2] + base[4] + base[6] + base[8]) * 7 - (base[1] + base[3] + base[5] + base[7])) % 10;
const t11 = ([...base, t10].reduce((a, b) => a + b, 0)) % 10;
const FAKE_TC = base.join("") + t10 + t11;

// Mock notification endpoint: records what the owner's phone/mail would receive.
const notes = [];
const notifier = http.createServer((req, res) => {
  let b = "";
  req.on("data", (d) => (b += d));
  req.on("end", () => {
    notes.push({ body: b, headers: req.headers });
    res.end("ok");
  });
});
await new Promise((r) => notifier.listen(0, "127.0.0.1", r));
const notifyUrl = `http://127.0.0.1:${notifier.address().port}/topic`;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brief-test-"));
const encKey = crypto.randomBytes(32).toString("hex");
const adminToken = crypto.randomBytes(24).toString("hex");
const ORIGIN = "https://www.example.invalid";
const srv = await start({ port: 0, dataDir: dir, encKey, adminToken, origins: ORIGIN, notifyUrl, briefLimit: 100, applicationLimit: 100 });
const U = `http://127.0.0.1:${srv.port}`;
const post = (p, body, headers = {}) =>
  fetch(U + p, { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN, ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }).then(async (r) => ({ s: r.status, h: r.headers, j: await r.json().catch(() => ({})) }));
const admin = (p, init = {}) => fetch(U + p, { ...init, headers: { Authorization: "Bearer " + adminToken, "Content-Type": "application/json" } }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => ({})) }));

const brief = { services: ["Web Sitesi"], brief: "Deneme brief metni: gerçek bir istek değildir.", name: "Deneme Kişi", email: "deneme@example.invalid", company: "Deneme Ltd", deadline: "", budget: "", reference: "", website: "", t: 5000 };
const app = { fullName: "Deneme Kişi", idType: "tc", idNumber: FAKE_TC, address: "Deneme Mah. Örnek Sok. No:1 Sahte İlçe / Sahte İl", email: "deneme@example.invalid", phone: "", request: "Verilerimin işlenip işlenmediğini öğrenmek istiyorum (deneme).", website: "", t: 8000 };

ok(validTc(FAKE_TC) && !validTc("12345678901") && !validTc("00000000000"), "T.C. checksum accepts the made-up valid number and rejects wrong ones");

// brief: stored, notification is content-free
let r = await post("/api/brief", brief);
ok(r.s === 200 && r.j.ok === true && /^B-[0-9A-F]{10}$/.test(r.j.ref), "brief accepted, reference " + r.j.ref);
ok(notes.length === 1 && notes[0].body === "Yeni brief var", `notification text is exactly "Yeni brief var" (${JSON.stringify(notes[0]?.body)})`);
ok(!/Deneme|example|Web Sitesi/.test(notes[0].body + JSON.stringify(notes[0].headers)), "the notification carries no name, e-mail or brief text");
ok(r.h.get("access-control-allow-origin") === ORIGIN, "CORS answers only for the site's own origin");

// at rest: the file holds no readable personal data
let raw = new DatabaseSync(path.join(dir, "records.sqlite")).prepare("SELECT payload FROM briefs").all();
ok(raw.length === 1 && !/Deneme|example\.invalid|brief metni/.test(raw[0].payload), "database row is ciphertext: fake name, e-mail and text are not readable in it");
const wholeFile = fs.readFileSync(path.join(dir, "records.sqlite")).toString("latin1");
ok(!/Deneme Kişi|deneme@example/.test(wholeFile), "the SQLite file contains no readable fake name or e-mail");

// owner reads it back
r = await admin("/admin/briefs");
ok(r.s === 200 && r.j.items.length === 1 && r.j.items[0].name === "Deneme Kişi" && r.j.items[0].services[0] === "Web Sitesi", "owner (with token) can read the decrypted brief");
r = await fetch(U + "/admin/briefs");
ok(r.status === 401, "no token -> 401");
r = await fetch(U + "/admin/briefs", { headers: { Authorization: "Bearer " + "x".repeat(adminToken.length) } });
ok(r.status === 401, "wrong token -> 401");

// KVKK application
r = await post("/api/kvkk-basvuru", app);
ok(r.s === 200 && /^K-[0-9A-F]{10}$/.test(r.j.ref), "KVKK application accepted, reference " + r.j.ref);
ok(notes.length === 2 && notes[1].body === "Yeni KVKK başvurusu var", "its notification is content-free too");
const wholeFile2 = fs.readFileSync(path.join(dir, "records.sqlite")).toString("latin1");
ok(!wholeFile2.includes(FAKE_TC) && !/Sahte İlçe/.test(wholeFile2), "T.C. number and address are not readable in the database file");
r = await admin("/admin/applications");
const item = r.j.items?.[0];
ok(item && item.idNumber === FAKE_TC && item.status === "new", "owner sees the application with the decrypted fields");
const days = Math.round((item.due - item.created) / 86400000);
ok(days === 30, "the 30-day answer deadline is stored (" + days + " days)");
r = await admin("/admin/applications/" + item.id, { method: "PATCH", body: JSON.stringify({ status: "answered" }) });
ok(r.s === 200, "owner can mark it answered");
r = await admin("/admin/briefs/" + (await admin("/admin/briefs")).j.items[0].id, { method: "DELETE" });
ok(r.s === 200 && (await admin("/admin/briefs")).j.items.length === 0, "owner can delete a brief (manual deletion works)");

// a record cannot be swapped between tables, and the wrong key cannot read
const db2 = new DatabaseSync(path.join(dir, "records.sqlite"));
const appRow = db2.prepare("SELECT id, created, due, payload FROM applications").get();
db2.prepare("INSERT INTO briefs (id, created, payload) VALUES (?, ?, ?)").run("B-SWAP", Date.now(), appRow.payload);
r = await admin("/admin/briefs");
ok(r.s === 500, "an application ciphertext copied into the briefs table does not decrypt there (bound to its table)");
db2.prepare("DELETE FROM briefs WHERE id = 'B-SWAP'").run();
db2.close();

// abuse and bad input
r = await post("/api/brief", { ...brief, website: "x" });
ok(r.s === 400 && r.j.error === "rejected", "honeypot filled -> 400");
r = await post("/api/brief", { ...brief, t: 300 });
ok(r.s === 400 && r.j.error === "rejected", "filled in 0.3 s -> 400");
r = await post("/api/brief", { ...brief, email: "yanlis" });
ok(r.s === 400 && r.j.fields?.email, "bad e-mail -> 400 with a field message");
r = await post("/api/kvkk-basvuru", { ...app, idNumber: "11111111111" });
ok(r.s === 400 && r.j.fields?.idNumber, "invalid T.C. number -> 400");
r = await post("/api/brief", brief, { Origin: "https://evil.example" });
ok(r.s === 403, "foreign origin -> 403");
r = await fetch(U + "/api/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
ok(r.status === 403, "no origin -> 403");
r = await post("/api/brief", "x".repeat(30000));
ok(r.s === 413, "body over 24 KB -> 413");
r = await post("/api/brief", "not json");
ok(r.s === 400, "broken JSON -> 400");
r = await fetch(U + "/api/brief", { method: "GET" });
ok(r.status === 405, "GET -> 405");
// rate limit: a second server with the default limits (5 briefs / 3 applications per 10 minutes and address)
const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "brief-test2-"));
const lim = await start({ port: 0, dataDir: dir2, encKey, adminToken, origins: ORIGIN });
const L = `http://127.0.0.1:${lim.port}`;
const codes = [];
for (let i = 0; i < 8; i++) {
  const x = await fetch(L + "/api/brief", { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN }, body: JSON.stringify({ ...brief, name: "Deneme Kişi " + i }) });
  codes.push(x.status);
}
ok(codes.slice(0, 5).every((c) => c === 200) && codes.slice(5).every((c) => c === 429), "default limit: 5 briefs pass, the rest -> 429 (" + codes.join(",") + ")");
await lim.close();
fs.rmSync(dir2, { recursive: true, force: true });

// failure: the record cannot be written -> never "ok"
srv.db.exec("DROP TABLE applications");
r = await post("/api/kvkk-basvuru", app, {});
ok(r.s === 500 && r.j.ok === false, "if the record cannot be stored the answer is an error, never ok (" + r.s + ")");

// logging: the only console output in the server is a fixed notification-failure line
const src = fs.readFileSync(new URL("./index.mjs", import.meta.url), "utf8");
const calls = src.match(/console\.\w+\([^)]*\)/g) || [];
ok(calls.length === 2 && calls[0] === 'console.error("notification failed")' && calls[1].startsWith("console.log(`listening on"), "the server's only log lines are fixed texts (no body, no IP): " + JSON.stringify(calls));

await srv.close();
notifier.close();
fs.rmSync(dir, { recursive: true, force: true });
console.log(fails ? fails + " FAILED" : "ALL PASSED");
process.exit(fails ? 1 : 0);
