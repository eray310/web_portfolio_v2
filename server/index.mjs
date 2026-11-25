// Brief and KVKK application receiver (PROTOTYPE, draft branch only; the site does not call it yet).
//
// Meant to run on a small Linux server physically in Türkiye (see docs/turkiye-sunucu-plani.md).
// No dependency: Node 22+ (node:sqlite, node:crypto, node:http).
//
//   POST /api/brief            the brief form of the site  -> stored encrypted, owner gets "Yeni brief var"
//   POST /api/kvkk-basvuru     the planned KVKK application form -> stored encrypted, due date = +30 days
//   GET  /admin/briefs, /admin/applications   (Bearer ADMIN_TOKEN) decrypts for the owner
//   DELETE /admin/briefs/:id, PATCH /admin/applications/:id
//
// What it never does: log a request body or an IP address, put a name / e-mail / text of a brief into the
// notification, or answer "ok" before the record is written.
//
// Environment (no value belongs in the repository):
//   ENC_KEY       64 hex characters (32 bytes), encrypts every record:  openssl rand -hex 32
//   ADMIN_TOKEN   at least 24 characters, for /admin/*
//   ORIGINS       comma separated site origins allowed to post, e.g. https://www.erayomeroglu.com
//   DATA_DIR      where the SQLite file lives (default ./data)
//   PORT          default 8787
//   NOTIFY_URL    optional; receives a POST with the plain text "Yeni brief var" (ntfy-style, content-free)
//   TRUST_PROXY   "1" when a reverse proxy (Caddy / nginx) sets X-Forwarded-For

import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SERVICES = [
  "Motion Design", "Video Kurgu", "AI Artist", "Art Direction", "Grafik Tasarım",
  "Web Sitesi", "Reklam Filmi ve Video", "Uygulama Geliştirme", "Birlikte belirleyelim",
];
const MAX_BODY = 24 * 1024;
const MIN_FILL_MS = 1500;
const MAX_FILL_MS = 6 * 60 * 60 * 1000;
const WINDOW_MS = 10 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

const clean = (v, max) =>
  String(v ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
const oneLine = (v, max) => clean(v, max).replace(/\s+/g, " ");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** T.C. kimlik no: 11 digits, first not 0, and the two check digits. */
export function validTc(v) {
  if (!/^[1-9]\d{10}$/.test(v)) return false;
  const d = v.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const t10 = (((odd * 7 - even) % 10) + 10) % 10;
  const t11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d[9] === t10 && d[10] === t11;
}

function validBrief(body) {
  const f = {};
  const services = Array.isArray(body.services) ? [...new Set(body.services.map((v) => oneLine(v, 40)))] : [];
  if (!services.length || !services.every((v) => SERVICES.includes(v))) f.services = "En az bir iş türü seç.";
  const brief = clean(body.brief, 2000);
  if (brief.length < 10) f.brief = "Projeni birkaç cümleyle anlat.";
  const name = oneLine(body.name, 80);
  if (name.length < 2) f.name = "Adını yaz.";
  const email = oneLine(body.email, 120);
  if (!EMAIL.test(email)) f.email = "Geçerli bir e-posta yaz.";
  const deadline = oneLine(body.deadline, 10);
  if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) f.deadline = "Geçerli bir tarih seç.";
  const reference = oneLine(body.reference, 300);
  if (reference) {
    try {
      const u = new URL(reference);
      if (!/^https?:$/.test(u.protocol)) throw new Error("scheme");
    } catch {
      f.reference = "Geçerli bir bağlantı yaz (https://...).";
    }
  }
  return { f, data: { services, brief, name, email, company: oneLine(body.company, 100), deadline, budget: oneLine(body.budget, 80), reference } };
}

function validApplication(body) {
  const f = {};
  const fullName = oneLine(body.fullName, 100);
  if (fullName.split(" ").length < 2 || fullName.length < 5) f.fullName = "Adını ve soyadını yaz.";
  const idType = body.idType === "foreign" ? "foreign" : "tc";
  const idNumber = oneLine(body.idNumber, 30).replace(/\s/g, "");
  if (idType === "tc" ? !validTc(idNumber) : idNumber.length < 5) f.idNumber = idType === "tc" ? "Geçerli bir T.C. kimlik numarası yaz." : "Pasaport veya kimlik numaranı yaz.";
  const nationality = idType === "foreign" ? oneLine(body.nationality, 60) : "";
  if (idType === "foreign" && nationality.length < 2) f.nationality = "Uyruğunu yaz.";
  const address = oneLine(body.address, 300);
  if (address.length < 15) f.address = "Yanıtın gönderileceği yerleşim yeri veya iş yeri adresini yaz.";
  const email = oneLine(body.email, 120);
  if (email && !EMAIL.test(email)) f.email = "Geçerli bir e-posta yaz.";
  const phone = oneLine(body.phone, 30);
  const request = clean(body.request, 3000);
  if (request.length < 10) f.request = "Talebini birkaç cümleyle yaz.";
  return { f, data: { fullName, idType, idNumber, nationality, address, email, phone, request } };
}

