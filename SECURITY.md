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
