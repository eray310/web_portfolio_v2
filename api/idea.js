// Brief / idea form endpoint (Vercel serverless function; also run by the dev/preview server).
// Two forms post here: the three-step brief ("Projeni anlat", on /hakkimda and the home page,
// with `services` and `brief`) and the older "Bir fikrim var" panel (`type` and `summary`).
//
// It only reports success after the mail provider accepted the request. Secrets live in
// environment variables, never in the browser or the repository:
//   RESEND_API_KEY  API key of the mail provider (Resend)
//   IDEA_TO         the address that receives the ideas
//   IDEA_FROM       a sender the provider has verified, e.g. "Portfolyo <fikir@alan-adin.com>"
//   IDEA_API_URL    optional, replaces the provider address (used by tests with a mock server)
//   IDEA_ORIGINS    optional, comma separated allowed origins besides the site's own host

// Services of the brief form (keep in step with src/data/brief.ts).
const SERVICES = ["Motion Design", "Video Kurgu", "AI Artist", "Art Direction", "Grafik Tasarım", "Birlikte belirleyelim"];
// Types of the older "Bir fikrim var" panel.
const TYPES = ["Reklam Videosu", "Motion Design", "Video Kurgu", "Henüz Net Değil"];
const MIN_FILL_MS = 1500; // a person needs more than this to fill the form
const MAX_FILL_MS = 6 * 60 * 60 * 1000;
const LIMIT = Number(process.env.IDEA_LIMIT) || 5; // per address per window
const WINDOW_MS = 10 * 60 * 1000;
const hits = (globalThis.__ideaHits ??= new Map()); // best effort: lives as long as the function instance

const clean = (v, max) =>
  String(v ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);

const oneLine = (v, max) => clean(v, max).replace(/\s+/g, " ");
const esc = (v) =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** A calendar date typed as YYYY-MM-DD that really exists, from yesterday to three years ahead. */
function validDate(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + "T00:00:00Z");
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return false;
  const now = Date.now();
  return d.getTime() >= now - 36 * 60 * 60 * 1000 && d.getTime() <= now + 3 * 366 * 24 * 60 * 60 * 1000;
}

const fail = (res, status, error, fields) => res.status(status).json({ ok: false, error, ...(fields ? { fields } : {}) });

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 500) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return list.length > LIMIT;
}

function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin form posts from some browsers send none
  let host;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const own = req.headers["x-forwarded-host"] || req.headers.host;
  const extra = (process.env.IDEA_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return host === own || extra.includes(origin) || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(res, 405, "method");
  }
  if (!originAllowed(req)) return fail(res, 403, "origin");
  if (!String(req.headers["content-type"] || "").includes("application/json")) return fail(res, 415, "content_type");

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  if (limited(ip)) {
    res.setHeader("Retry-After", String(Math.ceil(WINDOW_MS / 1000)));
    return fail(res, 429, "rate_limited");
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return fail(res, 400, "bad_json");
    }
  }
  if (!body || typeof body !== "object") return fail(res, 400, "bad_json");

  // Spam traps: a hidden field a person never fills, and a form that was filled too fast.
  const filled = Number(body.t);
  if (clean(body.website, 200) || !(filled >= MIN_FILL_MS && filled <= MAX_FILL_MS)) return fail(res, 400, "rejected");

  const name = oneLine(body.name, 80);
  const email = oneLine(body.email, 120);
  const company = oneLine(body.company, 100);
  const reference = oneLine(body.reference, 300);
  const fields = {};

  // The brief form sends `services` (a list); the older panel sends one `type`.
  const isBrief = Array.isArray(body.services);
  let services;
  let brief;
  let deadline = "";
  let budget = "";
  if (isBrief) {
    services = [...new Set(body.services.map((v) => oneLine(v, 40)))];
    brief = clean(body.brief, 2000);
    deadline = oneLine(body.deadline, 10);
    budget = oneLine(body.budget, 80);
    if (!services.length || services.length > SERVICES.length || !services.every((v) => SERVICES.includes(v))) fields.services = "En az bir iş türü seç.";
    if (brief.length < 10) fields.brief = "Projeni birkaç cümleyle anlat.";
    if (deadline && !validDate(deadline)) fields.deadline = "Geçerli bir tarih seç.";
  } else {
    const type = oneLine(body.type, 40);
    services = [type];
    brief = clean(body.summary, 2000);
    if (!TYPES.includes(type)) fields.type = "Proje türünü seç.";
    if (brief.length < 10) fields.summary = "Fikrini birkaç cümleyle anlat.";
  }
  if (name.length < 2) fields.name = "Adını yaz.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fields.email = "Geçerli bir e-posta yaz.";
  if (reference) {
    try {
      const u = new URL(reference);
      if (!/^https?:$/.test(u.protocol) || /\s/.test(reference) || !u.hostname.includes(".")) throw new Error("scheme");
    } catch {
      fields.reference = "Geçerli bir bağlantı yaz (https://...).";
    }
  }
  if (Object.keys(fields).length) return fail(res, 400, "validation", fields);

  const key = process.env.RESEND_API_KEY;
  const to = process.env.IDEA_TO;
  const from = process.env.IDEA_FROM;
  if (!key || !to || !from) return fail(res, 503, "not_configured");

  // Readable in any mail client: one labelled line per answer, the brief last.
  const rows = [
    [isBrief ? "Hizmetler" : "Proje türü", services.join(", ")],
    ["Ad", name],
    ["E-posta", email],
    company ? ["Marka / şirket", company] : null,
    deadline ? ["Hedef teslim tarihi", deadline] : null,
    budget ? ["Bütçe aralığı", budget] : null,
    reference ? ["Referans", reference] : null,
  ].filter(Boolean);
  const text = [...rows.map(([k, v]) => `${k}: ${v}`), "", isBrief ? "Brief:" : "Fikir:", brief].join("\n");
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#111">` +
    `<table style="border-collapse:collapse">` +
    rows.map(([k, v]) => `<tr><td style="padding:2px 14px 2px 0;color:#555;vertical-align:top">${esc(k)}</td><td style="padding:2px 0"><strong>${esc(v)}</strong></td></tr>`).join("") +
    `</table><p style="margin:18px 0 4px;color:#555">${isBrief ? "Brief" : "Fikir"}</p>` +
    `<p style="margin:0;white-space:pre-wrap">${esc(brief)}</p></div>`;
  const subject = oneLine(`Yeni ${isBrief ? "brief" : "fikir"}: ${services.join(", ")} — ${name}`, 150);

  let provider;
  try {
    provider = await fetch(process.env.IDEA_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject, text, html }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return fail(res, 502, "provider_unreachable");
  }
  // Success is reported only when the provider accepted the request.
  if (!provider.ok) return fail(res, 502, "provider_rejected");
  return res.status(200).json({ ok: true });
}
