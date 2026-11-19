/* ============================================================
   KRONOS ATELIER — interaction & motion
   ============================================================ */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp  = (a, b, n) => a + (b - a) * n;
  const pad3  = (n) => String(Math.round(n)).padStart(3, '0');
  const FORCE_MOTION = /[?&]motion=on\b/.test(location.search);
  const REDUCED = !FORCE_MOTION && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NOLOADER = /[?&]nofx\b/.test(location.search);
  const MOBILE  = () => window.matchMedia('(max-width: 900px)').matches;

  if (REDUCED) document.documentElement.classList.add('no-motion');

  /* ── THEME ─────────────────────────────────────────────── */
  const themeButtons = [$('#themeBtn'), $('#themeBtnFoot')].filter(Boolean);

  function setTheme(name, persist = true) {
    document.documentElement.dataset.theme = name;
    document.body.dataset.theme = name;
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', name === 'darkroom' ? '#0A0A09' : '#EFEBE2');
    themeButtons.forEach((b) => {
      const label = b.id === 'themeBtnFoot' ? 'footer' : 'header';
      b.textContent = name === 'darkroom'
        ? (label === 'footer' ? 'SWITCH TO DAYLIGHT' : 'DAYLIGHT')
        : (label === 'footer' ? 'SWITCH TO DARKROOM' : 'DARKROOM');
      b.setAttribute('aria-pressed', String(name === 'daylight'));
    });
    if (persist) {
      try { localStorage.setItem('kronos-theme', name); } catch (e) {}
    }
  }

  let storedTheme = null;
  try { storedTheme = localStorage.getItem('kronos-theme'); } catch (e) {}
  const urlTheme = new URLSearchParams(location.search).get('theme');
  const initialTheme = (urlTheme === 'daylight' || urlTheme === 'darkroom')
    ? urlTheme
    : (storedTheme === 'daylight' ? 'daylight' : 'darkroom');
  setTheme(initialTheme, false);

  themeButtons.forEach((b) => b.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'darkroom' ? 'daylight' : 'darkroom';
    setTheme(next);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }));

  /* ── CLOCK ─────────────────────────────────────────────── */
  const clockEl = $('#clock');
  const footTimeEl = $('#footTime');

  function tickClock() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit',
      second: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const get = (t) => (parts.find((p) => p.type === t) || {}).value || '00';
    if (clockEl) clockEl.textContent = `LISBON ${get('hour')}:${get('minute')}`;
    if (footTimeEl) footTimeEl.textContent = `${get('hour')}:${get('minute')}:${get('second')}`;
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ── SMOOTH SCROLL ─────────────────────────────────────── */
  let lenis = null;
  if (window.Lenis && !REDUCED) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, touchMultiplier: 1.6 });
    lenis.on('scroll', () => { if (window.ScrollTrigger) ScrollTrigger.update(); });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToTarget(target) {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -60, duration: 1.2 });
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href === '#' || a.hasAttribute('data-open-lightbox')) return;
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(target);
  });

  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ── CURSOR ────────────────────────────────────────────── */
  const cursor = $('#cursor');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (cursor && canHover && !REDUCED) {
    document.body.classList.add('has-cursor');
    const label = $('.cursor__label', cursor);
    const pos = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };

    window.addEventListener('mousemove', (e) => {
      pos.tx = e.clientX; pos.ty = e.clientY;
      if (!cursor.classList.contains('is-live')) cursor.classList.add('is-live');
    }, { passive: true });

    gsap.ticker.add(() => {
      pos.x = lerp(pos.x, pos.tx, 0.18);
      pos.y = lerp(pos.y, pos.ty, 0.18);
      cursor.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    });

    document.addEventListener('mouseover', (e) => {
      const hit = e.target.closest('[data-cursor]');
      if (hit) {
        const txt = hit.getAttribute('data-cursor');
        if (txt) label.textContent = txt;
        cursor.classList.add('is-hover');
        if (txt === 'DRAG') cursor.classList.add('is-drag');
      }
    });
    document.addEventListener('mouseout', (e) => {
      const hit = e.target.closest('[data-cursor]');
      if (hit) cursor.classList.remove('is-hover', 'is-drag');
    });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-live'));
  }

  /* ── EXIF HUD ──────────────────────────────────────────── */
  const exifEl = $('#exif');
  const exifBody = $('#exifBody');
  let exifTimer = null;
  const DEFAULT_EXIF = 'HASSELBLAD X2D · 65MM · f/2.8 · ISO 64 · 1/500';

  function showExif(text) {
    if (!exifEl || !text) return;
    exifBody.textContent = text;
    exifEl.classList.add('is-on');
    clearTimeout(exifTimer);
    exifTimer = setTimeout(() => exifEl.classList.remove('is-on'), 2600);
  }

  document.addEventListener('mouseover', (e) => {
    const hit = e.target.closest('[data-exif]');
    if (hit) showExif(hit.getAttribute('data-exif'));
  });

  /* ── LOADER ────────────────────────────────────────────── */
  const loader = $('#loader');
  const loaderNum = $('#loaderNum');
  const loaderBar = $('#loaderBar');
  const loaderStat = $('#loaderStat');
  const loaderSkip = $('#loaderSkip');
  const stackImgs = $$('.loader__stack img');

  const STATS = ['DEVELOPING', 'FIXING', 'RINSING', 'SLEEVING'];

  let loaderDone = false;
  let loaderTl = null;

  function finishLoader() {
    if (loaderDone) return;
    loaderDone = true;
    document.body.classList.remove('is-loading');
    if (lenis) lenis.start();

    const out = gsap.timeline();
    out.to('.loader__core, .loader__skip', { opacity: 0, duration: 0.3, ease: 'power2.in' })
       .to('.loader__stack img', { opacity: 0, scale: 0.92, duration: 0.3, stagger: 0.02 }, 0)
       .to(loader, {
         clipPath: 'inset(0 0 100% 0)',
         duration: 1.05,
         ease: 'expo.inOut',
         onComplete: () => { loader.style.display = 'none'; },
       }, 0.22)
       .add(heroIntro, '-=0.55');

    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  function startLoader() {
    if (NOLOADER) {
      if (loader) loader.style.display = 'none';
      document.body.classList.remove('is-loading');
      heroIntro();
      return;
    }
    if (!loader) { heroIntro(); return; }
    document.body.classList.add('is-loading');
    if (lenis) lenis.stop();

    const state = { v: 0 };

    loaderTl = gsap.timeline();

    stackImgs.forEach((img, i) => {
      gsap.set(img, {
        x: gsap.utils.random(-260, 260),
        y: gsap.utils.random(-160, 160),
        rotation: gsap.utils.random(-24, 24),
        scale: 0.82,
        opacity: 0,
      });
      loaderTl.to(img, {
        opacity: i === stackImgs.length - 1 ? 0.5 : 0.24,
        scale: 1,
        x: gsap.utils.random(-120, 120),
        y: gsap.utils.random(-90, 90),
        rotation: gsap.utils.random(-12, 12),
        duration: 0.5,
        ease: 'power3.out',
      }, 0.05 * i);
    });

    loaderTl.to(state, {
      v: 100,
      duration: REDUCED ? 0.5 : 2.05,
      ease: 'power1.inOut',
      onUpdate: () => {
        loaderNum.textContent = pad3(state.v);
        loaderBar.style.right = `${100 - state.v}%`;
        if (state.v > 76) loaderStat.textContent = STATS[3];
        else if (state.v > 52) loaderStat.textContent = STATS[2];
        else if (state.v > 26) loaderStat.textContent = STATS[1];
      },
      onComplete: finishLoader,
    }, 0.15);

    if (loaderSkip) loaderSkip.addEventListener('click', () => {
      if (loaderTl) loaderTl.kill();
      loaderNum.textContent = '036';
      loaderBar.style.right = '0%';
      finishLoader();
    });
  }

  /* ── HERO INTRO ────────────────────────────────────────── */
  let heroIntrod = false;
  function heroIntro() {
    if (heroIntrod) return;
    heroIntrod = true;
    if (REDUCED) { setTimeout(() => showExif(DEFAULT_EXIF), 600); return; }

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__word', { yPercent: 108, duration: 1.5, stagger: 0.09 }, 0.0)
      .from('.hero__print--m', { yPercent: 12, opacity: 0, scale: 0.94, duration: 1.5 }, 0.12)
      .from('.hero__print--l', { xPercent: -18, opacity: 0, duration: 1.6 }, 0.3)
      .from('.hero__print--r', { xPercent: 18, opacity: 0, duration: 1.6 }, 0.38)
      .from('.hero__meta, .hero__tag, .hero__scroll', { opacity: 0, y: 14, duration: 1.1, stagger: 0.07 }, 0.6)
      .from('.hero__frame .hero__tick, .hero__cross', { opacity: 0, duration: 1 }, 0.7);

    setTimeout(() => showExif(DEFAULT_EXIF), 1400);
  }

  /* ── REVEALS ───────────────────────────────────────────── */
  function initReveals() {
    if (!window.ScrollTrigger || REDUCED) return;

    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        y: 30, opacity: 0, duration: 1.15, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });

    $$('[data-reveal-lines]').forEach((el) => {
      gsap.from(el, {
        yPercent: 40, opacity: 0, clipPath: 'inset(0 0 100% 0)',
        duration: 1.5, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });

    gsap.utils.toArray('.sf').forEach((el, i) => {
      gsap.fromTo(el,
        { yPercent: 12, opacity: 0 },
        {
          yPercent: 0, opacity: 1, duration: 1.3, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        });
    });

    gsap.utils.toArray('.reel-card').forEach((el, i) => {
      gsap.from(el, {
        y: 44, opacity: 0, duration: 1.2, delay: (i % 3) * 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });

    gsap.utils.toArray('.journal__list li').forEach((el, i) => {
      gsap.from(el, {
        opacity: 0, y: 18, duration: 0.9, delay: i * 0.06, ease: 'power2.out',
        scrollTrigger: { trigger: '.journal__list', start: 'top 88%', once: true },
      });
    });
  }

  /* ── HERO SCROLL ───────────────────────────────────────── */
  function initHero() {
    if (!window.ScrollTrigger || REDUCED) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: '+=1700',
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    tl.to('.hero__print--l', { x: '-46vw', y: '-4vh', rotation: -26, opacity: 0.12, duration: 1, ease: 'power2.in' }, 0)
      .to('.hero__print--r', { x: '46vw', y: '4vh', rotation: 22, opacity: 0.12, duration: 1, ease: 'power2.in' }, 0)
      .to('.hero__word--a', { x: '-30vw', opacity: 0, duration: 1, ease: 'power2.in' }, 0.04)
      .to('.hero__word--b', { x: '30vw', opacity: 0, duration: 1, ease: 'power2.in' }, 0.04)
      .to('.hero__meta, .hero__tag, .hero__scroll, .hero__frame', { opacity: 0, duration: 0.4 }, 0)
      .to('.hero__print--m', { scale: 0.97, opacity: 0, duration: 0.55, ease: 'power2.in' }, 0.46)
      .fromTo('.hero__bleed', { opacity: 0, scale: 1.14 }, { opacity: 1, scale: 1.02, duration: 1, ease: 'power2.out' }, 0.44)
      .to('.hero__bleed img', { scale: 1, duration: 1.4, ease: 'none' }, 0.44)
      .to({}, { duration: 0.22 });
  }

  /* ── MARQUEES ──────────────────────────────────────────── */
  const marquees = [];

  function buildMarquee(el, speed, dir) {
    if (!el) return;
    const original = el.innerHTML;
    const fits = el.scrollWidth < window.innerWidth * 1.05;
    if (fits) el.innerHTML = original + original + original;
    else el.innerHTML = original + original;

    const state = { x: 0, w: 0 };
    const measure = () => { state.w = el.scrollWidth / (fits ? 3 : 2); };
    measure();

    marquees.push({ el, state, speed, dir });
    return measure;
  }

  const marqueeMeasures = [];
  marqueeMeasures.push(buildMarquee($('#stripTrack'), 0.45, 1));
  marqueeMeasures.push(buildMarquee($('#clientsRowA'), 0.32, 1));
  marqueeMeasures.push(buildMarquee($('#clientsRowB'), 0.24, -1));

  gsap.ticker.add(() => {
    for (const m of marquees) {
      if (!m.state.w) continue;
      if (REDUCED) { m.el.style.transform = 'translate3d(0,0,0)'; continue; }
      m.state.x -= m.speed * m.dir;
      if (m.state.x <= -m.state.w) m.state.x += m.state.w;
      if (m.state.x > 0) m.state.x -= m.state.w;
      m.el.style.transform = `translate3d(${m.state.x.toFixed(2)}px,0,0)`;
    }
  });

  window.addEventListener('resize', () => {
    marqueeMeasures.forEach((fn) => fn && fn());
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      marqueeMeasures.forEach((fn) => fn && fn());
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }

  /* ── INDEX ENGINE ──────────────────────────────────────── */
  const stage = $('#stage');
  const track = $('#track');
  const frames = $$('.frame', track || document);
  const archiveEl = $('#archive');
  const archiveRowsEl = $('#archiveRows');
  const indexSection = $('#work');
  const indexCount = $('#indexCount');
  const indexHint = $('#indexHint');

  const SCATTER = [
    [0.115, 0.255, 0.170], [0.278, 0.500, 0.108], [0.110, 0.760, 0.198],
    [0.392, 0.185, 0.138], [0.532, 0.545, 0.116], [0.660, 0.140, 0.128],
    [0.790, 0.360, 0.118], [0.688, 0.740, 0.178], [0.884, 0.610, 0.158],
    [0.508, 0.880, 0.148], [0.330, 0.098, 0.082], [0.930, 0.150, 0.108],
    [0.212, 0.945, 0.138], [0.436, 0.392, 0.080],
  ];
  const ROT = [-2.2, 1.6, -1.1, 2.4, -1.8, 1.2, -1.6, 1.0, -1.3, 2.0, -0.9, 1.4, -2.0, 2.2];

  const idx = {
    mode: 'scatter',
    filter: 'all',
    stripX: 0,
    stripTarget: 0,
    stripMin: 0,
    visible: frames.slice(),
    busy: false,
  };

  /* archive rows */
  if (archiveRowsEl) {
    archiveRowsEl.innerHTML = frames.map((f, i) => {
      const g = f.dataset.genre;
      return `<div class="archive__row" data-i="${i}" data-genre="${g}">
        <span class="r-title">${f.dataset.title}<span class="r-arrow">→</span></span>
        <span class="r-client">${f.dataset.client}</span>
        <span class="r-genre">${g.toUpperCase()}</span>
        <span class="r-year">${f.dataset.year}</span>
      </div>`;
    }).join('');

    $$('.archive__row', archiveRowsEl).forEach((row) => {
      const i = Number(row.dataset.i);
      row.addEventListener('mouseenter', () => frames[i] && frames[i].classList.add('is-hover'));
      row.addEventListener('mouseleave', () => frames[i] && frames[i].classList.remove('is-hover'));
      row.addEventListener('click', () => openLightbox(i));
    });
  }

  function stageSize() {
    const r = stage.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  function computeLayout() {
    const { w: W, h: H } = stageSize();
    const out = new Map();
    const vis = idx.visible;
    const n = vis.length;
    if (!n) return out;

    if (idx.mode === 'scatter') {
      vis.forEach((f, k) => {
        const [cx, cy, wf] = SCATTER[k % SCATTER.length];
        const ar = parseFloat(f.dataset.ar) || 1;
        const fw = Math.max(84, wf * W);
        const fh = fw / ar;
        const maxH = H * 0.8;
        const scaleH = fh > maxH ? maxH / fh : 1;
        const w2 = fw * scaleH, h2 = fh * scaleH;
        const inset = 18;
        const x = clamp(cx * W - w2 / 2, inset, W - w2 - inset);
        const y = clamp(cy * H - h2 / 2, inset, H - h2 - inset);
        out.set(f, { x, y, width: w2, height: h2, rotation: ROT[k % ROT.length] || 0 });
      });
    }

    if (idx.mode === 'strip') {
      const band = H * 0.62;
      let cursorX = 0;
      vis.forEach((f, k) => {
        const ar = parseFloat(f.dataset.ar) || 1;
        const fh = band;
        const fw = fh * ar;
        const off = k % 2 === 0 ? -H * 0.028 : H * 0.028;
        out.set(f, {
          x: cursorX,
          y: (H - fh) / 2 + off,
          width: fw,
          height: fh,
          rotation: 0,
        });
        cursorX += fw + 20;
      });
      const total = cursorX - 20;
      idx.stripMin = total > W - 40 ? Math.min(0, W - 40 - total) : 0;
      if (idx.stripTarget < idx.stripMin) idx.stripTarget = idx.stripMin;
      if (idx.stripTarget > 0) idx.stripTarget = 0;
      idx.stripX = idx.stripTarget;
    }

    if (idx.mode === 'archive') {
      const headH = 38;
      const available = H - headH - 4;
      const rowH = clamp(available / n, 30, 48);
      const thumbH = Math.max(24, rowH - 10);
      vis.forEach((f, k) => {
        const ar = parseFloat(f.dataset.ar) || 1;
        const fw = thumbH * ar;
        out.set(f, {
          x: 0,
          y: headH + k * rowH + (rowH - thumbH) / 2,
          width: fw,
          height: thumbH,
          rotation: 0,
        });
      });
      idx.rowH = rowH;
    }

    return out;
  }

  const isMobile = () => MOBILE();

  function applyLayout(animated) {
    if (isMobile()) {
      frames.forEach((f) => {
        f.style.transform = '';
        f.style.width = '';
        f.style.height = '';
        f.style.opacity = '';
      });
      track.style.transform = '';
      indexSection.classList.add('is-laid');
      return;
    }

    const layout = computeLayout();
    const dur = animated ? 0.95 : 0;
    const ease = 'power3.inOut';

    frames.forEach((f) => {
      const pos = layout.get(f);
      if (!pos) {
        gsap.to(f, { opacity: 0, scale: 0.92, duration: dur ? 0.5 : 0, pointerEvents: 'none', overwrite: true });
        return;
      }
      gsap.to(f, {
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        rotation: pos.rotation,
        opacity: 1,
        scale: 1,
        pointerEvents: 'auto',
        duration: dur,
        ease,
        overwrite: true,
        stagger: animated ? 0.012 : 0,
      });
    });

    gsap.set(track, { x: idx.mode === 'strip' ? idx.stripX : 0 });

    if (archiveEl) {
      const rows = $$('.archive__row', archiveEl);
      const rowH = idx.rowH || 44;
      rows.forEach((row) => {
        const i = Number(row.dataset.i);
        const f = frames[i];
        const pos = layout.get(f);
        const vis = !!pos;
        row.style.display = vis ? '' : 'none';
        if (vis) {
          const k = idx.visible.indexOf(f);
          row.style.top = `${38 + k * rowH}px`;
          row.style.height = `${rowH}px`;
        }
      });
    }

    indexSection.classList.add('is-laid');
  }

  function setMode(mode, animated = true) {
    if (idx.mode === mode) return;
    idx.mode = mode;
    $$('.mode').forEach((b) => {
      const on = b.dataset.mode === mode;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    indexSection.classList.toggle('is-strip', mode === 'strip');
    indexSection.classList.toggle('is-archive', mode === 'archive');
    track.style.cursor = '';

    if (mode === 'strip') {
      idx.stripTarget = 0;
      idx.stripX = 0;
      if (indexHint) indexHint.textContent = 'DRAG SIDEWAYS · RELEASE TO COAST';
    } else if (mode === 'archive') {
      if (indexHint) indexHint.textContent = 'HOVER A ROW · CLICK TO OPEN THE FRAME';
      stage.style.touchAction = 'pan-y';
    } else {
      if (indexHint) indexHint.textContent = 'CLICK A FRAME TO OPEN · HOVER FOR CAPTURE DATA';
    }

    applyLayout(animated);
  }

  function setFilter(name) {
    idx.filter = name;
    $$('.filter').forEach((b) => {
      const on = b.dataset.filter === name;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    idx.visible = name === 'all' ? frames.slice() : frames.filter((f) => f.dataset.genre === name);
    frames.forEach((f) => f.classList.toggle('is-hidden', !idx.visible.includes(f)));

    if (indexCount) {
      indexCount.textContent = `${String(idx.visible.length).padStart(2, '0')} FRAME${idx.visible.length === 1 ? '' : 'S'}`;
    }
    applyLayout(true);
    requestAnimationFrame(() => { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
  }

  /* strip drag */
  if (stage) {
    let dragging = false;
    let startX = 0;
    let startTarget = 0;
    let velocity = 0;
    let lastX = 0;
    let lastT = 0;

    const startDrag = (e) => {
      if (idx.mode !== 'strip' || isMobile()) return;
      dragging = true;
      startX = e.clientX;
      lastX = e.clientX;
      lastT = performance.now();
      startTarget = idx.stripTarget;
      velocity = 0;
      indexSection.classList.add('is-dragging');
      stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
    };

    const moveDrag = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      idx.stripTarget = clamp(startTarget + dx, idx.stripMin, 40);
      const now = performance.now();
      const dt = Math.max(16, now - lastT);
      velocity = (e.clientX - lastX) / dt;
      lastX = e.clientX;
      lastT = now;
    };

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      indexSection.classList.remove('is-dragging');
      idx.stripTarget = clamp(idx.stripTarget + velocity * 260, idx.stripMin, 40);
    };

    stage.addEventListener('pointerdown', startDrag);
    window.addEventListener('pointermove', moveDrag, { passive: true });
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    stage.addEventListener('wheel', (e) => {
      if (idx.mode !== 'strip' || isMobile()) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        idx.stripTarget = clamp(idx.stripTarget - e.deltaX * 1.2, idx.stripMin, 40);
      }
    }, { passive: false });

    stage.addEventListener('keydown', (e) => {
      if (idx.mode !== 'strip') return;
      if (e.key === 'ArrowRight') { idx.stripTarget = clamp(idx.stripTarget - 320, idx.stripMin, 40); }
      if (e.key === 'ArrowLeft') { idx.stripTarget = clamp(idx.stripTarget + 320, idx.stripMin, 40); }
    });

    let stripRaf = null;
    gsap.ticker.add(() => {
      if (idx.mode !== 'strip' || isMobile()) return;
      idx.stripX = lerp(idx.stripX, idx.stripTarget, 0.12);
      track.style.transform = `translate3d(${idx.stripX.toFixed(2)}px,0,0)`;
    });
  }

  $$('.mode').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $$('.filter').forEach((b) => b.addEventListener('click', () => setFilter(b.dataset.filter)));

  frames.forEach((f, i) => {
    f.style.setProperty('--ar', f.dataset.ar || '1');
    f.addEventListener('click', () => openLightbox(i));
    f.addEventListener('mouseenter', () => {
      if (idx.mode === 'archive') return;
      f.classList.add('is-hover');
      showExif(f.dataset.exif);
    });
    f.addEventListener('mouseleave', () => f.classList.remove('is-hover'));
    f.addEventListener('focus', () => showExif(f.dataset.exif));
    f.setAttribute('tabindex', '0');
    f.setAttribute('role', 'button');
    f.setAttribute('aria-label', `Open ${f.dataset.title}`);
    f.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); }
    });
  });

  /* ── LIGHTBOX ──────────────────────────────────────────── */
  const EXTRA = {
    'hero-main': { title: 'No. 27A', client: 'MARE', year: '2026', genre: 'fashion', exif: 'HASSELBLAD X2D · 65MM · f/2.8 · ISO 64 · 1/500' },
    'wed-05': { title: 'Quinta da Lua III', client: 'PRIVATE', year: '2026', genre: 'wedding', exif: 'LEICA M11 · 35MM · f/1.6 · ISO 320 · 1/200' },
    'wed-02': { title: 'Bouquet', client: 'PRIVATE', year: '2026', genre: 'wedding', exif: 'LEICA M11 · 50MM · f/2.0 · ISO 160 · 1/500' },
    'wed-03': { title: 'Vows', client: 'PRIVATE', year: '2026', genre: 'wedding', exif: 'LEICA M11 · 50MM · f/2.8 · ISO 200 · 1/250' },
    'wed-04': { title: 'The Long Table', client: 'PRIVATE', year: '2026', genre: 'wedding', exif: 'LEICA M11 · 35MM · f/4 · ISO 100 · 1/800' },
    'com-02': { title: 'Garage Study', client: 'NOCTURNE', year: '2025', genre: 'commercial', exif: 'CANON R5 · 85MM · f/2.0 · ISO 640 · 1/80' },
    'com-04': { title: 'Two Wheels', client: 'NOCTURNE', year: '2025', genre: 'commercial', exif: 'CANON R5 · 70MM · f/5.6 · ISO 200 · 1/320' },
    'arc-02': { title: 'Glass, Morning', client: 'FORMA', year: '2025', genre: 'architecture', exif: 'SONY A7R V · 24MM · f/8 · ISO 64 · 1/320' },
    'pla-01': { title: 'Serra, 04:20', client: 'PERSONAL', year: '2024', genre: 'place', exif: 'SONY A7R V · 20MM · f/2.8 · ISO 3200 · 20s' },
    'pla-02': { title: 'Crosstown', client: 'PERSONAL', year: '2024', genre: 'place', exif: 'LEICA M11 · 35MM · f/5.6 · ISO 400 · 1/500' },
    'detail-01': { title: 'Kit', client: 'PERSONAL', year: '2025', genre: 'still life', exif: 'HASSELBLAD X2D · 120MM · f/8 · ISO 64 · 1/125' },
    'detail-02': { title: 'Stadium, 22:10', client: 'PERSONAL', year: '2024', genre: 'place', exif: 'CANON R5 · 24MM · f/1.4 · ISO 1600 · 1/60' },
  };

  const lb = $('#lightbox');
  const lbImg = $('#lbImg');
  const lbIdx = $('#lbIdx');
  const lbTitle = $('#lbTitle');
  const lbClient = $('#lbClient');
  const lbYear = $('#lbYear');
  const lbExif = $('#lbExif');
  const lbGenre = $('#lbGenre');
  let lbList = [];
  let lbPos = 0;
  let lastFocus = null;

  function buildList() {
    const items = frames.map((f) => ({
      src: `./assets/img/${f.dataset.file}.jpg`,
      title: f.dataset.title,
      client: f.dataset.client,
      year: f.dataset.year,
      genre: f.dataset.genre,
      exif: f.dataset.exif,
      el: f,
    }));
    Object.keys(EXTRA).forEach((key) => {
      if (frames.some((f) => f.dataset.file === key)) return;
      items.push({ src: `./assets/img/${key}.jpg`, ...EXTRA[key] });
    });
    return items;
  }

  function renderLb() {
    const item = lbList[lbPos];
    if (!item) return;
    lbImg.src = item.src;
    lbImg.alt = item.title;
    lbIdx.textContent = `${pad3(lbPos + 1)} / ${pad3(lbList.length)}`;
    lbTitle.textContent = item.title.toUpperCase();
    lbClient.textContent = (item.client || '—').toUpperCase();
    lbYear.textContent = item.year || '—';
    lbExif.textContent = item.exif || '—';
    lbGenre.textContent = (item.genre || '—').toUpperCase();
  }

  function openLightbox(arg) {
    lbList = lbList.length ? lbList : buildList();
    if (typeof arg === 'number') {
      lbPos = arg;
    } else if (typeof arg === 'string') {
      const idxNo = frames.findIndex((f) => f.dataset.file === arg);
      if (idxNo >= 0) lbPos = idxNo;
      else lbPos = lbList.findIndex((it) => it.src.includes(arg));
    }
    if (lbPos < 0) lbPos = 0;
    lastFocus = document.activeElement;
    renderLb();
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    if (lenis) lenis.stop();

    gsap.fromTo(lbImg, { scale: 0.965, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'expo.out' });
    $('#lbClose').focus();
  }

  function closeLightbox() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    if (lenis) lenis.start();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function stepLb(dir) {
    lbPos = (lbPos + dir + lbList.length) % lbList.length;
    renderLb();
    gsap.fromTo(lbImg, { opacity: 0, x: dir * 18 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' });
  }

  if (lb) {
    $('#lbClose').addEventListener('click', closeLightbox);
    $('#lbPrev').addEventListener('click', () => stepLb(-1));
    $('#lbNext').addEventListener('click', () => stepLb(1));
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });

    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') stepLb(1);
      if (e.key === 'ArrowLeft') stepLb(-1);
    });
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open-lightbox]');
    if (!trigger) return;
    e.preventDefault();
    openLightbox(trigger.getAttribute('data-open-lightbox'));
  });

  /* ── DRAWER ────────────────────────────────────────────── */
  const drawer = $('#drawer');
  const form = $('#enquiryForm');
  const donePanel = $('#drawerDone');

  function openDrawer() {
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    if (lenis) lenis.stop();

    gsap.fromTo('.drawer__form > *', { y: 18, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.7, stagger: 0.045, ease: 'power3.out', delay: 0.18,
      clearProps: 'transform',
    });
    setTimeout(() => { const f = $('#f-name'); if (f) f.focus({ preventScroll: true }); }, 500);
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    if (lenis) lenis.start();
  }

  if (drawer) {
    $$('[data-open-drawer]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); openDrawer(); }));
    $$('[data-close-drawer]').forEach((b) => b.addEventListener('click', closeDrawer));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });
  }

  $$('.chips').forEach((group) => {
    group.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      $$('.chip', group).forEach((c) => c.classList.toggle('is-on', c === chip));
    });
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#f-name');
      const email = $('#f-email');
      let ok = true;
      [name, email].forEach((input) => {
        if (!input.value.trim()) { input.style.borderColor = 'var(--red)'; ok = false; }
        else input.style.borderColor = '';
      });
      if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        email.style.borderColor = 'var(--red)'; ok = false;
      }
      if (!ok) return;
      form.hidden = true;
      donePanel.hidden = false;
      gsap.fromTo(donePanel.children, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.06, ease: 'power3.out' });
    });
  }

  /* ── GRADE SLIDER ──────────────────────────────────────── */
  const grade = $('#grade');
  if (grade) {
    const frameEl = $('.grade__frame', grade);
    const raw = $('#gradeRaw');
    const handle = $('#gradeHandle');
    let dragging = false;

    const setPct = (pct) => {
      const p = clamp(pct, 0, 100);
      raw.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
      handle.style.left = `${p}%`;
      handle.setAttribute('aria-valuenow', String(Math.round(p)));
    };

    const fromEvent = (e) => {
      const r = frameEl.getBoundingClientRect();
      setPct(((e.clientX - r.left) / r.width) * 100);
    };

    frameEl.addEventListener('pointerdown', (e) => {
      dragging = true;
      frameEl.setPointerCapture && frameEl.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    window.addEventListener('pointermove', (e) => { if (dragging) fromEvent(e); });
    window.addEventListener('pointerup', () => { dragging = false; });

    handle.addEventListener('keydown', (e) => {
      const cur = Number(handle.getAttribute('aria-valuenow')) || 50;
      if (e.key === 'ArrowLeft') { e.preventDefault(); setPct(cur - 5); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setPct(cur + 5); }
    });

    setTimeout(() => {
      if (REDUCED) return;
      const obj = { p: 50 };
      gsap.to(obj, {
        p: 68, duration: 1.6, ease: 'power2.inOut', delay: 2.2,
        onUpdate: () => setPct(obj.p),
        scrollTrigger: { trigger: grade, start: 'top 70%', once: true },
      });
    }, 200);
  }

  /* ── MENU ──────────────────────────────────────────────── */
  const menu = $('#menu');
  const menuBtn = $('#menuBtn');

  function openMenu() {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
    if (lenis) lenis.stop();
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
    if (lenis) lenis.start();
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      menu.classList.contains('is-open') ? closeMenu() : openMenu();
    });
    $('#menuClose').addEventListener('click', closeMenu);
    $$('.menu__nav a').forEach((a) => a.addEventListener('click', closeMenu));
  }

  /* ── HEADER BEHAVIOUR ──────────────────────────────────── */
  const hdr = $('#hdr');
  let lastY = 0;
  const onScrollHeader = () => {
    const y = window.scrollY || 0;
    hdr.classList.toggle('is-stuck', y > 24);
    if (y > 220 && y > lastY + 6 && !drawer.classList.contains('is-open')) hdr.classList.add('is-hidden');
    else if (y < lastY - 6 || y < 200) hdr.classList.remove('is-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* ── INIT ──────────────────────────────────────────────── */
  function initIndex() {
    // initial static layout so nothing overlaps before reveal
    if (!isMobile()) applyLayout(false);
    setFilter('all');
  }

  function onResize() {
    if (!isMobile()) applyLayout(false);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  window.addEventListener('resize', () => {
    clearTimeout(window.__kronosRz);
    window.__kronosRz = setTimeout(onResize, 160);
  });

  window.addEventListener('load', () => {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (lenis) lenis.stop(); }
    else if (!document.body.classList.contains('is-loading')) { if (lenis) lenis.start(); }
  });

  function boot() {
    initHero();
    initReveals();
    initIndex();
    startLoader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
