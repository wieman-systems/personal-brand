# personal-brand

Personal brand landing page for **Caleb Wieman** — Founder & CEO of Wieman Systems.
Built to build trust and showcase modern AI systems work.

> Strict-monochrome, architectural, blueprint aesthetic. Premium, interactive, fast.
> Static pages with a small build step for contact-form bot protection.

## Stack

- **Plain HTML / CSS / vanilla JS** — hosted on Vercel; the protected contact API uses Vercel BotID and WAF
- Generative `<canvas>` blueprint + data-city skyline hero
- Text-scramble headline, scroll-reveal choreography, pinned Map→Build→Run scene,
  count-up metrics, magnetic CTA, custom registration-mark cursor — all hand-rolled
- Fully `prefers-reduced-motion` aware, keyboard accessible, and pointer/viewport gated

## Structure

```
index.html            # the page (all sections)
css/styles.css        # design tokens + all styling
js/main.js            # interaction layer (canvas, scramble, reveals, etc.)
assets/img/           # brand assets (logos, headshots, skyline, favicons, og image)
tools/                # one-off asset-pipeline scripts (Python / Pillow)
```

## Run locally

Build the public assets, then preview them with a static server:

```bash
npm ci --ignore-scripts
npm run build
python -m http.server 8000 --directory dist
# then open http://localhost:8000
```

The contact API requires Vercel and does not send from this static preview.
Run `npm test` for the isolated server and form tests.

Append `?still` to the URL to render a static, motion-free frame (handy for screenshots
and identical to the reduced-motion experience).

## Asset pipeline

Brand assets were processed with [Pillow](https://python-pillow.org/) via the scripts in `tools/`:

- `tools/process_assets.py` — generates white-on-transparent logo/mark/grid variants for the
  dark theme, optimizes headshots to WebP, and builds the favicon set.
- `tools/make_og.py` — generates the 1200×630 Open Graph / social share image.

Re-run from the repo root, e.g. `python tools/process_assets.py`.

## TODO

- [x] Wire up the **Book a call** CTA — shipped as an in-page contact modal
      (`#bookModal`) that posts to the `api/contact.js` serverless function and
      relays the message to Caleb via Resend. (Superseded the old `mailto:` fallback.)
- [ ] Swap the proof-strip numbers for real client metrics once available
      (currently honest, structural facts — see the note in `index.html`).
- [x] Deploy at https://www.calebwieman.com.

## Brand

Caleb Wieman · Founder & CEO · Stillwater, OK
caleb@wiemansystems.com · 405-780-5207 · [wiemansystems.com](https://wiemansystems.com)

## Portfolio

`/work` is a static portfolio with 24 project explainers and seven historical
AIGENTIC entries. It shares the homepage's branding and existing contact form.
The homepage links into it through the primary/footer navigation, hero, and a
three-project selected-work section.

- Edit public project copy in `assets/work/projects.json`.
- Run `python3 tools/build_portfolio.py` to regenerate `work.html`.
- Styles: `css/work.css`; progressive enhancement: `js/work.js`.
- Category filters and search narrow the collection. Project dialogs have
  direct hash links, link copying, previous/next controls, Escape dismissal,
  native focus containment, and focus restoration.
- With JavaScript disabled, native `<details>` keep every explainer readable.
- All 24 project entries have authentic interface captures, development images,
  or original asset-pipeline proofs. Private dashboards are rendered from the
  original frontend with synthetic records. Captions identify the capture type.
- Case-study images open at full resolution. Some projects include a second view.
- The shipping entry shows the related V20 order console, explicitly separated
  from the older backend-only shipping automation. The email tooling entry shows
  the related Wieman OS action list using its existing synthetic demo.
- No client records, credentials, private source, or downloadable game ports
  are included. Historical AIGENTIC entries have no recovered screenshots.

The existing Vercel project has clean URLs enabled, so `work.html` serves at
`https://www.calebwieman.com/work`. Production follows the `main` branch.
The site build bundles BotID and copies public assets to `dist`. Isolated capture fixtures and source copies live outside this
site repository and are never deployed with it.

## Contact form protection

The contact form uses Vercel BotID Basic and a shared Vercel WAF rate limit.
See `SECURITY.md` for deployment requirements, verification, and limitations.
Install with `npm ci --ignore-scripts`, test with `npm test`, and build with
`npm run build`. Vercel serves the generated `dist` folder alongside `api/contact.js`.
The server-only `RESEND_API_KEY` stays in Vercel environment settings.
