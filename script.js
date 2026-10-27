(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp = (a, b, t) => a + t * (b - a);

  /* ==========================================================
     Animated background: slow silk waves (WebGL)
     ========================================================== */
  const FRAG = `
    precision mediump float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uScroll;
    uniform float uOffset;
    uniform vec3 uAccent;
    uniform vec3 uDeep;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      // the pattern travels with the page (slight parallax) instead of standing still
      vec2 sp = p;
      p.y -= uOffset * 0.75;
      float t = uTime * 0.05;

      // domain-warped flow field
      vec2 q = vec2(fbm(p * 0.9 + vec2(0.0, t)), fbm(p * 0.9 + vec2(5.2, 1.3) - t));
      vec2 r = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2) + 0.6 * t),
                    fbm(p + 2.6 * q + vec2(8.3, 2.8) - 0.4 * t));
      float f = fbm(p * 0.8 + 1.8 * r);

      // silk: long folded bands with thin bright ridges
      float s = sin(p.x * 1.8 - p.y * 1.1 + f * 7.0 + t * 1.5);
      float ridge = pow(1.0 - abs(s), 5.0);
      float sheen = smoothstep(0.1, 1.0, s * 0.5 + 0.5);

      vec3 col = vec3(0.010, 0.012, 0.024);
      col += mix(vec3(0.060, 0.066, 0.085), uAccent * 0.14, 0.4) * sheen * f * 2.4;
      col += uAccent * ridge * f * 0.34;

      // light from above in the colour of the current area
      float g = exp(-length((sp - vec2(0.0, 0.62)) * vec2(0.75, 1.5)) * 2.0);
      col += uDeep * g * 0.62 * (1.0 - 0.35 * uScroll);

      // soft light that follows the pointer
      vec2 mp = (uMouse - 0.5 * uRes) / uRes.y;
      col += uDeep * exp(-length(sp - mp) * 3.5) * 0.11;

      // vignette + dither
      col *= 1.0 - 0.6 * pow(length(uv - 0.5) * 1.2, 2.0);
      col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.012;
      gl_FragColor = vec4(col, 1.0);
    }
  `;
  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const canvas = $('.silk');
  let RES_SCALE = 0.55;
  let gl = null, uni = {};
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollMix = 0;

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
  const tint = { accent: oklabToRgb(colorCur.accent), deep: oklabToRgb(colorCur.deep) };
  const rootStyle = document.documentElement.style;

  function applyColors() {
    const rgb = {};
    KEYS.forEach((k) => { rgb[k] = oklabToRgb(colorCur[k]); });
    tint.accent = rgb.accent;
    tint.deep = rgb.deep;
    const css = (c) => `rgb(${c.map((v) => Math.round(v * 2550) / 10).join(' ')})`;
    rootStyle.setProperty('--accent', css(rgb.accent));
    rootStyle.setProperty('--accent-hi', css(rgb.hi));
    rootStyle.setProperty('--accent-deep', css(rgb.deep));
  }

  // ease the current colour towards the scroll-derived target, frame-rate independent
  let colorPrev = 0;
  function colorLoop(now) {
    requestAnimationFrame(colorLoop);
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
    if (delta > 0.0004) applyColors();
  }

  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch (e) { gl = null; }

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  if (gl) {
    try {
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['uRes', 'uTime', 'uMouse', 'uScroll', 'uOffset', 'uAccent', 'uDeep'].forEach((n) => { uni[n] = gl.getUniformLocation(prog, n); });
    } catch (e) {
      gl = null;
    }
  }

  function sizeCanvas() {
    const w = Math.max(1, Math.round(window.innerWidth * RES_SCALE));
    const h = Math.max(1, Math.round(window.innerHeight * RES_SCALE));
    canvas.width = w;
    canvas.height = h;
    if (gl) gl.viewport(0, 0, w, h);
    pointer.tx = pointer.x = w * 0.5;
    pointer.ty = pointer.y = h * 0.75;
  }

  function render(time) {
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    gl.uniform2f(uni.uRes, canvas.width, canvas.height);
    gl.uniform1f(uni.uTime, 40 + time / 1000);
    gl.uniform2f(uni.uMouse, pointer.x, pointer.y);
    gl.uniform1f(uni.uScroll, scrollMix);
    gl.uniform1f(uni.uOffset, window.scrollY / window.innerHeight);
    gl.uniform3fv(uni.uAccent, tint.accent);
    gl.uniform3fv(uni.uDeep, tint.deep);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (gl) {
    sizeCanvas();
    let visible = true;
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; });
    if (reduceMotion) {
      render(0);
    } else {
      // drop internal resolution on slow devices so motion stays fluid
      let prev = 0, slow = 0, samples = 0;
      const loop = (now) => {
        requestAnimationFrame(loop);
        if (!visible) { prev = 0; return; }
        if (prev && RES_SCALE > 0.3) {
          samples++;
          if (now - prev > 26) slow++;
          if (samples === 90) {
            if (slow > 45) { RES_SCALE = Math.max(0.3, RES_SCALE - 0.1); sizeCanvas(); }
            samples = slow = 0;
          }
        }
        prev = now;
        render(now);
      };
      requestAnimationFrame(loop);
    }
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { sizeCanvas(); if (reduceMotion) render(0); }, 120);
    });
    if (finePointer && !reduceMotion) {
      window.addEventListener('pointermove', (e) => {
        pointer.tx = e.clientX * RES_SCALE;
        pointer.ty = (window.innerHeight - e.clientY) * RES_SCALE;
      }, { passive: true });
    }
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
    manifesto.setAttribute('aria-label', text);
    manifesto.innerHTML = text.split(/\s+/)
      .map((w) => `<span class="w" aria-hidden="true">${w}</span>`)
      .join(' ');
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
  // colour for the current scroll position: solid inside a section,
  // blended across roughly 80% of a screen height around each border
  function updateColorTarget(y, vh) {
    const probe = y + vh * 0.5;
    const zone = vh * 0.4;
    let target = LAB[themed[0].dataset.theme];
    let mixed = KEYS.reduce((o, k) => { o[k] = target[k]; return o; }, {});
    for (let i = 1; i < themed.length; i++) {
      const prev = themed[i - 1].dataset.theme, next = themed[i].dataset.theme;
      if (prev === next) continue;
      const border = themed[i].getBoundingClientRect().top + y;
      const w = smoother(border - zone, border + zone, probe);
      if (w <= 0) break;
      KEYS.forEach((k) => { mixed[k] = mixLab(mixed[k], LAB[next][k], w); });
    }
    colorTarget = mixed;
    if (reduceMotion) {
      KEYS.forEach((k) => { colorCur[k] = mixed[k].slice(); });
      applyColors();
      if (gl) render(0);
    }
  }
  if (!reduceMotion) requestAnimationFrame(colorLoop);

  function onScroll() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;

    nav.classList.toggle('is-solid', y > 24);
    if (!menu.classList.contains('is-open')) {
      if (y > lastY + 4 && y > vh * 0.8) nav.classList.add('is-hidden');
      else if (y < lastY - 4) nav.classList.remove('is-hidden');
    }
    lastY = y;
    scrollMix = clamp(y / vh, 0, 1);

    const max = document.documentElement.scrollHeight - vh;
    progressBar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : '0');

    updateColorTarget(y, vh);

    let current = null;
    sections.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (r.top < vh * 0.4 && r.bottom > vh * 0.4) current = navLinks[i];
    });
    navLinks.forEach((a) => a.classList.toggle('is-current', a === current));

    if (frame && !reduceMotion) {
      const r = frame.getBoundingClientRect();
      const tilt = clamp((r.top - vh * 0.12) / (vh * 0.7), 0, 1);
      frame.style.setProperty('--tilt', tilt.toFixed(4));
    }

    if (words.length && !reduceMotion) {
      const r = manifesto.getBoundingClientRect();
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < lit));
    }

    if (steps) {
      const r = steps.getBoundingClientRect();
      steps.style.setProperty('--progress', clamp((vh * 0.6 - r.top) / r.height, 0, 1).toFixed(4));
      stepItems.forEach((s) => s.classList.toggle('is-active', s.getBoundingClientRect().top + 26 < vh * 0.6));
    }
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
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
