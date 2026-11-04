# Security Policy

## Reporting a vulnerability

If you believe you've found a security issue with **calebwieman.com** or
Wieman Systems, please report it privately:

- **Email:** caleb@wiemansystems.com

Please include enough detail to reproduce the issue. We aim to acknowledge
reports within a few business days. Please do not run destructive tests,
denial-of-service attacks, or automated scans that degrade the service.

A machine-readable contact is published at
[`/.well-known/security.txt`](.well-known/security.txt) per
[RFC 9116](https://www.rfc-editor.org/rfc/rfc9116).

## Scope

This repository serves the public portfolio and a contact-form endpoint on
Vercel. The endpoint sends plain-text mail only to `caleb@wiemansystems.com`;
it does not expose a database, mailbox, or customer accounts.

## Hardening

HTTP response headers (CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy`) are configured in
[`vercel.json`](vercel.json). DNS-level hardening (SPF, DKIM, DMARC, CAA) is
tracked in [`docs/security-hardening.md`](docs/security-hardening.md).

## Canonical host

`www.calebwieman.com` is the canonical origin. The apex (`calebwieman.com`)
redirects to it at the Vercel domain level, and the bare auto-generated alias
`personal-brand-rust.vercel.app` is 308'd to it by a host-scoped rule in
[`vercel.json`](vercel.json) — it previously served a full duplicate of the site
whose contact form 403'd, since `api/contact.js` does not accept that Origin.
Every absolute URL the site publishes (canonical, `og:url`, `og:image`,
`twitter:image`, JSON-LD `url`, `sitemap.xml`, `robots.txt`, `security.txt`)
uses the `www` host. Keep it that way — a split between apex and `www` is what
produced the stale `twitter:image` this repo carried for two weeks.

Preview/branch deploys (`personal-brand-*-wieman-systems.vercel.app`) are
intentionally NOT redirected, so they remain testable, and `api/contact.js`
accepts their Origin.

## Contact-form protection

- BotID Basic protects `POST /api/contact` in the browser on both `/` and `/work`.
  The server independently validates the challenge response, rejects bots,
  verified crawlers, and bypass results, and fails closed on verification errors.
  The SDK's development bypass is explicitly disabled. Paid Deep Analysis is not enabled.
- A Vercel WAF rule limits contact POSTs to **5 attempts per IP per 600-second
  fixed window**. The canonical rule is `config/contact-firewall.json`; deploy it
  through the Vercel Firewall API for this project, separately from the code.
  It covers the normal path, trailing slash, and `.js` alias. The WAF counter is
  shared across function instances and survives deployments/cold starts.
- Origin allowlisting remains a browser CSRF guard, not authentication. JSON
  content type, input/body limits, and the honeypot remain additional filters.
- Server errors do not log message contents, challenge proofs, API keys, or raw
  provider responses. The email recipient and sender are fixed server-side.
- The static build publishes only the public pages/assets into `dist`, excluding
  server code, dependency files, operational configuration, and tests.

## Operational verification

Run `npm ci --ignore-scripts`, `npm test`, and `npm run build`. Confirm both pages
load `/js/bot-protection.js` before `main.js`. On a deployed build, a valid-looking
JSON submission with a spoofed allowed Origin but no browser proof must return
403; repeated empty JSON requests must hit the WAF limit without sending mail.
Verify a normal browser request passes BotID before asserting the form works.

Vercel OIDC is required by the SDK and is enabled for this project. Keep the
firewall rule active and verify it after any hosting migration. Git rollback
alone does not change the separately deployed firewall configuration.

## Known limitations

Vercel WAF counters are **per region**, not a hard worldwide sending quota. A
fixed window also permits a burst across a window boundary. Rotating IPs or
regions can increase aggregate volume; sophisticated browser automation may
pass BotID Basic. These protections substantially reduce casual automated abuse
but do not establish a guaranteed Resend spending cap. Monitor provider usage;
add a global quota if needed. Visitors behind the same public IP share a limit.

If browser verification is blocked or unavailable, the form fails closed and
shows a direct email fallback. It never silently sends without verification.

References: [BotID](https://vercel.com/docs/botid),
[WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).
