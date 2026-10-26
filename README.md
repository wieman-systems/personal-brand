# personal-brand

Personal brand landing page for **Caleb Wieman** — Founder & CEO of Wieman Systems.
Built to build trust and showcase modern AI systems work.

> Strict-monochrome, architectural, blueprint aesthetic. Premium, interactive, fast.
> Single static page — no framework, no build step.

## Stack

- **Plain HTML / CSS / vanilla JS** — deploys anywhere (Vercel, GitHub Pages, Netlify, any static host)
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

Any static server works:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

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
- [ ] Point a domain at it and deploy.

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
- Images are actual product/development captures, with simulator and sample-data
  captions. Private systems use explicitly labeled workflow illustrations.
- No client records, credentials, private source, or downloadable game ports
  are included. Historical AIGENTIC entries have no recovered screenshots.

The existing Vercel project has clean URLs enabled, so `work.html` serves at
`https://www.calebwieman.com/work`. This change does not require new provider
accounts, dependencies, environment variables, or a build step. Production is
the `main` branch; the review work is on `feat/portfolio` until approved.
