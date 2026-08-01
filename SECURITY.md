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

This repository serves a single static marketing page (HTML/CSS/vanilla JS)
hosted on Vercel. There is no backend, database, user accounts, or API.

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

## Known limitations

**The contact-form rate limiter is not a real spend control.**
`api/contact.js` throttles 5 sends / 10 min / IP using an in-memory `Map`. That
map lives in a single warm Lambda instance; Vercel runs many instances
concurrently and recycles cold ones, so the limit is effectively *per instance*,
not per IP. Parallel requests or a cold start each get a fresh budget.

Enforcing this properly requires a store shared across invocations (Vercel KV,
Upstash Redis, or Supabase). This project has no such store — its only
environment variable is `RESEND_API_KEY` — so the fix is a new dependency and a
new recurring cost, not a code change, and has deliberately not been taken.

Accepted residual risk: an attacker who spoofs an allowed `Origin` header from a
non-browser client can burn Resend send quota and flood
`caleb@wiemansystems.com`. Impact is bounded — the endpoint reads no data and
exposes nothing; the worst case is inbox noise and a consumed sending quota. If
quota burn is ever observed, add the shared store rather than tightening the
in-memory counter, which cannot be made correct.
