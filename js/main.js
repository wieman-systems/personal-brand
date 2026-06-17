/* =========================================================================
   WIEMAN SYSTEMS — interaction layer
   Vanilla JS. No framework. Progressive enhancement: content is visible by
   default; JS adds motion. Everything motion-related respects reduced-motion,
   pointer type, and viewport size.
   ========================================================================= */
(function () {
  "use strict";

  var doc = document;
  var body = doc.body;

  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mqFine = window.matchMedia("(pointer: fine)");
  var mqDesk = window.matchMedia("(min-width: 861px)");

  var reduce = mqReduce.matches;
  /* QA / fallback: ?still renders a single static frame (no rAF) so the page
     can be captured and is friendly to constrained renderers. */
  var forceStill = /[?&](still|nomotion)\b/.test(location.search);
  if (forceStill) reduce = true;
  var lerp = function (a, b, n) { return (1 - n) * a + n * b; };
  var clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };

  /* Arm reveal system only when JS is running (so a JS failure never hides copy). */
  if (!reduce) body.classList.add("reveal-armed");

  var yearEl = doc.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ====================================================================
     SHARED rAF TICKER (one loop drives scroll-rail, nav, parallax, canvas)
     ==================================================================== */
  var tickCallbacks = [];
  var ticking = false;
  var activeCanvases = 0;   // >0 means a canvas wants continuous frames
  var lastInteract = 0;     // ms timestamp of the last scroll/pointer activity
  function now() { return performance.now ? performance.now() : Date.now(); }
  function touch() { lastInteract = now(); ensureTicking(); }
  function addTick(fn) { tickCallbacks.push(fn); ensureTicking(); }
  function ensureTicking() {
    if (ticking || doc.hidden) return;
    ticking = true;
    requestAnimationFrame(loop);
  }
  function loop(t) {
    for (var i = 0; i < tickCallbacks.length; i++) {
      try { tickCallbacks[i](t); } catch (e) { /* keep the loop alive */ }
    }
    /* Stop spinning when there's nothing to animate (saves battery + lets the
       renderer idle). Restarts on scroll, pointer move, or canvas activation. */
    if (doc.hidden || (activeCanvases <= 0 && (t - lastInteract) > 700)) { ticking = false; return; }
    requestAnimationFrame(loop);
  }
  doc.addEventListener("visibilitychange", function () {
    if (!doc.hidden) ensureTicking();
  });

  /* Cached scroll position, updated passively. */
  var scrollY = window.pageYOffset || 0;
  window.addEventListener("scroll", function () {
    scrollY = window.pageYOffset || 0;
    touch();
  }, { passive: true });

  /* ====================================================================
     NAV state + scroll progress rail
     ==================================================================== */
  var nav = doc.getElementById("nav");
  var fill = doc.getElementById("scrollFill");
  var mcta = doc.getElementById("mobileCta");
  var navScrolled = false, mctaShown = false;
  addTick(function () {
    var doch = doc.documentElement;
    var max = (doch.scrollHeight - window.innerHeight) || 1;
    var p = clamp(scrollY / max, 0, 1);
    if (fill) fill.style.transform = "scaleX(" + p.toFixed(4) + ")";
    var s = scrollY > 8;
    if (s !== navScrolled) {
      navScrolled = s;
      if (nav) nav.classList.toggle("is-scrolled", s);
    }
    // mobile sticky CTA: show past the hero, hide near the footer's own CTA
    if (mcta) {
      var show = scrollY > window.innerHeight * 0.85 &&
                 (scrollY + window.innerHeight) < doch.scrollHeight - 560;
      if (show !== mctaShown) { mctaShown = show; mcta.classList.toggle("is-visible", show); }
    }
  });

  /* ====================================================================
     REVEAL on scroll (IntersectionObserver)
     ==================================================================== */
  var reveals = Array.prototype.slice.call(doc.querySelectorAll(".reveal"));
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    reveals.forEach(function (el) {
      var d = el.getAttribute("data-reveal-delay");
      if (d) el.style.setProperty("--reveal-delay", d + "ms");
    });
    var revObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { revObs.observe(el); });
  }

  /* ====================================================================
     HERO TITLE — line rise + text scramble (the signature decode)
     ==================================================================== */
  // Glyph set kept to roughly letter-width characters (no full-width blocks) so
  // scrambling never changes line wrapping — only the characters flip.
  var GLYPHS = "!<>-_\\/[]{}=+*#%·:;".split("");
  function scramble(el, finalText, startDelay, onDone) {
    // Every slot is filled from the first frame (spaces preserved), so the text
    // box is full-size immediately and only the glyphs change — no reflow.
    var queue = [];
    for (var i = 0; i < finalText.length; i++) {
      queue.push({ to: finalText[i], end: 8 + Math.floor(Math.random() * 18),
                   ch: GLYPHS[Math.floor(Math.random() * GLYPHS.length)] });
    }
    var frame = 0;
    function update() {
      var out = "", done = 0;
      for (var i = 0; i < queue.length; i++) {
        var q = queue[i];
        if (q.to === " ") { out += " "; done++; continue; }
        if (frame >= q.end) { out += q.to; done++; }
        else { if (Math.random() < 0.35) q.ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; out += q.ch; }
      }
      el.textContent = out;
      if (done === queue.length) { el.textContent = finalText; if (onDone) onDone(); return; }
      frame++;
      requestAnimationFrame(update);
    }
    if (startDelay) setTimeout(update, startDelay); else update();
  }

  var heroTitle = doc.querySelector(".hero__title");
  if (heroTitle) {
    var scram = Array.prototype.slice.call(heroTitle.querySelectorAll("[data-scramble]"));
    if (reduce) {
      heroTitle.classList.add("is-in");
    } else {
      var startScramble = function () {
        // Reserve the headline's exact rendered box so scrambling can never reflow
        // the layout — keeps the portrait, canvas and everything else perfectly still.
        heroTitle.style.height = heroTitle.offsetHeight + "px";
        heroTitle.style.overflow = "hidden";
        heroTitle.classList.add("is-in");
        var remaining = scram.length;
        scram.forEach(function (el) {
          var delay = parseInt(el.getAttribute("data-scramble-delay") || "0", 10);
          scramble(el, el.textContent, 200 + delay, function () {
            if (--remaining <= 0) { heroTitle.style.height = ""; heroTitle.style.overflow = ""; }
          });
        });
      };
      // Wait for fonts so the reserved height matches the final render (with a
      // timeout fallback so the headline always appears even if fonts hang).
      var started = false;
      var go = function () { if (started) return; started = true; requestAnimationFrame(startScramble); };
      if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(go);
      setTimeout(go, 1200);
    }
  }

  /* ====================================================================
     COUNT-UP metrics
     ==================================================================== */
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
  var counters = Array.prototype.slice.call(doc.querySelectorAll("[data-count]"));
  function runCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (reduce) { el.textContent = target; return; }
    // scale duration to magnitude + easeOutCubic so small counts still travel (one cadence)
    var dur = clamp(500 + target * 9, 600, 1400), t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = clamp((ts - t0) / dur, 0, 1);
      el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * target);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (!("IntersectionObserver" in window) || reduce) {
    counters.forEach(function (el) { el.textContent = el.getAttribute("data-count"); });
  } else {
    var cObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCount(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cObs.observe(el); });
  }

  /* ====================================================================
     MAGNETIC buttons
     ==================================================================== */
  if (mqFine.matches && mqDesk.matches && !reduce) {
    var magnets = Array.prototype.slice.call(doc.querySelectorAll("[data-magnetic]"));
    magnets.forEach(function (el) {
      var label = el.querySelector(".btn__label") || el;
      var raf = null, tx = 0, ty = 0, cx = 0, cy = 0;
      function render() {
        tx = lerp(tx, cx, 0.2); ty = lerp(ty, cy, 0.2);
        el.style.transform = "translate(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px)";
        if (label !== el) label.style.transform = "translate(" + (tx * 0.4).toFixed(2) + "px," + (ty * 0.4).toFixed(2) + "px)";
        if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) raf = requestAnimationFrame(render);
        else raf = null;
      }
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        cx = (e.clientX - (r.left + r.width / 2)) * 0.28;
        cy = (e.clientY - (r.top + r.height / 2)) * 0.4;
        if (!raf) raf = requestAnimationFrame(render);
      });
      el.addEventListener("mouseleave", function () {
        cx = 0; cy = 0;
        if (!raf) raf = requestAnimationFrame(render);
      });
    });
  }

  /* ====================================================================
     CUSTOM CURSOR (registration-mark) — fine pointer + desktop only
     ==================================================================== */
  if (mqFine.matches && mqDesk.matches && !reduce) {
    var cursor = doc.getElementById("cursor");
    if (cursor) {
      var label = cursor.querySelector(".cursor__label");
      body.classList.add("has-cursor");
      var mx = window.innerWidth / 2, my = window.innerHeight / 2, px = mx, py = my;
      var cursorShown = false;
      window.addEventListener("mousemove", function (e) {
        mx = e.clientX; my = e.clientY;
        if (!cursorShown) { cursorShown = true; cursor.style.opacity = "1"; } // fade in on first move
        touch();
      }, { passive: true });
      doc.addEventListener("mousedown", function () { cursor.classList.add("is-down"); });
      doc.addEventListener("mouseup", function () { cursor.classList.remove("is-down"); });
      addTick(function () {
        px = lerp(px, mx, 0.2); py = lerp(py, my, 0.2);
        cursor.style.transform = "translate3d(" + px.toFixed(2) + "px," + py.toFixed(2) + "px,0)";
      });
      // hover / cta states via delegation
      doc.addEventListener("mouseover", function (e) {
        var cta = e.target.closest("[data-cursor='cta']");
        var link = e.target.closest("a,button");
        if (cta) {
          cursor.classList.add("is-cta");
          if (label) label.textContent = "Book a call";
        } else if (link) {
          cursor.classList.add("is-hover");
        }
      });
      doc.addEventListener("mouseout", function (e) {
        if (e.target.closest("[data-cursor='cta']")) cursor.classList.remove("is-cta");
        if (e.target.closest("a,button")) cursor.classList.remove("is-hover");
      });
    }
  }

  /* ====================================================================
     PROCESS — pinned scene, active-step driven by scroll center
     ==================================================================== */
  (function () {
    var stage = doc.querySelector(".process__stage");
    var steps = Array.prototype.slice.call(doc.querySelectorAll(".step[data-step]"));
    var ticks = Array.prototype.slice.call(doc.querySelectorAll(".process__tick"));
    var diagram = stage ? stage.querySelector(".diagram") : null;
    if (!steps.length) return;

    var NODES = [
      ["audit", "data", "leverage"],
      ["pipeline", "dashboard", "integrate"],
      ["host", "monitor", "optimize"]
    ];
    var current = -1;
    function setActive(idx) {
      if (idx === current) return;
      current = idx;
      ticks.forEach(function (t, i) { t.classList.toggle("is-active", i === idx); });
      steps.forEach(function (s, i) { s.classList.toggle("is-dim", mqDesk.matches && i !== idx); });
      if (diagram) {
        diagram.innerHTML = "";
        NODES[idx].forEach(function (n) {
          var span = doc.createElement("span");
          span.className = "diagram__node";
          span.textContent = n;
          diagram.appendChild(span);
        });
        if (stage) {
          stage.classList.remove("is-live");
          // force reflow so the transition replays
          void stage.offsetWidth;
          stage.classList.add("is-live");
        }
      }
    }

    if (!("IntersectionObserver" in window) || reduce) {
      setActive(0);
      steps.forEach(function (s) { s.classList.remove("is-dim"); });
      return;
    }
    var sObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setActive(parseInt(e.target.getAttribute("data-step"), 10));
      });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    steps.forEach(function (s) { sObs.observe(s); });
    setActive(0);
  })();

  /* ====================================================================
     CANVAS — blueprint grid + breathing data-city skyline
     ==================================================================== */
  var pointer = { x: 0.5, y: 0.5 };
  if (!reduce && mqFine.matches) {
    window.addEventListener("mousemove", function (e) {
      pointer.x = e.clientX / window.innerWidth;
      pointer.y = e.clientY / window.innerHeight;
      touch();
    }, { passive: true });
  }

  function Skyline(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d");
    var dpr = 1, W = 0, H = 0;
    var bars = [], glyphs = [], vp = 0.5, vpTarget = 0.5;
    var perspective = !!opts.perspective;
    var glyphChars = "+-/[]{}<>=·".split("");
    var bornAt = null;

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      W = Math.max(1, rect.width); H = Math.max(1, rect.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }
    function build() {
      bars = [];
      var unit = clamp(Math.round(W / 90), 9, 18); // bar+gap width
      var count = Math.ceil(W / unit) + 2;
      for (var i = 0; i < count; i++) {
        var r = Math.abs(Math.sin(i * 12.9898) * 43758.5453);
        r = r - Math.floor(r);
        var monolith = (i % 17 === 5);
        var base = monolith ? (0.55 + r * 0.4) : (0.12 + r * 0.5);
        bars.push({ x: i * unit, w: unit - Math.max(2, unit * 0.22), h: base, phase: i * 0.7, spd: 0.4 + r * 0.5, mono: monolith });
      }
      glyphs = [];
      var gcount = opts.glyphs ? Math.round(W / 150) : 0;
      for (var j = 0; j < gcount; j++) {
        var r2 = Math.abs(Math.sin((j + 3) * 78.233) * 12543.91); r2 = r2 - Math.floor(r2);
        glyphs.push({
          x: r2 * W,
          y: (0.12 + (r2 * 7 % 1) * 0.42) * H,
          ch: glyphChars[Math.floor(r2 * glyphChars.length)],
          phase: r2 * 6.28, amp: 6 + r2 * 10
        });
      }
    }

    function draw(now) {
      if (bornAt === null) bornAt = now || 0;
      var t = ((now || 0) - bornAt) / 1000;
      var birth = reduce ? 1 : clamp(t / 1.0, 0, 1);
      var ease = 1 - Math.pow(1 - birth, 3);
      ctx.clearRect(0, 0, W, H);

      var baseY = H; // skyline sits on the bottom
      var cellH = clamp(Math.round(W / 90), 9, 18);

      // ---- perspective floor grid (hero only) ----
      if (perspective) {
        vpTarget = 0.5 + (pointer.x - 0.5) * 0.12;
        vp = lerp(vp, vpTarget, 0.05);
        var horizon = H * 0.5;
        var vpx = W * vp;
        ctx.lineWidth = 1;
        // receding horizontals
        var lines = 16;
        for (var k = 1; k <= lines; k++) {
          var f = k / lines;
          var yy = horizon + (H - horizon) * (f * f);
          ctx.strokeStyle = "rgba(255,255,255," + (0.05 * (1 - f) + 0.015).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke();
        }
        // converging verticals
        var vcount = 18;
        for (var v = 0; v <= vcount; v++) {
          var xb = (v / vcount) * W * 1.6 - W * 0.3;
          ctx.strokeStyle = "rgba(255,255,255,0.035)";
          ctx.beginPath(); ctx.moveTo(vpx, horizon); ctx.lineTo(xb, H); ctx.stroke();
        }
      }

      // ---- baseline grid mesh under the city ----
      var meshTop = baseY - cellH * 5;
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (var gy = baseY; gy >= meshTop; gy -= cellH) {
        ctx.globalAlpha = ease;
        ctx.beginPath(); ctx.moveTo(0, gy + 0.5); ctx.lineTo(W, gy + 0.5); ctx.stroke();
      }
      for (var gx = 0; gx <= W; gx += cellH) {
        ctx.beginPath(); ctx.moveTo(gx + 0.5, meshTop); ctx.lineTo(gx + 0.5, baseY); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // ---- breathing skyline bars ----
      var maxH = H * (opts.maxBarH || 0.34);
      for (var b = 0; b < bars.length; b++) {
        var bar = bars[b];
        var breathe = reduce ? 0 : Math.sin(t * bar.spd + bar.phase) * 0.06 + Math.sin(t * bar.spd * 0.5 + bar.phase) * 0.04;
        var hh = clamp(bar.h + breathe, 0.05, 1) * maxH * ease;
        var alpha = 0.12 + (hh / maxH) * 0.34;
        ctx.fillStyle = "rgba(255,255,255," + alpha.toFixed(3) + ")";
        ctx.fillRect(bar.x, baseY - hh, bar.w, hh);
      }

      // ---- floating technical glyphs ----
      if (glyphs.length) {
        ctx.font = "12px 'JetBrains Mono', monospace";
        ctx.textBaseline = "middle";
        for (var g = 0; g < glyphs.length; g++) {
          var gl = glyphs[g];
          var oy = reduce ? 0 : Math.sin(t * 0.5 + gl.phase) * gl.amp;
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fillText(gl.ch, gl.x, gl.y + oy);
        }
      }
    }

    var active = false;
    function setActive(a) {
      if (a === active) return;
      active = a;
      if (active) {
        activeCanvases++;
        if (tickCallbacks.indexOf(tick) === -1) addTick(tick);
        ensureTicking();
      } else {
        activeCanvases = Math.max(0, activeCanvases - 1);
      }
    }
    function tick(ts) { if (active && !reduce) draw(ts); }

    size();
    draw(0); // static first frame (also the reduced-motion frame)

    window.addEventListener("resize", debounce(function () { size(); draw(performance.now()); }, 180));

    return { setActive: setActive, draw: draw, el: canvas };
  }

  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); var a = arguments, c = this; t = setTimeout(function () { fn.apply(c, a); }, ms); };
  }

  function mountCanvas(id, opts) {
    var c = doc.getElementById(id);
    if (!c) return;
    var inst = Skyline(c, opts);
    if (reduce) return; // single static frame already drawn
    if (!("IntersectionObserver" in window)) { inst.setActive(true); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { inst.setActive(e.isIntersecting); });
    }, { threshold: 0 });
    io.observe(c);
  }

  mountCanvas("heroCanvas", { perspective: true, glyphs: true, maxBarH: 0.32 });
  mountCanvas("ctaCanvas", { perspective: false, glyphs: false, maxBarH: 0.5 });

  /* ====================================================================
     CONTACT FORM — posts JSON to same-origin /api/contact (Resend relay).
     Same-origin, so the strict CSP (connect-src 'self') allows the fetch.
     Native validation + honeypot; graceful success/error states.
     ==================================================================== */
  (function () {
    var form = doc.getElementById("contactForm");
    if (!form) return;
    var statusEl = doc.getElementById("cformStatus");
    var btn = form.querySelector("button[type=submit]");
    var btnLabel = btn ? btn.querySelector(".btn__label") : null;
    var sending = false;

    function val(n) { var el = form.elements[n]; return el ? el.value : ""; }
    function setStatus(msg, kind) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.classList.remove("is-ok", "is-error");
      if (kind) statusEl.classList.add(kind);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var payload = {
        name: val("name"),
        email: val("email"),
        message: val("message"),
        company: val("company")   // honeypot
      };

      sending = true;
      form.classList.add("is-sending");
      var prevLabel = btnLabel ? btnLabel.textContent : "";
      if (btnLabel) btnLabel.textContent = "Sending…";
      setStatus("", null);

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          return r.ok && j && j.ok;
        });
      }).then(function (ok) {
        if (ok) {
          form.reset();
          setStatus("Message sent — I'll get back to you shortly.", "is-ok");
        } else {
          setStatus("Couldn't send that. Email caleb@wiemansystems.com directly.", "is-error");
        }
      }).catch(function () {
        setStatus("Network error. Email caleb@wiemansystems.com directly.", "is-error");
      }).then(function () {
        sending = false;
        form.classList.remove("is-sending");
        if (btnLabel) btnLabel.textContent = prevLabel || "Send message";
      });
    });
  })();

  /* ====================================================================
     BOOK A CALL — modal open/close (native <dialog>)
     ==================================================================== */
  (function () {
    var modal = doc.getElementById("bookModal");
    if (!modal) return;
    var statusEl = doc.getElementById("cformStatus");
    var dialogOK = typeof modal.showModal === "function";

    function open(e) {
      if (e) e.preventDefault();
      if (statusEl) { statusEl.textContent = ""; statusEl.className = "cform__status"; }
      body.classList.add("modal-open");
      if (dialogOK) { try { modal.showModal(); } catch (err) { modal.setAttribute("open", ""); } }
      else modal.setAttribute("open", "");
      var first = doc.getElementById("cf-name");
      if (first) setTimeout(function () { try { first.focus(); } catch (e2) {} }, 60);
    }
    function close() {
      if (dialogOK && modal.open && !reduce) {
        modal.classList.add("is-closing");
        modal.addEventListener("animationend", function h() {
          modal.classList.remove("is-closing");
          body.classList.remove("modal-open");
          modal.close();
        }, { once: true });
      } else {
        body.classList.remove("modal-open");
        if (dialogOK && modal.open) modal.close();
        else modal.removeAttribute("open");
      }
    }

    Array.prototype.forEach.call(doc.querySelectorAll("[data-book]"), function (el) {
      el.addEventListener("click", open);
    });
    Array.prototype.forEach.call(modal.querySelectorAll("[data-book-close]"), function (el) {
      el.addEventListener("click", close);
    });
    // backdrop click (native dialog: the click target is the dialog itself)
    modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
    // native <dialog> fires 'close' on Esc / .close() — keep body state in sync
    modal.addEventListener("close", function () { body.classList.remove("modal-open"); modal.classList.remove("is-closing"); });
    // animate the exit on Esc too (cancel fires before the native close)
    modal.addEventListener("cancel", function (e) { if (!reduce) { e.preventDefault(); close(); } });
    if (!dialogOK) {
      doc.addEventListener("keydown", function (e) {
        if ((e.key === "Escape" || e.keyCode === 27) && modal.hasAttribute("open")) close();
      });
    }
  })();

  /* React to a live change in motion preference. */
  mqReduce.addEventListener && mqReduce.addEventListener("change", function (e) {
    if (e.matches) location.reload();
  });
})();
