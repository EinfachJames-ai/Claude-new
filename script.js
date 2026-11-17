(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp = (a, b, t) => a + t * (b - a);

  /* ==========================================================
     Area colours
     ========================================================== */
  /* Area colours. The colour is blended continuously from the scroll position
     (in OKLab, so e.g. red to green never turns muddy) and then eased over time. */
  const THEMES = {
    blue:   { accent: '#4D7CFF', hi: '#8EA9FF', deep: '#1E3FD8' },
    red:    { accent: '#F43F5E', hi: '#FF97AA', deep: '#9F1239' },
    green:  { accent: '#12C48B', hi: '#74E8BF', deep: '#047857' },
    purple: { accent: '#7C3AED', hi: '#BBA0FF', deep: '#4C1D95' },
  };
  const KEYS = ['accent', 'hi', 'deep'];
  const toLin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  function hexToOklab(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => toLin(parseInt(hex.slice(i, i + 2), 16) / 255));
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }
  function oklabToRgb([L, a, b]) {
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960771 * l - 0.7034186147 * m + 1.7076147010 * s].map((c) => clamp(toSrgb(c), 0, 1));
  }
  const LAB = {};
  Object.keys(THEMES).forEach((n) => { LAB[n] = {}; KEYS.forEach((k) => { LAB[n][k] = hexToOklab(THEMES[n][k]); }); });
  const mixLab = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

  const colorCur = { accent: LAB.blue.accent.slice(), hi: LAB.blue.hi.slice(), deep: LAB.blue.deep.slice() };
  let colorTarget = { accent: LAB.blue.accent, hi: LAB.blue.hi, deep: LAB.blue.deep };
  const rootStyle = document.documentElement.style;

  /* The CSS variables are written at most ~16 times per second: each write
     restyles the page, so this keeps fast scrolling across area borders smooth. */
  const CSS_INTERVAL = 60;
  let lastCss = 0, cssDirty = false;
  const cssColor = (c) => `rgb(${c.map((v) => Math.round(v * 255)).join(' ')})`;
  let lastCssValues = '';
  function applyColors(now, force) {
    if (!force && now - lastCss < CSS_INTERVAL) { cssDirty = true; return; }
    lastCss = now;
    cssDirty = false;
    const vals = KEYS.map((k) => cssColor(oklabToRgb(colorCur[k])));
    const key = vals.join('|');
    if (key === lastCssValues) return;
    lastCssValues = key;
    rootStyle.setProperty('--accent', vals[0]);
    rootStyle.setProperty('--accent-hi', vals[1]);
    rootStyle.setProperty('--accent-deep', vals[2]);
  }

  // ease the current colour towards the scroll-derived target, frame-rate independent
  let colorPrev = 0, colorRunning = false;
  function startColorLoop() {
    if (colorRunning || reduceMotion) return;
    colorRunning = true;
    colorPrev = 0;
    requestAnimationFrame(colorLoop);
  }
  function colorLoop(now) {
    const dt = colorPrev ? Math.min(now - colorPrev, 100) : 16;
    colorPrev = now;
    const k = 1 - Math.exp(-dt / 420);
    let delta = 0;
    KEYS.forEach((key) => {
      const c = colorCur[key], t = colorTarget[key];
      for (let i = 0; i < 3; i++) {
        const d = t[i] - c[i];
        c[i] += d * k;
        delta = Math.max(delta, Math.abs(d));
      }
    });
    if (delta > 0.0004) {
      applyColors(now, false);
      requestAnimationFrame(colorLoop);
    } else {
      KEYS.forEach((key) => { colorCur[key] = colorTarget[key].slice(); });
      applyColors(now, true);
      colorRunning = false;
    }
  }

  /* ==========================================================
     Hero aurora: CSS-only animation, paused while the hero is off screen
     ========================================================== */
  const hero = $('.hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      hero.classList.toggle('is-offscreen', !entries[0].isIntersecting);
    }).observe(hero);
  }

  /* ==========================================================
     Hero connector lines (drawn in pixels so dashes stay crisp)
     ========================================================== */
  const heroLines = $('.hero-lines');
  const LINE_TONES = ['blue', 'green', 'purple', 'red'];
  const LINES = [
    [[19, 22], [24, 22], [29, 31]],
    [[81, 22], [76, 22], [71, 31]],
    [[19, 78], [24, 78], [29, 69]],
    [[81, 78], [76, 78], [71, 69]],
  ];
  function drawHeroLines() {
    const w = heroLines.clientWidth, h = heroLines.clientHeight;
    if (!w || !h) return;
    heroLines.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const d = LINES.map((pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x / 100 * w).toFixed(1)} ${(y / 100 * h).toFixed(1)}`).join(' '));
    heroLines.innerHTML =
      d.map((p) => `<path class="hl" d="${p}"/>`).join('') +
      d.map((p, i) => `<path class="hl-pulse" data-tone="${LINE_TONES[i]}" pathLength="100" d="${p}"/>`).join('');
  }
  if (heroLines) {
    drawHeroLines();
    window.addEventListener('resize', drawHeroLines);
  }

  /* ==========================================================
     Page load
     ========================================================== */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  });

  /* ==========================================================
     Navigation
     ========================================================== */
  const nav = $('.nav');
  const menu = $('#menu');
  const toggle = $('.menu-toggle');

  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    $('.sr-only', toggle).textContent = open ? 'Menü schließen' : 'Menü öffnen';
  }
  toggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });

  const navLinks = $$('.nav-links a[href^="#"]:not(.btn)');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);

  /* ==========================================================
     Scroll-driven effects
     ========================================================== */
  const frame = $('[data-tilt]');
  const steps = $('[data-steps]');
  const stepItems = steps ? $$('.step', steps) : [];
  const manifesto = $('[data-manifesto]');
  let words = [];

  if (manifesto) {
    const text = manifesto.textContent.trim();
    // screen readers get the plain sentence, the word spans are decoration
    manifesto.innerHTML = `<span class="sr-only">${text}</span><span aria-hidden="true">` +
      text.split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ') + '</span>';
    words = $$('.w', manifesto);
  }

  let lastY = window.scrollY;
  let ticking = false;

  const progressBar = $('.progress');
  const themed = $$('section[data-theme]');
  const smoother = (a, b, v) => {
    const x = clamp((v - a) / (b - a), 0, 1);
    return x * x * x * (x * (x * 6 - 15) + 10);
  };

  /* Layout positions are measured once (and again when the layout changes)
     instead of on every scroll frame. offsetTop ignores transforms, so
     reveal and tilt animations do not disturb the values. */
  const docTop = (el) => { let t = 0; while (el) { t += el.offsetTop; el = el.offsetParent; } return t; };
  let L = null;
  function measure() {
    L = {
      vh: window.innerHeight,
      max: document.documentElement.scrollHeight - window.innerHeight,
      borders: themed.map(docTop),
      sections: sections.map((sec) => [docTop(sec), sec.offsetHeight]),
      frame: frame ? docTop(frame) : 0,
      manifesto: manifesto ? [docTop(manifesto), manifesto.offsetHeight] : null,
      steps: steps ? [docTop(steps), steps.offsetHeight] : null,
      stepTops: stepItems.map(docTop),
    };
  }

  // colour for the current scroll position: solid inside a section,
  // blended across roughly 80% of a screen height around each border
  function updateColorTarget(y, vh) {
    const probe = y + vh * 0.5;
    const zone = vh * 0.4;
    const target = LAB[themed[0].dataset.theme];
    const mixed = KEYS.reduce((o, k) => { o[k] = target[k]; return o; }, {});
    for (let i = 1; i < themed.length; i++) {
      const prev = themed[i - 1].dataset.theme, next = themed[i].dataset.theme;
      if (prev === next) continue;
      const border = L.borders[i];
      const w = smoother(border - zone, border + zone, probe);
      if (w <= 0) break;
      KEYS.forEach((k) => { mixed[k] = mixLab(mixed[k], LAB[next][k], w); });
    }
    colorTarget = mixed;
    if (reduceMotion) {
      KEYS.forEach((k) => { colorCur[k] = mixed[k].slice(); });
      applyColors(0, true);
    } else {
      startColorLoop();
    }
  }

  // only touch the style when a value really changes; unchanged writes still cost a restyle
  const varCache = new WeakMap();
  function setVar(el, name, value) {
    let cache = varCache.get(el);
    if (!cache) { cache = {}; varCache.set(el, cache); }
    if (cache[name] === value) return;
    cache[name] = value;
    el.style.setProperty(name, value);
  }

  function onScroll() {
    ticking = false;
    if (!L) measure();
    const y = window.scrollY;
    const vh = L.vh;

    nav.classList.toggle('is-solid', y > 24);
    if (!menu.classList.contains('is-open')) {
      if (y > lastY + 4 && y > vh * 0.8) nav.classList.add('is-hidden');
      else if (y < lastY - 4) nav.classList.remove('is-hidden');
    }
    lastY = y;
    setVar(progressBar, '--p', L.max > 0 ? clamp(y / L.max, 0, 1).toFixed(3) : '0');

    updateColorTarget(y, vh);

    const line = y + vh * 0.4;
    let current = null;
    L.sections.forEach(([top, h], i) => { if (line > top && line < top + h) current = navLinks[i]; });
    navLinks.forEach((a) => a.classList.toggle('is-current', a === current));

    if (frame && !reduceMotion) {
      const tilt = clamp((L.frame - y - vh * 0.12) / (vh * 0.7), 0, 1);
      setVar(frame, '--tilt', tilt.toFixed(3));
    }

    if (words.length && !reduceMotion) {
      const [top, h] = L.manifesto;
      const p = clamp((vh * 0.85 - (top - y)) / (h + vh * 0.35), 0, 1);
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < lit));
    }

    if (steps) {
      const [top, h] = L.steps;
      setVar(steps, '--progress', clamp((vh * 0.6 - (top - y)) / h, 0, 1).toFixed(3));
      stepItems.forEach((s, i) => s.classList.toggle('is-active', L.stepTops[i] - y + 26 < vh * 0.6));
    }
  }

  const remeasure = () => { measure(); onScroll(); };
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);
  if (document.fonts) document.fonts.ready.then(remeasure);
  window.addEventListener('load', remeasure);

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', remeasure);
  onScroll();

  /* ==========================================================
     Reveal on scroll
     ========================================================== */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
      e.target.dispatchEvent(new CustomEvent('reveal'));
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach((el) => revealIO.observe(el));

  /* ==========================================================
     Card spotlight
     ========================================================== */
  if (finePointer) {
    $$('.card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  const fmt = (v, dec) => v.toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const easeOutExpo = (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));

  /* ==========================================================
     Showcase: code is typed on the left, the site builds on the right
     ========================================================== */
  const CODE = [
    { t: [['tag', '<header>']] },
    { t: [['', '  '], ['tag', '<strong>'], ['txt', 'Musterfirma'], ['tag', '</strong>']] },
    { t: [['', '  '], ['tag', '<nav>'], ['txt', 'Leistungen Kontakt'], ['tag', '</nav>']] },
    { t: [['tag', '</header>']], show: 'head' },
    { t: [] },
    { t: [['tag', '<section '], ['attr', 'class'], ['pun', '='], ['str', '"hero"'], ['tag', '>']] },
    { t: [['', '  '], ['tag', '<h1>'], ['txt', 'Handwerk mit Herz'], ['tag', '</h1>']], show: 'title' },
    { t: [['', '  '], ['tag', '<p>'], ['txt', 'Seit 1998 in Ihrer Region.'], ['tag', '</p>']], show: 'text' },
    { t: [['', '  '], ['tag', '<a '], ['attr', 'class'], ['pun', '='], ['str', '"button"'], ['tag', '>'], ['txt', 'Termin anfragen'], ['tag', '</a>']], show: 'btn' },
    { t: [['tag', '</section>']] },
    { t: [] },
    { t: [['tag', '<ul '], ['attr', 'class'], ['pun', '='], ['str', '"leistungen"'], ['tag', '>']] },
    { t: [['', '  '], ['tag', '<li>'], ['txt', 'Beratung'], ['tag', '</li>']], show: 'c1' },
    { t: [['', '  '], ['tag', '<li>'], ['txt', 'Planung'], ['tag', '</li>']], show: 'c2' },
    { t: [['', '  '], ['tag', '<li>'], ['txt', 'Umsetzung'], ['tag', '</li>']], show: 'c3' },
    { t: [['tag', '</ul>']] },
    { t: [] },
    { t: [['tag', '<style>']] },
    { t: [['', '  '], ['sel', '.hero'], ['pun', ' {']] },
    { t: [['', '    '], ['prop', 'background'], ['pun', ': '], ['val', '#1d2a4d'], ['pun', ';']], cls: 'has-bg' },
    { t: [['', '    '], ['prop', 'border-radius'], ['pun', ': '], ['val', '16px'], ['pun', ';']], cls: 'has-round' },
    { t: [['', '  '], ['pun', '}']] },
    { t: [['tag', '</style>']] },
  ];

  const esc = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // render the first `n` characters of a line, keeping the colour of each token
  function lineHTML(tokens, n) {
    let out = '';
    for (const [kind, text] of tokens) {
      if (n <= 0) break;
      const part = text.slice(0, n);
      n -= part.length;
      out += kind ? `<span class="t-${kind}">${esc(part)}</span>` : esc(part);
    }
    return out;
  }
  const lineLength = (tokens) => tokens.reduce((sum, [, text]) => sum + text.length, 0);

  const codeEl = $('[data-code]');
  const codeScroll = $('[data-code-scroll]');
  const preview = $('[data-preview]');

  function resetPreview() {
    $$('.pv-part', preview).forEach((el) => el.classList.remove('is-shown'));
    preview.classList.remove('has-bg', 'has-round');
  }
  function applyStep(line) {
    if (line.show) $(`[data-part="${line.show}"]`, preview).classList.add('is-shown');
    if (line.cls) preview.classList.add(line.cls);
  }

  if (frame && codeEl) {
    if (reduceMotion) {
      codeEl.innerHTML = CODE.map((l) => `<span class="ln">${lineHTML(l.t, Infinity)}</span>`).join('');
      CODE.forEach(applyStep);
    } else {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      let inView = false;
      const waitForView = async () => { while (!inView || document.hidden) await sleep(300); };

      async function typeAll() {
        codeEl.innerHTML = '';
        resetPreview();
        for (const line of CODE) {
          const el = document.createElement('span');
          el.className = 'ln is-current';
          codeEl.appendChild(el);
          const len = lineLength(line.t);
          for (let i = 0; i <= len; i++) {
            await waitForView();
            el.innerHTML = lineHTML(line.t, i) + '<span class="caret"></span>';
            codeScroll.scrollTop = codeScroll.scrollHeight;
            if (i < len) await sleep(18 + Math.random() * 38);
          }
          applyStep(line);
          await sleep(line.t.length ? 260 : 120);
          el.innerHTML = lineHTML(line.t, len);
          el.classList.remove('is-current');
        }
        const last = codeEl.lastElementChild;
        last.innerHTML += '<span class="caret"></span>';
      }

      (async () => {
        await waitForView();
        frame.classList.add('is-on');
        for (;;) {
          await typeAll();
          await sleep(5000);
          preview.classList.add('is-fading');
          await sleep(700);
          resetPreview();
          preview.classList.remove('is-fading');
        }
      })();

      new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; }, { threshold: 0.2 }).observe(frame);
    }
  }

  /* ==========================================================
     Before / after performance panel
     ========================================================== */
  const perf = $('.perf');
  const METRICS = {
    score:  { before: 38,  after: 97,  dec: 0 },
    lcp:    { before: 5.2, after: 1.1, dec: 1 },
    tbt:    { before: 840, after: 40,  dec: 0 },
    weight: { before: 6.8, after: 0.9, dec: 1 },
    req:    { before: 142, after: 31,  dec: 0 },
  };
  const CIRC = 2 * Math.PI * 52;
  let perfState = 'before';
  let perfAnim = null;

  function applyPerf(state, animate) {
    perfState = state;
    perf.classList.toggle('is-after', state === 'after');
    $$('.switch-btn', perf).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.state === state)));
    $('.gauge-fill', perf).style.strokeDashoffset = String(CIRC * (1 - METRICS.score[state] / 100));
    $$('.metrics li', perf).forEach((li) => {
      const m = METRICS[li.dataset.m];
      li.querySelector('.m-bar > span').style.setProperty('--w', `${Math.max((m[state] / m.before) * 100, 3)}%`);
    });

    const nodes = $$('[data-metric]', perf);
    const from = nodes.map((n) => parseFloat(n.textContent.replace('.', '').replace(',', '.')));
    const to = nodes.map((n) => METRICS[n.dataset.metric][state]);
    if (perfAnim) cancelAnimationFrame(perfAnim);
    if (!animate || reduceMotion) {
      nodes.forEach((n, i) => { n.textContent = fmt(to[i], METRICS[n.dataset.metric].dec); });
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const k = easeOutExpo(Math.min((now - start) / 1500, 1));
      nodes.forEach((n, i) => { n.textContent = fmt(lerp(from[i], to[i], k), METRICS[n.dataset.metric].dec); });
      if (k < 1) perfAnim = requestAnimationFrame(tick);
    };
    perfAnim = requestAnimationFrame(tick);
  }

  if (perf) {
    applyPerf('before', false);
    let userTouched = false;
    $$('.switch-btn', perf).forEach((b) => b.addEventListener('click', () => {
      userTouched = true;
      if (b.dataset.state !== perfState) applyPerf(b.dataset.state, true);
    }));
    perf.addEventListener('reveal', () => {
      setTimeout(() => { if (!userTouched) applyPerf('after', true); }, 900);
    });
  }

  /* ==========================================================
     Status board (demo data)
     ========================================================== */
  const status = $('.status');
  if (status) {
    $$('.s-bars', status).forEach((wrap, r) => {
      let html = '';
      for (let i = 0; i < 60; i++) {
        const warn = Math.random() < 0.035;
        const h = warn ? 55 + Math.random() * 20 : 80 + Math.random() * 20;
        html += `<i class="${warn ? 'warn' : ''}" style="height:${h.toFixed(0)}%;transition-delay:${i * 12 + r * 60}ms"></i>`;
      }
      wrap.innerHTML = html;
    });

    const msNodes = $$('.s-ms', status);
    const checkNode = $('[data-check]', status);
    let secs = 0;
    setInterval(() => {
      secs++;
      if (secs >= 15) {
        secs = 0;
        msNodes.forEach((n) => {
          const base = Number(n.dataset.base);
          n.textContent = `${Math.round(base + (Math.random() - 0.5) * base * 0.25)} ms`;
        });
      }
      checkNode.textContent = String(secs);
    }, 1000);
  }

  /* ==========================================================
     Contact form (sent via Web3Forms)
     ========================================================== */
  const form = $('.form');
  if (form) {
    const statusEl = $('.form-status', form);
    const submitBtn = $('button[type="submit"]', form);
    const submitLabel = $('.btn-label', submitBtn);
    const setStatus = (kind, text) => {
      statusEl.className = `form-status is-${kind}`;
      statusEl.textContent = text;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (submitBtn.disabled) return;
      const fields = ['name', 'email', 'message'].map((n) => form.elements[n]);
      let firstInvalid = null;
      fields.forEach((f) => {
        const ok = f.value.trim() !== '' && f.checkValidity();
        f.setAttribute('aria-invalid', String(!ok));
        if (!ok && !firstInvalid) firstInvalid = f;
      });
      if (firstInvalid) {
        setStatus('error', firstInvalid.name === 'email' && firstInvalid.value
          ? 'Bitte prüfen Sie Ihre E-Mail-Adresse.'
          : 'Bitte füllen Sie Name, E-Mail und Nachricht aus.');
        firstInvalid.focus();
        return;
      }

      const d = form.elements;
      const topics = $$('input[name="topic"]:checked', form).map((i) => i.value);
      const payload = {
        access_key: d.access_key.value,
        subject: topics.length ? `Neue Anfrage: ${topics.join(', ')}` : d.subject.value,
        from_name: d.from_name.value,
        botcheck: d.botcheck.checked,
        name: d.name.value.trim(),
        email: d.email.value.trim(),
        Unternehmen: d.company.value.trim() || 'nicht angegeben',
        Themen: topics.length ? topics.join(', ') : 'nicht ausgewählt',
        message: d.message.value.trim(),
      };

      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
      submitLabel.textContent = 'Wird gesendet';
      setStatus('info', '');

      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.message || `HTTP ${res.status}`);
        form.reset();
        setStatus('ok', 'Danke, Ihre Anfrage ist angekommen. Wir melden uns innerhalb eines Werktags.');
        submitLabel.textContent = 'Anfrage gesendet';
        setTimeout(() => { submitLabel.textContent = 'Anfrage senden'; }, 4000);
      } catch (err) {
        setStatus('error', 'Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut oder schreiben Sie direkt an kontakt@jk-unique.com.');
        submitLabel.textContent = 'Anfrage senden';
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
    });
    form.addEventListener('input', (e) => {
      if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) {
        e.target.setAttribute('aria-invalid', 'false');
      }
    });
  }

  const year = $('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
