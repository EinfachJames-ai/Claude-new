(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ==========================================================
     Perlin noise (improved noise, 3D)
     ========================================================== */
  const perm = new Uint8Array(512);
  {
    const p = Array.from({ length: 256 }, (_, i) => i);
    let seed = 1337;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (h, x, y, z) => {
    h &= 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };
  function noise(x, y, z) {
    const fx = Math.floor(x), fy = Math.floor(y), fz = Math.floor(z);
    const X = fx & 255, Y = fy & 255, Z = fz & 255;
    x -= fx; y -= fy; z -= fz;
    const u = fade(x), v = fade(y), w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
           lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
           lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v),
      w);
  }

  /* ==========================================================
     Contour landscape with gradient descent
     ========================================================== */
  const canvas = $('.landscape');
  const ctx = canvas.getContext('2d');
  const readout = {
    iter: $('[data-ro="iter"]'),
    value: $('[data-ro="value"]'),
    status: $('[data-ro="status"]'),
  };

  const SCALE = 1 / 440;
  const LEVEL_MIN = -0.95, LEVEL_MAX = 0.95, LEVEL_STEP = 0.075;
  const LEVELS = [];
  for (let l = LEVEL_MIN; l <= LEVEL_MAX + 1e-6; l += LEVEL_STEP) LEVELS.push(l);

  let W = 0, H = 0, dpr = 1, cell = 16, cols = 0, rows = 0, grid = null;
  let t = 0;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, strength: 0, target: 0 };

  function field(x, y) {
    let v = noise(x * SCALE, y * SCALE, t) +
            0.45 * noise(x * SCALE * 2.1 + 31.7, y * SCALE * 2.1 - 12.3, t * 1.4 + 5);
    // gentle bias so the deepest valleys tend to sit right of the headline
    v += 0.18 * ((x / W) * -1 + 0.5);
    if (mouse.strength > 0.001) {
      const dx = x - mouse.x, dy = y - mouse.y;
      v -= 0.5 * mouse.strength * Math.exp(-(dx * dx + dy * dy) / 52000);
    }
    return v;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = W < 700 ? 20 : 16;
    cols = Math.ceil(W / cell) + 1;
    rows = Math.ceil(H / cell) + 1;
    grid = new Float32Array(cols * rows);
  }

  function sampleGrid() {
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        grid[j * cols + i] = field(i * cell, j * cell);
      }
    }
  }

  // Marching squares: segments for one cell and one level
  function addSegments(path, L, x0, y0, a, b, c, d) {
    const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
    if (idx === 0 || idx === 15) return;
    const s = cell;
    const top = () => [x0 + s * (L - a) / (b - a), y0];
    const right = () => [x0 + s, y0 + s * (L - b) / (c - b)];
    const bottom = () => [x0 + s * (L - d) / (c - d), y0 + s];
    const left = () => [x0, y0 + s * (L - a) / (d - a)];
    const seg = (p, q) => { path.moveTo(p[0], p[1]); path.lineTo(q[0], q[1]); };
    switch (idx) {
      case 1: case 14: seg(left(), bottom()); break;
      case 2: case 13: seg(bottom(), right()); break;
      case 3: case 12: seg(left(), right()); break;
      case 4: case 11: seg(top(), right()); break;
      case 6: case 9: seg(top(), bottom()); break;
      case 7: case 8: seg(top(), left()); break;
      case 5: seg(top(), left()); seg(bottom(), right()); break;
      case 10: seg(top(), right()); seg(left(), bottom()); break;
    }
  }

  /* Descent particle */
  const P = { x: 0, y: 0, vx: 0, vy: 0, iter: 0, still: 0, done: 0, trail: [], value: 0 };

  function spawn() {
    let best = null;
    for (let k = 0; k < 14; k++) {
      const x = W * (0.3 + Math.random() * 0.65);
      const y = H * (0.08 + Math.random() * 0.8);
      const v = field(x, y);
      if (!best || v > best.v) best = { x, y, v };
    }
    Object.assign(P, { x: best.x, y: best.y, vx: 0, vy: 0, iter: 0, still: 0, done: 0, trail: [] });
  }

  function stepParticle() {
    if (P.done > 0) {
      P.done++;
      if (P.done > 110) spawn();
      return;
    }
    const h = 3;
    const gx = (field(P.x + h, P.y) - field(P.x - h, P.y)) / (2 * h);
    const gy = (field(P.x, P.y + h) - field(P.x, P.y - h)) / (2 * h);
    P.vx = P.vx * 0.9 - gx * 900;
    P.vy = P.vy * 0.9 - gy * 900;
    const sp = Math.hypot(P.vx, P.vy);
    const max = 3.2;
    if (sp > max) { P.vx *= max / sp; P.vy *= max / sp; }
    P.x += P.vx;
    P.y += P.vy;
    P.iter++;
    P.value = field(P.x, P.y);
    P.trail.push(P.x, P.y);
    if (P.trail.length > 360) P.trail.splice(0, 2);
    P.still = sp < 0.09 ? P.still + 1 : 0;
    const outside = P.x < -40 || P.y < -40 || P.x > W + 40 || P.y > H + 40;
    if (outside) spawn();
    else if (P.still > 45 || P.iter > 1400) P.done = 1;
  }

  function drawParticle() {
    const tr = P.trail;
    const n = tr.length / 2;
    if (n > 1) {
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.6;
      for (let i = 1; i < n; i++) {
        const a = i / n;
        ctx.strokeStyle = `rgba(255, 182, 72, ${a * 0.85})`;
        ctx.beginPath();
        ctx.moveTo(tr[(i - 1) * 2], tr[(i - 1) * 2 + 1]);
        ctx.lineTo(tr[i * 2], tr[i * 2 + 1]);
        ctx.stroke();
      }
    }
    const glow = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, 28);
    glow.addColorStop(0, 'rgba(255, 182, 72, 0.55)');
    glow.addColorStop(1, 'rgba(255, 182, 72, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(P.x, P.y, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFB648';
    ctx.beginPath();
    ctx.arc(P.x, P.y, 3.6, 0, Math.PI * 2);
    ctx.fill();

    if (P.done > 0) {
      const k = Math.min(P.done / 60, 1);
      ctx.strokeStyle = `rgba(99, 224, 182, ${0.8 * (1 - k)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(P.x, P.y, 6 + k * 40, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function draw(withParticle) {
    sampleGrid();
    ctx.clearRect(0, 0, W, H);

    const minor = new Path2D();
    const major = new Path2D();
    const near = new Path2D();
    let nearLevel = null;
    if (withParticle) {
      nearLevel = LEVELS.reduce((best, l) => Math.abs(l - P.value) < Math.abs(best - P.value) ? l : best, LEVELS[0]);
    }

    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = grid[j * cols + i];
        const b = grid[j * cols + i + 1];
        const c = grid[(j + 1) * cols + i + 1];
        const d = grid[(j + 1) * cols + i];
        const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
        const x0 = i * cell, y0 = j * cell;
        for (let k = 0; k < LEVELS.length; k++) {
          const L = LEVELS[k];
          if (L < lo || L > hi) continue;
          const target = L === nearLevel ? near : (k % 4 === 0 ? major : minor);
          addSegments(target, L, x0, y0, a, b, c, d);
        }
      }
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(141, 162, 184, 0.13)';
    ctx.stroke(minor);
    ctx.strokeStyle = 'rgba(141, 162, 184, 0.3)';
    ctx.stroke(major);
    if (withParticle) {
      ctx.strokeStyle = 'rgba(255, 182, 72, 0.32)';
      ctx.lineWidth = 1.2;
      ctx.stroke(near);
      drawParticle();
    }
  }

  function updateReadout() {
    readout.iter.textContent = String(P.iter).padStart(4, '0');
    const v = P.value;
    readout.value.textContent = (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(3);
    readout.status.textContent = P.done > 0 ? 'Minimum' : 'sucht';
    readout.status.style.color = P.done > 0 ? 'var(--mint)' : '';
  }

  let last = 0, frame = 0, running = true;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!running) return;
    const dt = now - last;
    if (dt < 32) return; // ~30 fps is plenty for slow motion
    last = now;
    t += Math.min(dt, 100) * 0.000028;

    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    mouse.strength += (mouse.target - mouse.strength) * 0.03;

    stepParticle();
    stepParticle();
    draw(true);
    if (++frame % 4 === 0) updateReadout();
  }

  resize();
  if (reduceMotion) {
    t = 3.7;
    draw(false);
    readout.iter.textContent = '–';
    readout.value.textContent = '–';
    readout.status.textContent = 'pausiert';
  } else {
    spawn();
    requestAnimationFrame(loop);
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      if (reduceMotion) draw(false);
      else if (P.x > W || P.y > H) spawn();
    }, 120);
  });

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
  });

  if (finePointer && !reduceMotion) {
    window.addEventListener('pointermove', (e) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
      if (mouse.target === 0) { mouse.x = e.clientX; mouse.y = e.clientY; }
      mouse.target = 1;
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { mouse.target = 0; });
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
  const hero = $('.hero');
  const steps = $('[data-steps]');
  const stepItems = $$('.step', steps);
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
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (!menu.classList.contains('is-open')) {
      if (goingDown && y > vh * 0.6) nav.classList.add('is-hidden');
      else if (goingUp) nav.classList.remove('is-hidden');
    }
    lastY = y;

    document.body.classList.toggle('past-hero', y > hero.offsetHeight * 0.55);

    // current section in nav
    let current = null;
    sections.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (r.top < vh * 0.4 && r.bottom > vh * 0.4) current = navLinks[i];
    });
    navLinks.forEach((a) => a.classList.toggle('is-current', a === current));

    // manifesto: light up words as the paragraph moves through the viewport
    if (words.length && !reduceMotion) {
      const r = manifesto.getBoundingClientRect();
      const p = Math.min(Math.max((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0), 1);
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < lit));
    }

    // process timeline progress
    if (steps) {
      const r = steps.getBoundingClientRect();
      const p = Math.min(Math.max((vh * 0.6 - r.top) / r.height, 0), 1);
      steps.style.setProperty('--progress', p.toFixed(4));
      stepItems.forEach((s) => {
        const sr = s.getBoundingClientRect();
        s.classList.toggle('is-active', sr.top + 28 < vh * 0.6);
      });
    }
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
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
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach((el) => revealIO.observe(el));

  /* ==========================================================
     Services accordion
     ========================================================== */
  $$('.service-toggle').forEach((btn) => {
    const body = document.getElementById(btn.getAttribute('aria-controls'));
    if (btn.getAttribute('aria-expanded') === 'true') body.classList.add('is-open');
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      body.classList.toggle('is-open', open);
    });
  });

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
  const fmt = (v, dec) => v.toLocaleString('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const easeOutExpo = (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));
  let perfState = 'before';
  let perfAnim = null;

  function applyPerf(state, animate) {
    perfState = state;
    perf.classList.toggle('is-after', state === 'after');
    $$('.switch-btn', perf).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.state === state)));

    const score = METRICS.score[state];
    $('.gauge-fill', perf).style.strokeDashoffset = String(CIRC * (1 - score / 100));
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
    const dur = 1500;
    const tick = (now) => {
      const k = easeOutExpo(Math.min((now - start) / dur, 1));
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
        const delay = (i * 12 + r * 60);
        html += `<i class="${warn ? 'warn' : ''}" style="height:${h.toFixed(0)}%;margin-top:auto;transition-delay:${delay}ms"></i>`;
      }
      wrap.innerHTML = html;
      wrap.style.alignItems = 'end';
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
      const body = [
        d.message.value.trim(),
        '',
        `Name: ${d.name.value.trim()}`,
        d.company.value.trim() ? `Unternehmen: ${d.company.value.trim()}` : '',
        `E-Mail: ${d.email.value.trim()}`,
      ].filter((l, i) => l !== '' || i === 1).join('\n');
      window.location.href = `mailto:kontakt@jk-unique.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
