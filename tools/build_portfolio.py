"""Build the static portfolio from its public, credential-free project catalog."""
from pathlib import Path
from html import escape as esc
import json

ROOT = Path(__file__).resolve().parents[1]
projects = json.loads((ROOT / 'assets/work/projects.json').read_text())
categories = {'spatial': 'Spatial computing', 'systems': 'Systems & AI', 'websites': 'Websites', 'experiments': 'Experiments'}

def image(p, extra=False):
    key = 'extraImage' if extra else 'image'
    cap = p.get('extraCaption' if extra else 'caption', '')
    return f'<figure class="case-figure"><img src="/assets/work/{esc(p[key])}" alt="{esc(cap)}" loading="lazy" width="1600" height="900"><figcaption>{esc(cap)}</figcaption></figure>'

def visual(p, idx):
    if p.get('image'):
        return f'<div class="project-visual project-visual--{p["id"]}"><img src="/assets/work/{esc(p["image"])}" alt="{esc(p["caption"])}" loading="lazy" width="1600" height="900"><span class="visual-label">{esc(p["status"])}</span></div>'
    steps = ''.join(f'<span><i>{i+1:02}</i>{esc(x)}</span>' for i,x in enumerate(p.get('diagram', [])))
    return f'<div class="project-visual project-visual--diagram" aria-label="Workflow illustration"><span class="diagram-index">{idx:02} / BUILD NOTES</span><div class="workflow">{steps}</div><span class="visual-label">Workflow illustration</span></div>'

cards=[]
for idx,p in enumerate(projects,1):
    tags=''.join(f'<span>{esc(x)}</span>' for x in p['stack'])
    links=''.join(f'<a class="case-link" href="{esc(url)}"'+(' target="_blank" rel="noopener noreferrer"' if url.startswith('https:') else '')+f'>{esc(label)} <span aria-hidden="true">↗</span></a>' for label,url in p['links'])
    body=f'''<div class="case-inner">
      <p class="case-kicker">{esc(p['type'])} <span>/ {p['year']}</span></p>
      <h2 class="case-title">{esc(p['name'])}</h2>
      <p class="case-intro">{esc(p['intro'])}</p>
      {image(p) if p.get('image') else ''}
      <div class="case-columns"><section><h3>What I built</h3><ul>{''.join('<li>'+esc(x)+'</li>' for x in p['built'])}</ul></section>
      <section><h3>The idea behind it</h3><p>{esc(p['why'])}</p><h3>My contribution</h3><p>{esc(p['role'])}</p></section></div>
      {image(p,True) if p.get('extraImage') else ''}
      <div class="case-note"><span class="small-label">PROJECT CONTEXT</span><p>{esc(p['note'])}</p></div>
      <div class="case-tags">{tags}</div><div class="case-links">{links}</div>
    </div>'''
    cards.append(f'''<details class="project" id="{p['id']}" data-category="{p['category']}" data-search="{esc((p['name']+' '+p['short']+' '+' '.join(p['stack'])).lower())}">
      <summary aria-label="Read about {esc(p['name'])}">
      {visual(p,idx)}
      <div class="project-copy"><p class="project-meta"><span>{categories[p['category']]}</span><span>{idx:02} / {p['year']}</span></p>
      <div class="project-heading"><h3>{esc(p['name'])}</h3><span class="project-arrow" aria-hidden="true">↗</span></div>
      <p class="project-short">{esc(p['short'])}</p><span class="project-type">{esc(p['type'])}</span></div>
      </summary><div class="project-detail">{body}</div>
    </details>''')

