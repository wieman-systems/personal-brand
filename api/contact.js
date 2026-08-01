// api/contact.js — Vercel Serverless Function (Node).
//
// Receives the contact-form POST from calebwieman.com and relays it to Caleb
// via Resend. The browser only ever talks to this same-origin endpoint, so the
// site's strict CSP is unaffected and the Resend API key never leaves the
// server. Configure the key as RESEND_API_KEY in the Vercel project's
// Environment Variables (never commit it).
//
// FROM must be an address on a domain you've verified in Resend. You verified
// wiemansystems.com, so noreply@wiemansystems.com works — change it here if you
// prefer a different verified sender.

const TO = "caleb@wiemansystems.com";
const FROM = "Wieman Systems <noreply@wiemansystems.com>";

const ALLOWED_ORIGINS = ["https://calebwieman.com", "https://www.calebwieman.com"];
// This project's own preview deploys only. Vercel preview URLs for the Wieman
// Systems team carry the team slug just before ".vercel.app" —
// personal-brand-<hash>-wieman-systems.vercel.app — so we require that
// "-wieman-systems" suffix. The slug is globally unique on Vercel and can't be
// re-registered by anyone else, so this rejects a bare personal-brand-*.vercel.app
// name an attacker could stand up under their own team.
const PREVIEW_ORIGIN = /^https:\/\/personal-brand-[a-z0-9-]+-wieman-systems\.vercel\.app$/;
function originAllowed(o) {
  // This is an Origin-header check, not an absolute defense. A browser reliably
  // sends Origin on a cross-site POST, so genuine cross-site form submissions from
  // another site are rejected — but a non-browser client (curl / server-to-server)
  // controls its own Origin header and could spoof an allowed value. The honeypot
  // and rate limiter below add friction, but the limiter is per-instance (see its
  // comment), so nothing here is a hard spend control — assume a motivated abuser
  // gets through and watch the Resend quota.
  // Require Origin to be present and on the allowlist — reject missing/empty Origin
  // (curl / server-to-server with no Origin) and any other site.
  //
  // Note: the bare auto-alias personal-brand-rust.vercel.app deliberately does NOT
  // match, and vercel.json now 308s that host to www rather than serving a copy of
  // the site with a form that 403s.
  return !!o && (ALLOWED_ORIGINS.includes(o) || PREVIEW_ORIGIN.test(o));
}

// Trustworthy client IP on Vercel: x-real-ip / x-vercel-forwarded-for are set by
// the edge and can't be spoofed by the caller, unlike the leftmost
// x-forwarded-for entry (which the client controls and could rotate to dodge the
// limiter).
function clientIp(req) {
  return (
    req.headers["x-real-ip"] ||
    String(req.headers["x-vercel-forwarded-for"] || "").split(",")[0].trim() ||
    "unknown"
  );
}

// Best-effort in-memory rate limit: 5 sends / 10 min / IP.
//
// KNOWN LIMITATION — this counter lives in the module scope of ONE warm Lambda.
// Vercel runs many concurrent instances and recycles cold ones, so the effective
// ceiling is 5 sends per 10 min per IP *per instance*, not per IP. A determined
// flooder who opens parallel connections (or simply waits out a cold start) gets
// a fresh budget each time. Treat this as friction against casual/naive abuse,
// NOT as a spend control on the Resend quota.
//
// Fixing it properly needs a request-shared store (Vercel KV / Upstash Redis /
// Supabase). This project has neither — its only env var is RESEND_API_KEY — so
// adding one is a new dependency + cost decision, deliberately not taken here.
// Residual risk is documented in SECURITY.md ("Known limitations").
const HITS = new Map();
function rateLimited(ip) {
  var now = Date.now(), win = 6e5, arr = (HITS.get(ip) || []).filter(function (t) { return now - t < win; });
  arr.push(now); HITS.set(ip, arr);
  if (HITS.size > 5000) HITS.clear();
  return arr.length > 5;
}

module.exports = async (req, res) => {
  res.setHeader("Allow", "POST");
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // CSRF/origin guard — reject genuine cross-site POSTs.
  if (!originAllowed(req.headers.origin)) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }
  var ip = clientIp(req);
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: "Too many requests — try again in a few minutes." });
  }

  // Vercel parses JSON bodies automatically, but guard for string/empty bodies.
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const message = String(body.message || "").trim();
  const company = String(body.company || "").trim(); // honeypot — humans leave blank

  // Bots fill hidden fields. Pretend success so they don't retry, but send nothing.
  if (company) {
    return res.status(200).json({ ok: true });
  }

  const errors = [];
  if (name.length < 1 || name.length > 100) errors.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) errors.push("email");
  if (message.length < 1 || message.length > 5000) errors.push("message");
  if (errors.length) {
    return res.status(400).json({ ok: false, error: "Invalid input", fields: errors });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set");
    return res.status(500).json({ ok: false, error: "Server not configured" });
  }

  const text =
    "New message from calebwieman.com\n\n" +
    "Name:  " + name + "\n" +
    "Email: " + email + "\n\n" +
    message + "\n";

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: "calebwieman.com — message from " + name,
        text: text
      })
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("Resend error", r.status, detail);
      return res.status(502).json({ ok: false, error: "Could not send message" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("contact handler error", e);
    return res.status(500).json({ ok: false, error: "Could not send message" });
  }
};
