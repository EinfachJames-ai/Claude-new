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
      float t = uTime * 0.075;

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
      col += vec3(0.060, 0.070, 0.115) * sheen * f * 2.4;
      col += vec3(0.30, 0.42, 0.95) * ridge * f * 0.34;

      // blue light from above, fades as the page scrolls
      float g = exp(-length((sp - vec2(0.0, 0.62)) * vec2(0.75, 1.5)) * 2.0);
      col += vec3(0.10, 0.20, 0.85) * g * 0.6 * (1.0 - 0.6 * uScroll);

      // soft light that follows the pointer
      vec2 mp = (uMouse - 0.5 * uRes) / uRes.y;
      col += vec3(0.12, 0.22, 0.75) * exp(-length(sp - mp) * 3.5) * 0.10;

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
      ['uRes', 'uTime', 'uMouse', 'uScroll', 'uOffset'].forEach((n) => { uni[n] = gl.getUniformLocation(prog, n); });
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
      d.map((p) => `<path class="hl-pulse" pathLength="100" d="${p}"/>`).join('');
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

  /* ==========================================================
     Dashboard: count-ups, live feed
     ========================================================== */
  const fmt = (v, dec) => v.toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const easeOutExpo = (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));

  function countUp(el, to, dec, dur) {
    if (reduceMotion) { el.textContent = fmt(to, dec); return; }
    const start = performance.now();
    const tick = (now) => {
      const k = easeOutExpo(Math.min((now - start) / dur, 1));
      el.textContent = fmt(to * k, dec);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  if (frame) {
    const counters = $$('[data-count]', frame);
    const feed = $('[data-feed]', frame);
    const EVENTS = [
      ['ok', 'Backup erstellt', 'shop.beispiel.de'],
      ['blue', 'Workflow ausgeführt', 'Angebot erstellt'],
      ['ok', 'Uptime-Check bestanden', 'api.beispiel.de'],
      ['blue', 'Workflow ausgeführt', 'Rechnung versenden'],
      ['ok', 'Sicherheits-Update', 'WordPress 6.x'],
      ['blue', 'Bilder optimiert', '48 Dateien, AVIF'],
      ['ok', 'SSL erneuert', 'beispiel.de'],
      ['blue', 'Cache geleert', 'nach Deployment'],
    ];
    let ev = 0;
    let started = false;

    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || started) return;
      started = true;
      frame.classList.add('is-on');
      counters.forEach((c) => countUp(c, parseFloat(c.dataset.count), Number(c.dataset.dec || 0), 2200));
      if (reduceMotion) return;

      const live = $('[data-live]', frame);
      let liveVal = Number(live.dataset.count);
      setTimeout(() => {
        setInterval(() => {
          liveVal += 1 + Math.floor(Math.random() * 3);
          live.textContent = fmt(liveVal, 0);
        }, 2600);
      }, 2400);

      setInterval(() => {
        const [kind, title, sub] = EVENTS[ev++ % EVENTS.length];
        const li = document.createElement('li');
        li.innerHTML = `<span class="feed-ico ${kind}"></span><span><b>${title}</b><small>${sub}</small></span><time>jetzt</time>`;
        feed.prepend(li);
        const items = $$('li', feed);
        items.forEach((item, i) => {
          if (i === 0) return;
          const t = $('time', item);
          if (t.textContent === 'jetzt') t.textContent = '1 min';
        });
        if (items.length > 6) items[items.length - 1].remove();
      }, 3400);
    }, { threshold: 0.25 });
    io.observe(frame);
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
     Contact form (opens the visitor's mail program)
     ========================================================== */
  const form = $('.form');
  if (form) {
    const statusEl = $('.form-status', form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = ['name', 'email', 'message'].map((n) => form.elements[n]);
      let firstInvalid = null;
      fields.forEach((f) => {
        const ok = f.value.trim() !== '' && f.checkValidity();
        f.setAttribute('aria-invalid', String(!ok));
        if (!ok && !firstInvalid) firstInvalid = f;
      });
      if (firstInvalid) {
        statusEl.className = 'form-status is-error';
        statusEl.textContent = firstInvalid.name === 'email' && firstInvalid.value
          ? 'Bitte prüfen Sie Ihre E-Mail-Adresse.'
          : 'Bitte füllen Sie Name, E-Mail und Nachricht aus.';
        firstInvalid.focus();
        return;
      }
      const topics = $$('input[name="topic"]:checked', form).map((i) => i.value);
      const d = form.elements;
      const subject = `Anfrage${topics.length ? ': ' + topics.join(', ') : ''}`;
      const lines = [d.message.value.trim(), '', `Name: ${d.name.value.trim()}`];
      if (d.company.value.trim()) lines.push(`Unternehmen: ${d.company.value.trim()}`);
      lines.push(`E-Mail: ${d.email.value.trim()}`);
      window.location.href = `mailto:kontakt@jk-unique.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
      statusEl.className = 'form-status is-ok';
      statusEl.textContent = 'Ihr E-Mail-Programm wurde mit der Anfrage geöffnet. Bitte senden Sie die E-Mail dort ab.';
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