home=(ROOT/'index.html').read_text()
contact=home[home.index('  <dialog class="book"'):home.index('  <!-- mobile sticky')]
legacy=[('Stillwater Turf & Power','Local business website'),('Detailing / Clean Slate','Automotive-service website work'),('Asian Massage Spa','Local-service website concept'),('Outrun Games','Entertainment website'),('Yucca','Small-business website'),('Hillcrest Church','Community website'),('AIGENTIC Automations','The original agency website')]
legacy_html=''.join(f'<div class="legacy-row"><span class="legacy-index">{i+1:02}</span><h3>{esc(n)}</h3><p>{esc(d)}</p><span class="legacy-state">Archived</span></div>' for i,(n,d) in enumerate(legacy))
html=f'''<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0a0a0b"><title>Work — Caleb Wieman</title>
<meta name="description" content="Software, spatial experiences, websites, and experiments by Caleb Wieman. Explore GhostHands, Crank, Wieman OS, POLY, and the wider project archive.">
<link rel="canonical" href="https://www.calebwieman.com/work">
<meta property="og:type" content="website"><meta property="og:title" content="From workflows to worlds — Caleb Wieman">
<meta property="og:description" content="Explore the work: business software, Apple Vision Pro experiences, websites, and experiments.">
<meta property="og:url" content="https://www.calebwieman.com/work"><meta property="og:image" content="https://www.calebwieman.com/assets/work/og-work.jpg">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Work — Caleb Wieman"><meta name="twitter:image" content="https://www.calebwieman.com/assets/work/og-work.jpg">
<link rel="icon" href="/assets/img/favicon.ico?v=4" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/styles.css"><link rel="stylesheet" href="/css/work.css">
<script src="/js/main.js" defer></script><script src="/js/work.js" defer></script>
</head><body class="work-page">
<a class="skip-link" href="#main">Skip to content</a>
<div class="grain" aria-hidden="true"></div>
<header class="nav work-nav" id="nav"><div class="nav__inner shell">
<a class="brand" href="/" aria-label="Caleb Wieman — home"><img class="brand__mark" src="/assets/img/mark-white-sm.webp" alt="" width="28" height="28"><span class="brand__word">Wieman&nbsp;Systems</span></a>
<nav class="nav__links" aria-label="Primary"><a href="/work" aria-current="page">Work</a><a href="/#about">About</a><button class="btn btn--ghost nav__cta" type="button" data-book><span class="btn__label">Let's talk <span aria-hidden="true">↗</span></span></button></nav>
</div></header>
<main id="main">
<section class="work-hero shell" aria-labelledby="work-title">
<div class="hero-topline"><p class="small-label"><span class="live-dot" aria-hidden="true"></span> THE WORK OF CALEB WIEMAN</p><p class="small-label">INDEPENDENT BUILDER / 2026</p></div>
<div class="hero-layout"><div class="hero-statement"><h1 id="work-title">From workflows<br>to <span>worlds.</span></h1><p class="hero-description">I build software that moves work forward. <br>And experiences that take it somewhere new.</p><a class="browse-link" href="#collection">Explore the collection <span aria-hidden="true">↙</span></a></div>
<a class="hero-window" href="#ghosthands" data-project="ghosthands" aria-label="Explore GhostHands"><div class="window-bar"><span>01 / GHOSTHANDS</span><span>APPLE VISION PRO <span aria-hidden="true">↗</span></span></div><img src="/assets/work/ghosthands.jpg" alt="GhostHands spatial learning workspace with a paper lesson and translucent hands in the visionOS simulator" width="1800" height="1013" fetchpriority="high"><div class="window-caption"><span>Learn by doing.<br>In the space around you.</span><span class="window-caption-small">SASEHACKS 2026<br>SIMULATOR CAPTURE</span></div></a></div>
<div class="hero-foot"><p>Business software. Spatial computing. Websites. Experiments.</p><a href="#archive">Including the AIGENTIC archive <span aria-hidden="true">↘</span></a></div>
</section>
<section class="spotlight-strip" aria-label="Start exploring"><div class="shell spotlight-grid"><span class="small-label spotlight-label">THREE WAYS INTO<br>THE COLLECTION</span>
<a href="#ghosthands" data-project="ghosthands"><span class="spotlight-num">01</span><span><strong>Learn in space.</strong><small>GhostHands / spatial learning</small></span><span aria-hidden="true">↗</span></a>
<a href="#crank" data-project="crank"><span class="spotlight-num">02</span><span><strong>Step inside the game.</strong><small>Crank / native adaptation</small></span><span aria-hidden="true">↗</span></a>
<a href="#wieman-os" data-project="wieman-os"><span class="spotlight-num">03</span><span><strong>Run the business.</strong><small>Wieman OS / operations software</small></span><span aria-hidden="true">↗</span></a></div></section>
<section class="collection shell" id="collection" aria-labelledby="collection-title"><div class="collection-head"><div><p class="small-label">01 / THE COLLECTION</p><h2 id="collection-title">Curiosity, put to work.</h2></div><p>A closer look at what I've made,<br>how it works, and where it stands.</p></div>
<div class="collection-controls" hidden><div class="filter-list" role="group" aria-label="Filter projects"><button type="button" class="filter is-active" data-filter="all" aria-pressed="true">All work <span>{len(projects):02}</span></button>{''.join(f'<button type="button" class="filter" data-filter="{k}" aria-pressed="false">{v} <span>{sum(p["category"]==k for p in projects):02}</span></button>' for k,v in categories.items())}</div><label class="project-search"><span class="sr-only">Search projects</span><span aria-hidden="true">⌕</span><input type="search" id="project-search" placeholder="Find a project" autocomplete="off"></label></div>
<p class="filter-status small-label" id="filter-status" aria-live="polite">{len(projects):02} PROJECTS / SELECT A PROJECT TO EXPLORE</p>
<div class="project-grid">{''.join(cards)}</div><div class="no-results" hidden><h3>No matching projects.</h3><p>Try another name or category.</p><button type="button" id="reset-filters">Show all work <span aria-hidden="true">↗</span></button></div>
</section>
<section class="archive" id="archive" aria-labelledby="archive-title"><div class="shell"><div class="archive-head"><div><p class="small-label">02 / EARLIER CHAPTER</p><h2 id="archive-title">Before Wieman Systems.<br><span>AIGENTIC Automations.</span></h2></div><div class="archive-intro"><p>The first chapter: websites and automation work for small businesses, before the move to Wieman Systems.</p><p>These projects are part of the history. The old deployments were retired; this is an index of earlier work, rather than a gallery of currently available sites.</p></div></div><div class="legacy-list">{legacy_html}</div><p class="archive-footnote">Historical builds and concepts, not a list of current clients. Original screenshots and project files have not been recovered for these entries. Unfinished leads and empty stubs are not counted as completed builds.</p></div></section>
<section class="work-outro shell" aria-labelledby="outro-title"><p class="small-label">03 / WHAT COMES NEXT</p><div class="outro-layout"><h2 id="outro-title">Have something<br>worth building?</h2><div><p>A repetitive workflow. A product idea.<br>A different kind of experience.</p><button class="btn btn--solid btn--lg" type="button" data-book><span class="btn__label">Let's talk</span><span aria-hidden="true">↗</span></button></div></div></section>
</main>
<footer class="work-footer shell"><a class="brand" href="/"><img class="brand__mark" src="/assets/img/mark-white-sm.webp" alt="" width="28" height="28"><span>Caleb Wieman</span></a><nav aria-label="Footer"><a href="/">Home</a><a href="/work">Work</a><a href="mailto:caleb@wiemansystems.com">Email ↗</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav><p>© <span id="year">2026</span> Wieman Systems LLC</p></footer>
<dialog class="case-dialog" id="case-dialog" aria-labelledby="case-dialog-title"><div class="case-toolbar"><span class="small-label">PROJECT EXPLORER</span><div><button type="button" id="copy-project">Copy project link <span aria-hidden="true">↗</span></button><button type="button" id="close-project" aria-label="Close project">Close <span aria-hidden="true">×</span></button></div></div><div id="case-content"></div><div class="case-navigation"><button type="button" id="previous-project">← Previous project</button><span id="case-position" class="small-label"></span><button type="button" id="next-project">Next project →</button></div><p id="copy-status" role="status" class="copy-status"></p></dialog>
{contact}
</body></html>'''
(ROOT/'work.html').write_text(html)
print(f'Built work.html with {len(projects)} projects and {len(legacy)} historical entries.')
