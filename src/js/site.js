/* ==========================================================================
   Site behaviour
   1. Theme toggle          4. Floating DNA / RNA / protein motifs
   2. Header + progress     5. Hero double helix (canvas)
   3. Reveal on scroll
   ========================================================================== */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const themeListeners = [];

  /* 1. Theme ------------------------------------------------------------- */
  const toggle = document.querySelector('[data-theme-toggle]');
  const setTheme = (theme, persist) => {
    root.dataset.theme = theme;
    if (persist) { try { localStorage.setItem('theme', theme); } catch (e) {} }
    toggle?.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    themeListeners.forEach((fn) => fn());
  };
  toggle?.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', (e) => {
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch (err) {}
    if (!saved) setTheme(e.matches ? 'dark' : 'light', false);
  });
  setTheme(root.dataset.theme || 'light', false);

  /* 2. Header border + reading progress ---------------------------------- */
  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('[data-progress]');
  const scrollHandlers = [];
  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 8);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty('--progress', max > 0 ? Math.min(1, y / max) : 0);
    }
    scrollHandlers.forEach((fn) => fn(y));
  };
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });


  /* 2b. Home page: highlight the menu item for the section in view -------- */
  const navRoot = document.querySelector('[data-nav-root]');
  const spyMap = { research: 'research', talks: 'talks', notes: 'notes' };
  const spySections = Object.keys(spyMap).map((id) => document.getElementById(id)).filter(Boolean);
  if (navRoot && spySections.length) {
    const setActive = (key) => {
      navRoot.querySelectorAll('a[data-nav]').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === key));
      navRoot.classList.toggle('is-spying', Boolean(key));
    };
    scrollHandlers.push(() => {
      const line = window.innerHeight * 0.35;
      let current = null;
      spySections.forEach((sec) => {
        const r = sec.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) current = spyMap[sec.id];
      });
      setActive(current);
    });
  }

  /* 3. Reveal on scroll -------------------------------------------------- */
  const reveals = document.querySelectorAll('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    root.classList.add('js');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });
    reveals.forEach((el) => io.observe(el));
  }

  /* 4. Floating molecular motifs ----------------------------------------- */
  const f = (n) => Math.round(n * 10) / 10;
  const NT = { A: 'var(--nt-a)', C: 'var(--nt-c)', G: 'var(--nt-g)', T: 'var(--nt-t)', U: 'var(--nt-u)' };
  const PAIR = { A: 'T', T: 'A', G: 'C', C: 'G', U: 'A' };
  const SEQ = 'GATTACAGCGTACCGGTAATCGCTAGGCATTCGA';

  const motifs = {
    // B-form DNA ladder
    dna(h = 300) {
      const R = 22, cx = 30, turns = h / 150, off = Math.PI * 0.78;
      let a = '', b = '';
      for (let y = 0; y <= h; y += 3) {
        const t = (y / h) * turns * Math.PI * 2;
        a += `${y ? 'L' : 'M'}${f(cx + R * Math.sin(t))} ${y}`;
        b += `${y ? 'L' : 'M'}${f(cx + R * Math.sin(t + off))} ${y}`;
      }
      let rungs = '';
      for (let i = 1, y = 10; y < h; i++, y += 14) {
        const t = (y / h) * turns * Math.PI * 2;
        const x1 = cx + R * Math.sin(t), x2 = cx + R * Math.sin(t + off), m = (x1 + x2) / 2;
        const base = SEQ[i % SEQ.length];
        rungs += `<path d="M${f(x1)} ${y}L${f(m)} ${y}" class="bb" style="stroke:${NT[base]}"/>`
               + `<path d="M${f(m)} ${y}L${f(x2)} ${y}" class="bb" style="stroke:${NT[PAIR[base]]}"/>`;
      }
      return { w: 60, h, body: `${rungs}<path d="${a}" class="bb"/><path d="${b}" class="bb"/>` };
    },

    // RNA stem-loop (hairpin)
    hairpin() {
      const pairs = [['G', 'C'], ['C', 'G'], ['A', 'U'], ['G', 'C'], ['U', 'A'], ['C', 'G']];
      const gap = 16, x1 = 30, x2 = 54, top = 70, r = 20, cx = 42, cy = top - Math.sqrt(r * r - 144);
      let body = '';
      const yBottom = top + (pairs.length - 1) * gap;
      body += `<path class="bb" d="M${x1 - 18} ${yBottom + 34} Q ${x1} ${yBottom + 24} ${x1} ${yBottom} L${x1} ${top} A ${r} ${r} 0 1 1 ${x2} ${top} L${x2} ${yBottom} Q ${x2} ${yBottom + 22} ${x2 + 22} ${yBottom + 30}"/>`;
      pairs.forEach(([p, q], i) => {
        const y = top + i * gap;
        body += `<path class="thin" d="M${x1 + 4} ${y}H${x2 - 4}" stroke-dasharray="2 3"/>`;
        body += `<circle cx="${x1}" cy="${y}" r="3.2" class="n${p.toLowerCase()}"/><circle cx="${x2}" cy="${y}" r="3.2" class="n${q.toLowerCase()}"/>`;
      });
      const loop = 'GAAAUA';
      for (let i = 0; i < loop.length; i++) {
        const ang = Math.PI * (1.15 + (i + 0.5) * (0.7 * 2 / loop.length)) ;
        body += `<circle cx="${f(cx + r * Math.cos(ang))}" cy="${f(cy + r * Math.sin(ang))}" r="3" class="n${loop[i].toLowerCase()}"/>`;
      }
      body += `<text class="lbl" x="${x1 - 30}" y="${yBottom + 40}">5′</text><text class="lbl" x="${x2 + 22}" y="${yBottom + 42}">3′</text>`;
      return { w: 90, h: yBottom + 46, body };
    },

    // Protein α-helix, side view
    alpha(len = 7) {
      let d = '';
      const pitch = 34, r = 22;
      for (let i = 0; i <= len * 60; i++) {
        const t = (i / 60) * Math.PI * 2;
        const x = 20 + (t / (Math.PI * 2)) * pitch + 12 * Math.cos(t);
        const y = 30 + r * Math.sin(t);
        d += `${i ? 'L' : 'M'}${f(x)} ${f(y)}`;
      }
      return { w: 40 + len * pitch, h: 60, body: `<path d="${d}" class="bb"/>` };
    },

    // Antiparallel β-sheet
    beta() {
      let body = '';
      const L = 150, hh = 12, gap = 26;
      for (let i = 0; i < 3; i++) {
        const y = 10 + i * gap, dir = i % 2 ? -1 : 1;
        const x0 = dir > 0 ? 0 : L, x1 = dir > 0 ? L - 22 : 22, tip = dir > 0 ? L : 0;
        body += `<path class="bb" d="M${x0} ${y} L${x1} ${y} L${x1} ${y - 6} L${tip} ${y + hh / 2} L${x1} ${y + hh + 6} L${x1} ${y + hh} L${x0} ${y + hh} Z"/>`;
        if (i < 2) {
          for (let x = 18; x < L - 18; x += 22) body += `<path class="thin" d="M${x} ${y + hh + 2}V${y + gap - 2}" stroke-dasharray="1.5 3"/>`;
        }
      }
      return { w: L, h: 10 + 2 * gap + hh + 10, body };
    },

    // Adenine (purine) ring, skeletal
    adenine() {
      const P = (a, r = 20, cx = 0, cy = 0) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      const hex = [-90, -30, 30, 90, 150, 210].map((d) => P((d * Math.PI) / 180));
      const pcx = 17.32 + 13.76, pr = 17.01;
      const pent = [144, 72, 0, -72, -144].map((d) => P((d * Math.PI) / 180, pr, pcx, 0));
      const poly = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
      const inner = (p, q, c, k = 0.78) => {
        const s = (pt) => [c[0] + (pt[0] - c[0]) * k, c[1] + (pt[1] - c[1]) * k];
        const [a, b] = [s(p), s(q)];
        return `<path class="thin" d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}"/>`;
      };
      let body = `<path class="bb" d="${poly(hex)}"/><path class="bb" d="${poly(pent)}"/>`;
      body += inner(hex[3], hex[4], [0, 0]) + inner(hex[5], hex[0], [0, 0]) + inner(pent[1], pent[2], [pcx, 0]);
      body += `<path class="bb" d="M0 -20V-36"/><text class="lbl" x="-9" y="-40">NH₂</text>`;
      body += `<text class="lbl" x="-28" y="13">N</text><text class="lbl" x="-3" y="31">N</text>`;
      body += `<text class="lbl" x="${f(pent[1][0] - 3)}" y="${f(pent[1][1] - 4)}">N</text><text class="lbl" x="${f(pent[3][0] - 3)}" y="${f(pent[3][1] + 11)}">N</text>`;
      return { w: 70, h: 80, body: `<g transform="translate(26 44)">${body}</g>` };
    },

    // Polypeptide chain (beads on a string)
    peptide() {
      const n = 9, cls = ['na', 'nc', 'ng', 'nu', 'nc', 'na', 'ng', 'nu', 'na'];
      let path = '', beads = '';
      for (let i = 0; i < n; i++) {
        const x = 8 + i * 17, y = 20 + (i % 2 ? -9 : 9) + Math.sin(i * 0.9) * 6;
        path += `${i ? 'L' : 'M'}${f(x)} ${f(y)}`;
        beads += `<circle cx="${f(x)}" cy="${f(y)}" r="5" class="${cls[i]}"/>`;
      }
      return { w: 8 + n * 17, h: 44, body: `<path d="${path}" class="bb"/>${beads}` };
    },

    // Sequence fragment
    seq(text = '5′-AUG GCC AAC UGA-3′') {
      return { w: text.length * 10, h: 20, body: `<text class="seq" x="0" y="14">${text}</text>` };
    },
  };

  const layer = document.querySelector('[data-motifs]');
  const buildMotifs = () => {
    if (!layer) return;
    layer.textContent = '';
    const small = window.innerWidth < 720;
    const quiet = document.body.classList.contains('page--notes');

    // x / y are % of the viewport; depth controls scroll parallax.
    let slots = [
      { m: 'dna', a: [320], x: 3, y: 8, s: 1, rot: -8, depth: 0.08 },
      { m: 'hairpin', x: 88, y: 12, s: 1.1, rot: 10, depth: 0.14 },
      { m: 'alpha', x: 80, y: 62, s: 0.9, rot: -18, depth: 0.05 },
      { m: 'beta', x: 2, y: 66, s: 0.85, rot: 12, depth: 0.11 },
      { m: 'adenine', x: 92, y: 40, s: 1.2, rot: 0, depth: 0.18 },
      { m: 'peptide', x: 8, y: 44, s: 1, rot: 24, depth: 0.12 },
      { m: 'seq', a: ['5′-AUG GCC AAC UGA-3′'], x: 70, y: 88, s: 1, rot: -4, depth: 0.06 },
      { m: 'dna', a: [220], x: 95, y: 74, s: 0.8, rot: 14, depth: 0.16 },
      { m: 'seq', a: ['3′-TAC CGG TTG ACT-5′'], x: 4, y: 90, s: 0.9, rot: 6, depth: 0.09 },
    ];
    if (quiet) slots = slots.filter((_, i) => [0, 1, 2, 3, 4].includes(i));
    if (small) slots = slots.filter((_, i) => [1, 3, 4].includes(i)).map((s) => ({ ...s, s: s.s * 0.7 }));

    slots.forEach((slot, i) => {
      const { w, h, body } = motifs[slot.m](...(slot.a || []));
      const wrap = document.createElement('div');
      wrap.className = 'motif-wrap';
      wrap.dataset.depth = slot.depth;
      const left = slot.x > 50 ? `calc(${slot.x}% - ${w * slot.s}px)` : `${slot.x}%`;
      wrap.style.cssText = `left:${left};top:${slot.y}%;`;
      wrap.innerHTML =
        `<div class="motif" style="--rot:${slot.rot}deg;--dur:${26 + (i % 4) * 7}s;--delay:-${i * 3}s;--dx:${i % 2 ? -14 : 14}px;--dy:${i % 3 ? -22 : 18}px;--spin:${i % 2 ? -5 : 5}deg">` +
        `<svg width="${f(w * slot.s)}" height="${f(h * slot.s)}" viewBox="0 0 ${w} ${h}">${body}</svg></div>`;
      layer.appendChild(wrap);
    });
  };
  buildMotifs();

  const wraps = () => layer ? layer.querySelectorAll('.motif-wrap') : [];
  if (!reduceMotion) {
    scrollHandlers.push((y) => {
      wraps().forEach((el) => { el.style.transform = `translate3d(0, ${f(-y * el.dataset.depth)}px, 0)`; });
    });
  }
  let lastSmall = window.innerWidth < 720;
  window.addEventListener('resize', () => {
    const small = window.innerWidth < 720;
    if (small !== lastSmall) { lastSmall = small; buildMotifs(); onScroll(); }
  });

  /* 5. Hero double helix ------------------------------------------------- */
  const canvas = document.querySelector('[data-helix]');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, colors = {}, running = false, visible = true, last = 0, phase = 0, speed = 1, target = 1;
    const GROOVE = Math.PI * 0.78;
    const pairs = Array.from({ length: 200 }, (_, i) => SEQ[(i * 7 + (i >> 2)) % SEQ.length]);

    const readColors = () => {
      colors = {
        line: css('--accent'), faint: css('--text-faint'),
        A: css('--nt-a'), C: css('--nt-c'), G: css('--nt-g'), T: css('--nt-t'),
      };
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const vertical = H >= W;
      const L = vertical ? H : W;          // length along the axis
      const S = vertical ? W : H;          // width across the axis
      const R = Math.min(S * 0.32, 78);
      const pitch = R * 4.6;               // length of one full turn
      const step = pitch / 10.5;           // ~10.5 base pairs per turn, like B-DNA
      const mid = S / 2;
      const pt = (along, across) => (vertical ? [mid + across, along] : [along, mid + across]);
      const items = [];

      // Backbones
      for (let s = -step; s < L + step; s += 4) {
        for (let k = 0; k < 2; k++) {
          const a0 = (s / pitch) * Math.PI * 2 + phase + k * GROOVE;
          const a1 = ((s + 4) / pitch) * Math.PI * 2 + phase + k * GROOVE;
          const z = (Math.cos(a0) + Math.cos(a1)) / 2;
          items.push({ z, type: 'bb', p: pt(s, R * Math.sin(a0)), q: pt(s + 4, R * Math.sin(a1)) });
        }
      }
      // Base pairs
      let idx = 0;
      for (let s = 0; s < L; s += step, idx++) {
        const a = (s / pitch) * Math.PI * 2 + phase;
        const x1 = R * Math.sin(a), x2 = R * Math.sin(a + GROOVE);
        const z1 = Math.cos(a), z2 = Math.cos(a + GROOVE);
        const base = pairs[idx % pairs.length];
        const m = (x1 + x2) / 2;
        items.push({ z: (z1 + z2) / 2 - 0.05, type: 'rung', p: pt(s, x1), q: pt(s, m), c: colors[base] });
        items.push({ z: (z1 + z2) / 2 - 0.05, type: 'rung', p: pt(s, m), q: pt(s, x2), c: colors[PAIR[base]] });
        items.push({ z: z1 + 0.01, type: 'node', p: pt(s, x1), c: colors[base] });
        items.push({ z: z2 + 0.01, type: 'node', p: pt(s, x2), c: colors[PAIR[base]] });
      }

      items.sort((a, b) => a.z - b.z);
      ctx.lineCap = 'round';
      for (const it of items) {
        const depth = (it.z + 1) / 2;      // 0 = back, 1 = front
        if (it.type === 'bb') {
          ctx.globalAlpha = 0.25 + depth * 0.75;
          ctx.strokeStyle = colors.line;
          ctx.lineWidth = 1.2 + depth * 1.8;
          ctx.beginPath(); ctx.moveTo(...it.p); ctx.lineTo(...it.q); ctx.stroke();
        } else if (it.type === 'rung') {
          ctx.globalAlpha = 0.18 + depth * 0.6;
          ctx.strokeStyle = it.c;
          ctx.lineWidth = 1 + depth * 1.6;
          ctx.beginPath(); ctx.moveTo(...it.p); ctx.lineTo(...it.q); ctx.stroke();
        } else {
          ctx.globalAlpha = 0.3 + depth * 0.7;
          ctx.fillStyle = it.c;
          ctx.beginPath(); ctx.arc(it.p[0], it.p[1], 1.6 + depth * 2.2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now) => {
      if (!running) return;
      const dt = Math.min(64, now - (last || now));
      last = now;
      speed += (target - speed) * 0.05;
      phase += dt * 0.00045 * speed;
      draw();
      requestAnimationFrame(frame);
    };
    const start = () => {
      if (running || reduceMotion || !visible || document.hidden) return;
      running = true; last = 0; requestAnimationFrame(frame);
    };
    const stop = () => { running = false; };

    readColors(); resize(); draw();
    themeListeners.push(() => { readColors(); draw(); });
    window.addEventListener('resize', () => { resize(); draw(); });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
    const hero = canvas.closest('.hero');
    hero?.addEventListener('pointerenter', () => { target = 2.2; });
    hero?.addEventListener('pointerleave', () => { target = 1; });
    // Fonts/layout can shift after load; re-measure once.
    window.addEventListener('load', () => { resize(); draw(); });
    start();
  }

  onScroll();
})();