export function start(config = {}) {
  const cfg = {
    port: Number(config.port ?? process.env.PORT ?? 8787),
    dataDir: config.dataDir ?? process.env.DATA_DIR ?? "./data",
    encKey: config.encKey ?? process.env.ENC_KEY ?? "",
    adminToken: config.adminToken ?? process.env.ADMIN_TOKEN ?? "",
    origins: (config.origins ?? process.env.ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    notifyUrl: config.notifyUrl ?? process.env.NOTIFY_URL ?? "",
    trustProxy: (config.trustProxy ?? process.env.TRUST_PROXY) === "1" || config.trustProxy === true,
    host: config.host ?? "127.0.0.1",
    briefLimit: Number(config.briefLimit ?? 5), // per address and 10 minutes
    applicationLimit: Number(config.applicationLimit ?? 3),
  };
  if (!/^[0-9a-f]{64}$/i.test(cfg.encKey)) throw new Error("ENC_KEY must be 64 hex characters");
  if (cfg.adminToken.length < 24) throw new Error("ADMIN_TOKEN must be at least 24 characters");
  const key = Buffer.from(cfg.encKey, "hex");

  fs.mkdirSync(cfg.dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(cfg.dataDir, "records.sqlite"));
  db.exec(`
    CREATE TABLE IF NOT EXISTS briefs (id TEXT PRIMARY KEY, created INTEGER NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, created INTEGER NOT NULL, due INTEGER NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL);
  `);

  // AES-256-GCM. The table name is bound to the ciphertext, so a brief cannot be replayed as an application.
  const seal = (obj, aad) => {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv("aes-256-gcm", key, iv);
    c.setAAD(Buffer.from(aad));
    const ct = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
  };
  const open = (b64, aad) => {
    const raw = Buffer.from(b64, "base64");
    const d = crypto.createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    d.setAAD(Buffer.from(aad));
    d.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8"));
  };

  const hits = new Map();
  const limited = (ip, bucket, max) => {
    const now = Date.now();
    const k = bucket + "|" + ip;
    const list = (hits.get(k) || []).filter((t) => now - t < WINDOW_MS);
    list.push(now);
    hits.set(k, list);
    if (hits.size > 2000) for (const [kk, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(kk);
    return list.length > max;
  };

  const ref = (prefix) => prefix + "-" + crypto.randomBytes(5).toString("hex").toUpperCase();
  const send = (res, status, obj, extra = {}) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra });
    res.end(JSON.stringify(obj));
  };
  const fail = (res, status, error, fields, extra) => send(res, status, { ok: false, error, ...(fields ? { fields } : {}) }, extra);

  const notify = async (text) => {
    if (!cfg.notifyUrl) return;
    try {
      await fetch(cfg.notifyUrl, { method: "POST", headers: { "Content-Type": "text/plain; charset=utf-8" }, body: text, signal: AbortSignal.timeout(5000) });
    } catch {
      console.error("notification failed"); // no detail: nothing about the record
    }
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      let size = 0;
      let dropped = false;
      const chunks = [];
      req.on("data", (c) => {
        if (dropped) return; // keep reading (and discarding) so the answer can still be delivered
        size += c.length;
        if (size > MAX_BODY) {
          dropped = true;
          chunks.length = 0;
          reject(Object.assign(new Error("too_large"), { code: "too_large" }));
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });

  const adminOk = (req) => {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
    if (!m) return false;
    const a = Buffer.from(m[1]);
    const b = Buffer.from(cfg.adminToken);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://x");
      const origin = req.headers.origin;
      const cors = origin && cfg.origins.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {};
      if (req.method === "OPTIONS") {
        res.writeHead(204, { ...cors, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "600" });
        return res.end();
      }
      if (url.pathname === "/health") return send(res, 200, { ok: true });

      // ── owner side ──
      if (url.pathname.startsWith("/admin/")) {
        if (!adminOk(req)) return fail(res, 401, "unauthorized");
        const parts = url.pathname.split("/").filter(Boolean); // admin, kind, id?
        if (req.method === "GET" && parts[1] === "briefs" && !parts[2]) {
          const rows = db.prepare("SELECT id, created, payload FROM briefs ORDER BY created DESC").all();
          return send(res, 200, { ok: true, items: rows.map((r) => ({ id: r.id, created: r.created, ...open(r.payload, "briefs") })) });
        }
        if (req.method === "GET" && parts[1] === "applications" && !parts[2]) {
          const rows = db.prepare("SELECT id, created, due, status, payload FROM applications ORDER BY due ASC").all();
          return send(res, 200, { ok: true, items: rows.map((r) => ({ id: r.id, created: r.created, due: r.due, status: r.status, ...open(r.payload, "applications") })) });
        }
        if (req.method === "DELETE" && parts[1] === "briefs" && parts[2]) {
          const r = db.prepare("DELETE FROM briefs WHERE id = ?").run(parts[2]);
          return send(res, r.changes ? 200 : 404, { ok: r.changes > 0 });
        }
        if (req.method === "PATCH" && parts[1] === "applications" && parts[2]) {
          const body = JSON.parse((await readBody(req)) || "{}");
          if (!["new", "answered", "rejected"].includes(body.status)) return fail(res, 400, "validation");
          const r = db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(body.status, parts[2]);
          return send(res, r.changes ? 200 : 404, { ok: r.changes > 0 });
        }
        return fail(res, 404, "not_found");
      }

      // ── site side ──
      const isBrief = url.pathname === "/api/brief";
      const isApp = url.pathname === "/api/kvkk-basvuru";
      if (!isBrief && !isApp) return fail(res, 404, "not_found");
      if (req.method !== "POST") return fail(res, 405, "method", undefined, { Allow: "POST, OPTIONS" });
      if (!origin || !cfg.origins.includes(origin)) return fail(res, 403, "origin");
      if (!String(req.headers["content-type"] || "").includes("application/json")) return fail(res, 415, "content_type", undefined, cors);

      const ip = (cfg.trustProxy ? String(req.headers["x-forwarded-for"] || "").split(",").pop().trim() : "") || req.socket.remoteAddress || "unknown";
      if (limited(ip, isBrief ? "b" : "a", isBrief ? cfg.briefLimit : cfg.applicationLimit)) return fail(res, 429, "rate_limited", undefined, { ...cors, "Retry-After": String(WINDOW_MS / 1000) });

      let text;
      try {
        text = await readBody(req);
      } catch (e) {
        return fail(res, e.code === "too_large" ? 413 : 400, e.code === "too_large" ? "too_large" : "bad_body", undefined, { ...cors, Connection: "close" });
      }
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        return fail(res, 400, "bad_json", undefined, cors);
      }
      if (!body || typeof body !== "object") return fail(res, 400, "bad_json", undefined, cors);
      const filled = Number(body.t);
      if (clean(body.website, 200) || !(filled >= MIN_FILL_MS && filled <= MAX_FILL_MS)) return fail(res, 400, "rejected", undefined, cors);

      const { f, data } = isBrief ? validBrief(body) : validApplication(body);
      if (Object.keys(f).length) return fail(res, 400, "validation", f, cors);

      const id = ref(isBrief ? "B" : "K");
      const now = Date.now();
      try {
        if (isBrief) db.prepare("INSERT INTO briefs (id, created, payload) VALUES (?, ?, ?)").run(id, now, seal(data, "briefs"));
        else db.prepare("INSERT INTO applications (id, created, due, status, payload) VALUES (?, ?, ?, 'new', ?)").run(id, now, now + 30 * DAY, seal(data, "applications"));
      } catch {
        return fail(res, 500, "store_failed", undefined, cors); // never "ok" before the record is written
      }
      await notify(isBrief ? "Yeni brief var" : "Yeni KVKK başvurusu var");
      return send(res, 200, { ok: true, ref: id }, cors);
    } catch {
      return fail(res, 500, "error");
    }
  });

  return new Promise((resolve) => server.listen(cfg.port, cfg.host, () => resolve({ server, db, close: () => new Promise((r) => server.close(() => { db.close(); r(); })), port: server.address().port })));
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("server/index.mjs")) {
  start().then((s) => console.log(`listening on ${s.port}`));
}
