// "Bir fikrim var" form endpoint (Vercel serverless function; also run by the dev/preview server).
//
// It only reports success after the mail provider accepted the request. Secrets live in
// environment variables, never in the browser or the repository:
//   RESEND_API_KEY  API key of the mail provider (Resend)
//   IDEA_TO         the address that receives the ideas
//   IDEA_FROM       a sender the provider has verified, e.g. "Portfolyo <fikir@alan-adin.com>"
//   IDEA_API_URL    optional, replaces the provider address (used by tests with a mock server)
//   IDEA_ORIGINS    optional, comma separated allowed origins besides the site's own host

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

  const type = clean(body.type, 40);
  const name = clean(body.name, 80);
  const email = clean(body.email, 120);
  const summary = clean(body.summary, 2000);
  const reference = clean(body.reference, 300);
  const fields = {};
  if (!TYPES.includes(type)) fields.type = "Proje türünü seç.";
  if (name.length < 2) fields.name = "Adını yaz.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fields.email = "Geçerli bir e-posta yaz.";
  if (summary.length < 10) fields.summary = "Fikrini birkaç cümleyle anlat.";
  if (reference) {
    try {
      const u = new URL(reference);
      if (!/^https?:$/.test(u.protocol)) throw new Error("scheme");
    } catch {
      fields.reference = "Geçerli bir bağlantı yaz (https://...).";
    }
  }
  if (Object.keys(fields).length) return fail(res, 400, "validation", fields);

  const key = process.env.RESEND_API_KEY;
  const to = process.env.IDEA_TO;
  const from = process.env.IDEA_FROM;
  if (!key || !to || !from) return fail(res, 503, "not_configured");

  const text = [`Proje türü: ${type}`, `Ad: ${name}`, `E-posta: ${email}`, reference ? `Referans: ${reference}` : null, "", summary]
    .filter((l) => l !== null)
    .join("\n");

  let provider;
  try {
    provider = await fetch(process.env.IDEA_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: email, subject: `Yeni fikir: ${type} — ${name}`, text }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return fail(res, 502, "provider_unreachable");
  }
  // Success is reported only when the provider accepted the request.
  if (!provider.ok) return fail(res, 502, "provider_rejected");
  return res.status(200).json({ ok: true });
}
