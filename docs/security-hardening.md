# Security hardening checklist

Tracks the fixes from the June 2026 public-facing security pass on
`calebwieman.com` and `wiemansystems.com`.

The site is a static page on Vercel with no backend, so the findings split into
two buckets:

- **In this repo** (done) — HTTP security headers, `security.txt`, `robots.txt`,
  `sitemap.xml`.
- **DNS / external config** (manual) — SPF, DKIM, DMARC, CAA records, and the
  wildcard-CORS check. These live in Cloudflare DNS and the Vercel dashboard,
  not in code. Exact records are below; apply them by hand.

---

## ✅ Done in this repo

| Fix | Where |
| --- | --- |
| Security headers (CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) | [`vercel.json`](../vercel.json) |
| Security contact (RFC 9116) | [`.well-known/security.txt`](../.well-known/security.txt) |
| Disclosure policy | [`SECURITY.md`](../SECURITY.md) |
| Crawl directives | [`robots.txt`](../robots.txt), [`sitemap.xml`](../sitemap.xml) |

### Notes on the CSP

The Content-Security-Policy is deliberately strict because the page has no
inline scripts, no `eval`, and no inline styles — `js/main.js` animates through
the CSSOM (`element.style.…`), which CSP does **not** restrict. The only
external origins are Google Fonts:

```
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none';
form-action 'self'; img-src 'self' data:; script-src 'self';
style-src 'self' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com; connect-src 'self';
upgrade-insecure-requests
```

If you ever add analytics, embeds, a form provider, or another script/CDN, add
its origin to the matching directive or the browser will block it. After
deploying, verify with <https://securityheaders.com> and the browser console
(look for `Content-Security-Policy` violation messages).

> **Self-hosting the fonts** would let you drop the two `fonts.g*` origins and
> tighten the CSP to `'self'` only — optional, not required.

---

## ☐ DNS — apply in Cloudflare

> [!IMPORTANT]
> Add these as DNS records in the Cloudflare dashboard for each zone. TXT
> values go in one record; don't include the surrounding quotes shown by some
> UIs. After SPF/DMARC, allow a week of DMARC aggregate reports before
> tightening the policy.

### `wiemansystems.com` — sends email via Google Workspace (MX = smtp.google.com)

**1. SPF** — start with soft-fail so no legitimate mail is rejected during rollout:

```
Type: TXT   Name: @   Value: v=spf1 include:_spf.google.com ~all
```

After confirming (via DMARC reports) that all your real senders pass, tighten to
hard-fail:

```
Type: TXT   Name: @   Value: v=spf1 include:_spf.google.com -all
```

> Only `~all` → `-all` once you're sure nothing else sends as
> `@wiemansystems.com` (CRMs, newsletter tools, "send mail as" aliases, etc.).

**2. DKIM** — generate and publish from Google, not here:
Google Admin console → **Apps → Google Workspace → Gmail → Authenticate email**
→ generate a 2048-bit key for `wiemansystems.com` → it gives you a
`google._domainkey` TXT record → add it in Cloudflare → click **Start
authentication**.

**3. DMARC** — start in monitor-only mode:

```
Type: TXT   Name: _dmarc   Value: v=DMARC1; p=none; rua=mailto:caleb@wiemansystems.com; fo=1
```

After ~1–2 weeks of clean reports, step up the policy (change only `p=`):

```
v=DMARC1; p=quarantine; rua=mailto:caleb@wiemansystems.com; fo=1
```

then finally:

```
v=DMARC1; p=reject; rua=mailto:caleb@wiemansystems.com; fo=1; adkim=s; aspf=s
```

(`adkim=s; aspf=s` = strict alignment — only add it at the `reject` stage once
SPF + DKIM are both verified passing.)

### `calebwieman.com` — website only, sends no email

Lock the domain so nobody can spoof mail "from" it. **Only apply this if you are
certain no mail is ever sent as `@calebwieman.com`** (no Workspace, no alias, no
"send as").

```
Type: TXT   Name: @        Value: v=spf1 -all
Type: TXT   Name: _dmarc   Value: v=DMARC1; p=reject; rua=mailto:caleb@wiemansystems.com; adkim=s; aspf=s
```

Optional belt-and-suspenders — a null MX declaring the domain accepts no mail
(RFC 7505):

```
Type: MX   Name: @   Priority: 0   Value: .
```

### CAA — both domains (apply with care)

CAA limits which certificate authorities may issue certs for the domain. Vercel
issues via **Let's Encrypt**. Getting this wrong can break automatic cert
renewal, so confirm Vercel's current CA before adding it.

```
Type: CAA   Name: @   Flags: 0   Tag: issue     Value: letsencrypt.org
Type: CAA   Name: @   Flags: 0   Tag: iodef     Value: mailto:caleb@wiemansystems.com
```

> If Vercel ever reports a failed renewal after adding CAA, the most likely
> cause is a CA not listed here — add that CA's `issue` record. This is the one
> change on this page that can cause an outage, so treat it as low priority.

---

## Wildcard CORS — overridden in `vercel.json`

`curl -sSI https://www.calebwieman.com/` showed `Access-Control-Allow-Origin: *`
returned **unconditionally**, even though the repo had no `vercel.json`. That
header is added by **Vercel's default static-file serving** — it is not in your
code and there is **no dashboard setting** for it (Vercel configures response
headers only through `vercel.json`).

For a public static site with no API, cookies, or auth this is low risk (any
site could read HTML that is already public). It is scoped down anyway by
setting an explicit origin in [`vercel.json`](../vercel.json):

```
Access-Control-Allow-Origin: https://www.calebwieman.com
```

After deploying, re-check and confirm the `*` is gone:

```
curl -sSI https://www.calebwieman.com/ | grep -i access-control
```

You should see the single scoped origin above. If you instead see two
`Access-Control-Allow-Origin` lines (the override didn't replace the default),
the duplicate still blocks third-party reads, but remove the line from
`vercel.json` to keep the scan clean, since the item is low risk either way.

---

## Other sites

`wiemansystems.com` is a **separate** codebase from this repo. The same
[`vercel.json`](../vercel.json) header block should be copied into that
project to give it the same header hardening.
