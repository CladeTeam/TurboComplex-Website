/* Page wiring: nav, theme, reveals, counters, race, engine diagram, lazy charts, molecules, number wall. */
(function () {
  const D = window.TC_DATA, X = window.TC_EXTRA, T = window.TCC;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = T.fmt;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- day / night theme ---------------- */
  const root = document.documentElement;
  const themeBtn = $('#themeToggle');
  const label = () => themeBtn.setAttribute('aria-label', root.dataset.theme === 'light' ? 'Switch to night mode' : 'Switch to day mode');
  function setTheme(t) {
    root.classList.add('theme-anim');
    if (t === 'light') root.dataset.theme = 'light'; else delete root.dataset.theme;
    try { localStorage.setItem('tc-theme', t); } catch (e) { /* private mode: theme just isn't remembered */ }
    label();
    document.dispatchEvent(new CustomEvent('tc-theme', { detail: t }));
    setTimeout(() => root.classList.remove('theme-anim'), 450);
  }
  themeBtn.addEventListener('click', () => setTheme(root.dataset.theme === 'light' ? 'dark' : 'light'));
  label();

  /* ---------------- nav + progress ---------------- */
  const nav = $('#nav'), bar = $('#progressBar');
  const links = $$('.nav nav a');
  const secs = links.map((a) => $(a.getAttribute('href')));
  let docH = 1, ticking = false;
  const measure = () => { docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight); };
  function onScroll() {
    ticking = false;
    const y = window.scrollY;
    bar.style.transform = `scaleX(${Math.min(1, y / docH)})`;
    nav.classList.toggle('solid', y > 40);
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  measure(); onScroll();
  if ('IntersectionObserver' in window) {
    const act = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const i = secs.indexOf(e.target);
      links.forEach((a, j) => a.classList.toggle('on', j === i));
    }), { rootMargin: '-40% 0px -59% 0px' });
    secs.forEach((s) => s && act.observe(s));
  }
  $('#navToggle').addEventListener('click', () => nav.classList.toggle('open'));
  links.forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));

  /* ---------------- helpers ---------------- */
  function whenVisible(el, cb, margin = '0px 0px -12% 0px') {
    if (!('IntersectionObserver' in window)) return cb();
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); cb(); } }, { rootMargin: margin });
    io.observe(el);
  }
  // calls cb(true/false) whenever el enters / leaves the viewport (used to pause off-screen animation)
  function onVisibility(el, cb, margin = '60px 0px') {
    if (!('IntersectionObserver' in window)) return cb(true);
    new IntersectionObserver((es) => cb(es[0].isIntersecting), { rootMargin: margin }).observe(el);
  }
  const loadScript = window.TCL.script; // shared with hero.js, so each file is fetched once
  const needEcharts = () => (window.echarts ? Promise.resolve() : loadScript('assets/lib/echarts.min.js'));
  const need3Dmol = window.TCL.need3Dmol;
  // warm the heavy libraries once the page is idle, so the first chart/molecule doesn't wait on the network
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
  const slice = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 200 }) : (f) => setTimeout(f, 16);
  window.addEventListener('load', () => idle(needEcharts));
  function countUp(el) {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    if (reduced) { el.textContent = fmt(to, dec); return; }
    const t0 = performance.now(), dur = 1600 + Math.min(1200, Math.log10(to + 1) * 300);
    (function step(now) {
      const u = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - u, 4);
      el.textContent = fmt(to * e, dec);
      if (u < 1) requestAnimationFrame(step);
    })(t0);
  }
  function bindCounters(root = document) { $$('[data-count]', root).forEach((el) => whenVisible(el, () => countUp(el))); }

  /* ---------------- hero entrance ---------------- */
  if (hasGsap && !reduced) {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero-eyebrow', { y: 20, opacity: 0, duration: 0.7, delay: 0.2 })
      .from('.t-turbo', { x: -80, opacity: 0, skewX: -18, duration: 0.9 }, '-=0.4')
      .from('.t-complex', { x: 60, opacity: 0, duration: 0.9 }, '-=0.75')
      .from('.hero-sub, .hero-lead', { y: 20, opacity: 0, duration: 0.7, stagger: 0.12 }, '-=0.5')
      .from('.hero-kpis .kpi', { y: 26, opacity: 0, duration: 0.6, stagger: 0.09 }, '-=0.4')
      .from('.hero-cta .btn', { y: 16, opacity: 0, duration: 0.5, stagger: 0.08 }, '-=0.3')
      .from('.hero-caption', { opacity: 0, duration: 0.8 }, '-=0.2');
  }

  /* ---------------- ticker ---------------- */
  const tick = [
    ['4.2×', 'Boltz-2 FoldBench PPI, one GPU'], ['448×', 'TC-PPI vs AlphaFold 3 screening'], ['3.27×', 'Chai-1 protein–DNA'],
    ['2.96×', 'Protenix v1.0 protein–DNA'], ['2.54×', 'Boltz-1 protein–protein'], ['+3.04 pp', 'Boltz-1 DockQ success'],
    ['90.1%', 'dry-positive PPIs wet-confirmed'], ['1.61×', 'binders per GPU·h'], ['10×', 'fewer models, same conformations'],
    ['145×', 'feature-loader caching at 100k pairs'], ['237', 'full-benchmark configurations swept'], ['25', 'large assemblies, up to 28 chains'],
  ];
  const tk = tick.map(([a, b]) => `<span><b>${a}</b>${b}</span>`).join('');
  $('#ticker').innerHTML = tk + tk;

  /* ---------------- 01 race ---------------- */
  (function race() {
    const lanesEl = $('#raceLanes');
    let task = 'pp', raf = 0, started = false;
    function build() {
      const b = D.bench[task];
      const ms = [...T.MODELS].sort((x, y) => b[y].baseline.time_min - b[x].baseline.time_min);
      lanesEl.innerHTML = ms.map((m) => `
        <div class="lane" data-m="${m}">
          <div class="lane-name"><i style="--c:${T.mvar(m)}"></i>${m}</div>
          <div class="lane-tracks">
            <div class="track b"><div class="bar"></div><span class="lbl"></span></div>
            <div class="track t"><div class="bar"></div><span class="lbl"></span></div>
          </div>
          <div class="lane-res"><b>${(b[m].baseline.time_min / b[m].optimised.time_min).toFixed(2)}×</b><span>−${fmt(b[m].baseline.time_min - b[m].optimised.time_min, 0)} GPU-min</span></div>
        </div>`).join('');
      const saved = ms.reduce((a, m) => a + b[m].baseline.time_min - b[m].optimised.time_min, 0);
      const mean = ms.reduce((a, m) => a + b[m].baseline.time_min / b[m].optimised.time_min, 0) / ms.length;
      const dsucc = ms.reduce((a, m) => a + b[m].optimised.success - b[m].baseline.success, 0) / ms.length;
      $('#raceSaved').textContent = fmt(saved, 0);
      $('#raceMean').textContent = mean.toFixed(2) + '×';
      $('#raceDock').textContent = (dsucc >= 0 ? '+' : '') + dsucc.toFixed(2) + ' pp';
      return ms;
    }
    function play() {
      cancelAnimationFrame(raf);
      const ms = build(), b = D.bench[task];
      const tmax = Math.max(...ms.map((m) => b[m].baseline.time_min));
      const dur = reduced ? 1 : 7000;
      const lanes = $$('.lane', lanesEl);
      const t0 = performance.now();
      (function step(now) {
        const u = Math.min(1, (now - t0) / dur);
        const e = u * tmax;
        $('#raceClock').textContent = fmt(e, 1);
        lanes.forEach((ln, i) => {
          const m = ms[i];
          [['b', b[m].baseline.time_min], ['t', b[m].optimised.time_min]].forEach(([k, T0]) => {
            const tr = ln.querySelector('.track.' + k);
            const cur = Math.min(e, T0);
            tr.querySelector('.bar').style.width = (cur / tmax) * 100 + '%';
            const lbl = tr.querySelector('.lbl');
            lbl.style.left = Math.min((cur / tmax) * 100, 80) + '%';
            lbl.textContent = e >= T0 ? `${fmt(T0, 1)} min ${k === 't' ? '✓' : ''}` : '';
            if (k === 't') tr.querySelector('.bar').style.setProperty('--glow', e >= T0 ? 0 : 1);
          });
          ln.classList.toggle('done', e >= b[m].optimised.time_min);
        });
        if (u < 1) raf = requestAnimationFrame(step);
      })(t0);
    }
    build();
    whenVisible($('#race .race-panel'), () => { started = true; play(); }, '0px 0px -25% 0px');
    $('#racePlay').addEventListener('click', play);
    T.seg('raceTask', (v) => { task = v; started ? play() : build(); });
  })();

  /* ---------------- 02 engine diagram ---------------- */
  (function engine() {
    const techs = [
      ['MSA presampling', 'Search with DHR, MMseqs2 or JackHMMER, cluster the alignment and keep representative rows — fewer, more informative sequences in.', 'msa'],
      ['TensorRT deployment', 'Pairformer compiled to FP16 TensorRT: triangle kernels, pair transition, TF32 GEMMs, fused pair-bias attention.', 'trunk'],
      ['Adaptive recycling', 'Stop recycling once the relative change of single and pair representations drops below τ — no wasted trunk passes.', 'gate'],
      ['FlashBias attention', 'Low-rank additive-bias triangle self-attention: the bias rides along q/k instead of a quadratic tensor.', 'pf'],
      ['Fewer diffusion steps', 'Sampling steps and diffusion samples chosen per model from the Pareto front of a 237-run sweep.', 'diff'],
      ['New ranking metric', 'ipTM, pLDDT, PAE and pDockQ fused into one calibrated score that picks the candidate to keep.', 'rank'],
      ['Server-side batching', 'Token bucketing, async I/O, cached features and multi-GPU sharding keep every accelerator busy.', 'server'],
    ];
    const svg = $('#engineSvg');
    const box = (id, x, y, w, h, t, sub) => `<g class="mod" data-k="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/><text x="${x + w / 2}" y="${y + h / 2 - (sub ? 8 : 0)}">${t}</text>${sub ? `<text class="sub" x="${x + w / 2}" y="${y + h / 2 + 12}">${sub}</text>` : ''}</g>`;
    const pin = (k, n, x, y) => `<g class="pin" data-k="${k}" data-i="${n}"><circle cx="${x}" cy="${y}" r="13"/><text x="${x}" y="${y}">${['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'][n]}</text></g>`;
    const main = 'M100 118 L210 118 M330 118 L370 118 M480 118 L520 118 M640 118 L690 118';
    const pathA = 'M100 118 L690 118 L840 118 L840 300 Q840 340 800 340 L130 340';
    svg.innerHTML = `
      <defs>
        <linearGradient id="gS" x1="0" x2="1"><stop offset="0" style="stop-color:var(--turbo);stop-opacity:.14"/><stop offset="1" style="stop-color:var(--violet);stop-opacity:.10"/></linearGradient>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" style="fill:var(--turbo)"/></marker>
      </defs>
      <g class="mod" data-k="server"><rect x="8" y="16" width="884" height="444" rx="22" fill="url(#gS)" style="fill:url(#gS);stroke-dasharray:6 6"/></g>
      <text class="lbl" x="34" y="44">TurboComplex optimisation engine</text>
      <path class="flow base" d="${main}"/>
      <path class="flow" d="M170 118 L210 118" marker-end="url(#arr)"/>
      <path class="flow" d="M330 118 L370 118" marker-end="url(#arr)"/>
      <path class="flow" d="M480 118 L520 118" marker-end="url(#arr)"/>
      <path class="flow" d="M640 118 L690 118" marker-end="url(#arr)"/>
      <path class="flow back" d="M775 170 L775 230 Q775 240 765 240 L280 240 Q270 240 270 230 L270 158" marker-end="url(#arr)"/>
      <path class="flow" d="M840 170 L840 300 Q840 340 800 340 L720 340" marker-end="url(#arr)"/>
      <path class="flow" d="M560 340 L510 340" marker-end="url(#arr)"/>
      <path class="flow" d="M360 340 L320 340" marker-end="url(#arr)"/>
      <path class="flow" d="M170 340 L140 340" marker-end="url(#arr)"/>
      ${box('msa', 30, 84, 140, 68, 'MSA search', 'presampled · clustered')}
      ${box('emb', 210, 84, 120, 68, 'Input embedder', 'single + pair')}
      ${box('trunk', 370, 84, 110, 68, 'Template', 'module')}
      ${box('trunk', 520, 84, 120, 68, 'MSA module', '')}
      ${box('pf', 690, 66, 180, 104, 'Pairformer', '48 blocks · triangle attn')}
      ${box('diff', 560, 306, 160, 68, 'Diffusion module', '')}
      ${box('conf', 360, 306, 150, 68, 'Confidence head', 'ipTM · pLDDT · PAE')}
      ${box('rank', 170, 306, 140, 68, 'Ranking', 'calibrated score')}
      <g class="mod" data-k="out"><rect x="30" y="306" width="100" height="68" rx="12"/><text x="80" y="332">Top-1</text><text class="sub" x="80" y="352">structure</text></g>
      <g class="gate"><rect x="490" y="226" width="210" height="28" rx="14" style="fill:var(--bg);stroke:var(--violet);stroke-opacity:.6"/><text class="lbl" x="595" y="244" text-anchor="middle" id="gateTxt" style="fill:var(--violet)">recycle 1 · Δ = 0.42</text></g>
      <text class="counter" x="640" y="394" text-anchor="middle" id="stepTxt">TurboComplex · step 0 / 40</text>
      <text class="lbl" x="640" y="412" text-anchor="middle" id="stepBase">stock · step 0 / 200</text>
      <text class="lbl" x="34" y="440">vii — the same engine serves every backbone behind one batched endpoint</text>
      <circle class="pkt" r="5"><animateMotion dur="5.5s" repeatCount="indefinite" path="${pathA}"/></circle>
      <circle class="pkt" r="3.5" opacity=".7"><animateMotion dur="5.5s" begin="1.8s" repeatCount="indefinite" path="${pathA}"/></circle>
      <circle class="pkt" r="3.5" opacity=".7"><animateMotion dur="5.5s" begin="3.6s" repeatCount="indefinite" path="${pathA}"/></circle>
      ${pin('msa', 0, 44, 80)}
      ${pin('trunk', 1, 500, 80)}
      ${pin('gate', 2, 470, 240)}
      ${pin('pf', 3, 862, 66)}
      ${pin('diff', 4, 720, 306)}
      ${pin('rank', 5, 304, 306)}
      ${pin('server', 6, 870, 30)}`;
    const list = $('#techList');
    list.innerHTML = techs.map(([t, d, k], i) => `<li data-k="${k}" data-i="${i}"><b>${t}</b><span>${d}</span></li>`).join('');
    function hl(i) {
      $$('li', list).forEach((li) => li.classList.toggle('hl', +li.dataset.i === i));
      $$('.pin', svg).forEach((p) => p.classList.toggle('hl', +p.dataset.i === i));
      const k = i >= 0 ? techs[i][2] : null;
      $$('.mod', svg).forEach((m) => m.classList.toggle('hl', m.dataset.k === k && k !== 'server'));
      const srv = $('.mod[data-k="server"] rect', svg);
      srv.style.stroke = k === 'server' ? 'var(--turbo)' : '';
    }
    list.addEventListener('mouseover', (e) => { const li = e.target.closest('li'); if (li) hl(+li.dataset.i); });
    list.addEventListener('mouseleave', () => hl(-1));
    svg.addEventListener('mouseover', (e) => { const p = e.target.closest('.pin'); if (p) hl(+p.dataset.i); });
    svg.addEventListener('mouseleave', () => hl(-1));
    // auto-cycle until the user interacts
    let auto = 0, timer = null, touched = false;
    const stop = () => { touched = true; clearInterval(timer); };
    list.addEventListener('mouseenter', stop); svg.addEventListener('mouseenter', stop);
    // live counters: diffusion steps race and recycling gate
    let st = 0, rc = 1, ticker = null;
    function tickCounters() {
      st += 2;
      if (st > 230) st = 0;
      const lim = 40;
      $('#stepTxt').textContent = st >= lim ? `TurboComplex · ${lim} / ${lim} ✓ done` : `TurboComplex · step ${st} / ${lim}`;
      $('#stepBase').textContent = st >= 200 ? 'stock · 200 / 200 done' : `stock · step ${st} / 200`;
      if (st % 24 === 0) { rc = rc >= 4 ? 1 : rc + 1; const dl = [0.42, 0.17, 0.06, 0.03][rc - 1]; $('#gateTxt').textContent = rc === 4 ? `recycle ${rc} · Δ ${dl} < τ → exit` : `recycle ${rc} · Δ = ${dl}`; }
    }
    svg.pauseAnimations();
    onVisibility(svg, (on) => {
      svg.classList.toggle('paused', !on);
      clearInterval(timer); clearInterval(ticker);
      if (!on || reduced) { svg.pauseAnimations(); return; }
      svg.unpauseAnimations();
      timer = setInterval(() => { if (!touched) hl(auto++ % 7); }, 2200);
      ticker = setInterval(tickCounters, 80);
    });
    $('#bbRow').innerHTML = T.MODELS.map((m) => `<span class="bb"><i style="--c:${T.mvar(m)}"></i>${m}</span>`).join('');
  })();

  /* ---------------- 03 stack steps ---------------- */
  (function () {
    const st = X.boltzStack.stages, b0 = st[0].s;
    $('#stackSteps').innerHTML = st.map((s, i) => `
      <div class="step"><div class="n">${i ? '+' + i : '0'}</div><div><b>${s.key.replace(/^\+ /, '')}</b><span>${s.note}</span></div>
      <div class="x">${i ? (b0 / s.s).toFixed(1) + '×' : '1×'}<small>${fmt(s.s)} s</small></div></div>`).join('') +
      `<p class="fine">Accuracy check: mean DockQ <b>${X.boltzStack.dockqFinal}</b> vs reference ${X.boltzStack.dockqRef}; DockQ ≥ 0.23 success ${(X.boltzStack.successFinal * 100).toFixed(1)}% — all ${X.boltzStack.targets} inputs predicted, none skipped.</p>`;
  })();

  /* ---------------- lazy charts ---------------- */
  Object.entries(T.builders).forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (!el) return;
    whenVisible(el, () => needEcharts().then(() => { try { T.build(id, el); } catch (err) { console.error(id, err); } }), '0px 0px 300px 0px');
  });

  /* ---------------- molecules ---------------- */
  const loadStruct = window.TCL.struct;
  // heavy: big assemblies — no supersampling (3Dmol's antialias renders at 2× resolution) and a coarser cartoon mesh
  const viewers = [];
  // 3Dmol fades distant atoms toward the background colour, so keep it in step with the theme
  const molBg = () => (root.dataset.theme === 'light' ? '#eef2f8' : '#05070e');
  function viewer(el, spin, heavy) {
    if (el._v) { el._v.clear(); return el._v; }
    el.innerHTML = '';
    const v = $3Dmol.createViewer(el, heavy
      ? { backgroundColor: molBg(), backgroundAlpha: 0, antialias: false, cartoonQuality: 3 }
      : { backgroundColor: molBg(), backgroundAlpha: 0, antialias: true, cartoonQuality: 8 });
    let rz = 0;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => v.resize(), 150); });
    v._onScreen = true;
    viewers.push(v);
    onVisibility(el, (on) => {
      v._onScreen = on;
      if (spin && !reduced) v.spin(on ? 'y' : false, spin);
      if (v._onVis) v._onVis(on);
    });
    el._v = v;
    return v;
  }
  const withStruct = (...ids) => need3Dmol().then(() => Promise.all(ids.map(loadStruct)));
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  function hsl2hex(h, s, l) {
    s /= 100; l /= 100;
    const f = (n) => { const k = (n + h / 30) % 12, c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); };
    return '#' + f(0) + f(8) + f(4);
  }
  const chainColor = (i, n) => hsl2hex((188 + (i / Math.max(1, n - 1)) * 150) % 360, 88, i % 2 ? 58 : 68);
  const plddtColor = (b) => (b >= 90 ? '#0053d6' : b >= 70 ? '#65cbf3' : b >= 50 ? '#ffdb13' : '#ff7d45');

  // Der f7 binder
  whenVisible($('#molDerf7'), () => withStruct('derf7').then(async ([s]) => {
    const el = $('#molDerf7'), v = viewer(el, 0.4);
    await nextFrame();
    v.addModel(s.text, s.fmt);
    await nextFrame();
    v.setStyle({ chain: 'B' }, { cartoon: { color: '#a3abbf' } });
    v.setStyle({ chain: 'A' }, { cartoon: { colorfunc: (a) => plddtColor(a.b), thickness: 0.4 } });
    v.addStyle({ chain: 'B', byres: true, within: { distance: 5, sel: { chain: 'A' } } }, { stick: { color: '#ff3fb4', radius: 0.12 } });
    v.zoomTo(); v.zoom(1.15); v.render();
    if (!reduced && v._onScreen) v.spin('y', 0.4);
  }), '0px 0px 300px 0px');

  // Large assemblies: chains appear one by one, as in stepwise assembly
  (function () {
    const el = $('#molAsm');
    let v = null, cur = '7QVE', token = 0;
    const L = D.large.top1;
    const info = { '7QVE': 28, '7ARC': 16, '7QRU': 8 };
    function note(id) {
      const r = L[id];
      $('#asmTitle').textContent = `${id} · ${info[id]} chains`;
      $('#asmNote').innerHTML = `TurboComplex TM <b style="color:var(--turbo)">${r.pae.toFixed(3)}</b> · CombFold-AFM ${r.paper == null ? '—' : r.paper.toFixed(3)} · AF3 single-shot ${r.whole_complex == null ? '<b style="color:var(--hot)">no model</b>' : r.whole_complex.toFixed(3)}`;
    }
    function show(id) {
      cur = id; note(id);
      const my = ++token;
      if (!el._v) el.innerHTML = '<div class="mol-load">loading structure…</div>';
      withStruct(id).then(async ([s]) => {
        if (my !== token) return;
        v = viewer(el, 0.35, true);
        await nextFrame();
        const byChain = new Map();
        for (const line of s.text.split('\n')) {
          if (!line.startsWith('ATOM') && !line.startsWith('HETATM')) continue;
          const c = line[21];
          if (!byChain.has(c)) byChain.set(c, []);
          byChain.get(c).push(line);
        }
        const models = [];
        for (const lines of byChain.values()) {
          const m = v.addModel(lines.join('\n') + '\nEND\n', 'pdb'); m.setStyle({}, {});
          models.push(m);
          if (models.length % 6 === 0) { await nextFrame(); if (my !== token) return; }
        }
        v.zoomTo(); v.render();
        if (!reduced && v._onScreen) v.spin('y', 0.35);
        let i = 0;
        const cnt = $('#asmCount'), n = models.length;
        (function add() {
          if (my !== token) return;
          if (i >= n) { cnt.textContent = `assembled ${n} / ${n} chains`; return; }
          models[i].setStyle({}, { cartoon: { color: chainColor(i, n), thickness: 0.5 } });
          v.render();
          i++;
          cnt.textContent = `placing chain ${i} / ${n}`;
          setTimeout(add, reduced ? 0 : Math.max(60, 1800 / n));
        })();
      });
    }
    whenVisible(el, () => show(cur), '0px 0px 300px 0px');
    T.seg('asmPick', show);
    $('#asmReplay').addEventListener('click', () => show(cur));
    note(cur);
  })();

  // P21589 open ⇄ closed morph (closed aligned onto open by quaternion superposition of Cα)
  function superpose(P, Q) { // returns fn mapping Q-frame points onto P frame
    const n = P.length; const cp = [0, 0, 0], cq = [0, 0, 0];
    P.forEach((p) => { cp[0] += p[0] / n; cp[1] += p[1] / n; cp[2] += p[2] / n; });
    Q.forEach((q) => { cq[0] += q[0] / n; cq[1] += q[1] / n; cq[2] += q[2] / n; });
    const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let k = 0; k < n; k++) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) S[i][j] += (Q[k][i] - cq[i]) * (P[k][j] - cp[j]);
    const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = S;
    const N = [[xx + yy + zz, yz - zy, zx - xz, xy - yx], [yz - zy, xx - yy - zz, xy + yx, zx + xz], [zx - xz, xy + yx, -xx + yy - zz, yz + zy], [xy - yx, zx + xz, yz + zy, -xx - yy + zz]];
    const shift = Math.abs(xx) + Math.abs(yy) + Math.abs(zz) + Math.abs(xy) + Math.abs(xz) + Math.abs(yx) + Math.abs(yz) + Math.abs(zx) + Math.abs(zy) + 1;
    let q = [1, 0, 0, 0];
    for (let it = 0; it < 200; it++) { // power iteration on N + shift·I
      const r = N.map((row, i) => row.reduce((a, v, j) => a + v * q[j], 0) + shift * q[i]);
      const l = Math.hypot(...r); q = r.map((x) => x / l);
    }
    const [w, x, y, z] = q;
    const R = [[w * w + x * x - y * y - z * z, 2 * (x * y - w * z), 2 * (x * z + w * y)], [2 * (x * y + w * z), w * w - x * x + y * y - z * z, 2 * (y * z - w * x)], [2 * (x * z - w * y), 2 * (y * z + w * x), w * w - x * x - y * y + z * z]];
    return (v) => { const a = [v[0] - cq[0], v[1] - cq[1], v[2] - cq[2]]; return [0, 1, 2].map((i) => R[i][0] * a[0] + R[i][1] * a[1] + R[i][2] * a[2] + cp[i]); };
  }
  (function () {
    const el = $('#molConf');
    let v = null, nF = 0, mode = 'morph', timer = null;
    whenVisible(el, () => withStruct('p21589_open', 'p21589_closed').then(async ([o, c]) => {
      v = viewer(el);
      v._onVis = () => apply();
      await nextFrame();
      const tmp = v.addModel(c.text, c.fmt);
      const cAt = tmp.selectedAtoms({}).map((a) => ({ k: a.chain + a.resi + a.atom, x: a.x, y: a.y, z: a.z, ca: a.atom === 'CA' }));
      v.removeModel(tmp);
      await nextFrame();
      const m = v.addModel(o.text, o.fmt);
      await nextFrame();
      const oAt = m.selectedAtoms({});
      const idx = new Map(cAt.map((a) => [a.k, a]));
      const pairs = oAt.filter((a) => a.atom === 'CA' && idx.has(a.chain + a.resi + a.atom));
      const map = superpose(pairs.map((a) => [a.x, a.y, a.z]), pairs.map((a) => { const b = idx.get(a.chain + a.resi + a.atom); return [b.x, b.y, b.z]; }));
      const tgt = oAt.map((a) => { const b = idx.get(a.chain + a.resi + a.atom); return b ? map([b.x, b.y, b.z]) : [a.x, a.y, a.z]; });
      v.setStyle({}, { cartoon: { color: 'spectrum', thickness: 0.45 } });
      v.zoomTo(); v.zoom(1.1); v.render();
      // build the interpolated frames a few at a time in idle slices, then start the morph
      const F = 20, style = { cartoon: { color: 'spectrum', thickness: 0.45 } };
      let f = 0;
      (function chunk(dl) {
        const until = performance.now() + (dl && dl.timeRemaining ? Math.max(8, dl.timeRemaining()) : 12);
        while (f <= F && performance.now() < until) {
          const u = 0.5 - 0.5 * Math.cos(Math.PI * f / F);
          m.addFrame(oAt.map((a, i) => Object.assign({}, a, { x: a.x + (tgt[i][0] - a.x) * u, y: a.y + (tgt[i][1] - a.y) * u, z: a.z + (tgt[i][2] - a.z) * u, style: {} })));
          f++;
        }
        if (f <= F) return slice(chunk);
        nF = F + 1;
        m.setStyle({}, style);
        v.setFrame(0).then(() => { v.render(); apply(); });
      })();
    }), '0px 0px 300px 0px');
    function show(f) { v.setFrame(f).then(() => v.render()); }
    function apply() {
      if (!v || !nF) return;
      clearTimeout(timer);
      if (mode !== 'morph' || reduced) return show(mode === 'closed' ? nF - 1 : 0);
      if (!v._onScreen) return;
      // ping-pong through the frames with a pause at each end state
      let f = 0, dir = 1;
      (function step() {
        show(f);
        const atEnd = f === 0 || f === nF - 1;
        if (f + dir < 0 || f + dir >= nF) dir = -dir;
        f += dir;
        timer = setTimeout(step, atEnd ? 900 : 70);
      })();
    }
    T.seg('confPick', (val) => { mode = val; apply(); });
  })();

  /* ---------------- 09 number wall ---------------- */
  (function () {
    const g = D.grid, gh = Object.values(g).reduce((a, ps) => a + ps.reduce((b, p) => b + p.t, 0), 0) / 3600;
    const ppiH = D.ppi.runtime.reduce((a, r) => a + r.human_h + r.micro_h, 0);
    const nGrid = Object.values(g).reduce((a, ps) => a + ps.length, 0);
    const ds = D.design.stats;
    const nT = { pp: D.bench.pp['AlphaFold 3'].baseline.n, pd: D.bench.pd['Boltz-1'].baseline.n };
    const K = X.conformation;
    const cells = [
      [7, '', 'structure-prediction backbones', 'AF3 · Protenix ×2 · Boltz ×2 · Chai-1 · OpenFold3'],
      [7, '', 'optimisations in one engine', 'MSA → TensorRT → recycling → attention → diffusion → ranking → serving'],
      [nT.pp + nT.pd, '', 'FoldBench complexes', `${nT.pp} protein–protein + ${nT.pd} protein–DNA`],
      [7 * 2 * (nT.pp + nT.pd), '', 'benchmark target-runs', '7 models × 2 configurations × 429 targets'],
      [nGrid, '', 'full-benchmark sampling configurations', `SS × DS × TH sweep · ${fmt(gh, 0)} GPU-hours`],
      [Math.round(ppiH), '', 'GPU-hours of PPI inference compared', '11 methods × Human & Micro benchmarks'],
      [D.ppi.wet.clean_pairs, '', 'phage–E. coli pairs tested in the wet lab', 'high-throughput mass spectrometry'],
      [30926, '', 'phage proteins functionally annotated', '11 functional classes'],
      [ds.n_protein_runs_per_condition * 2 + ds.n_dna_runs_per_condition * 2, '', 'binder-design runs', '12 protein + 6 DNA targets × 10 runs × 2 conditions'],
      [K.proteins, '', 'proteins in the multi-conformation benchmark', 'OC23 · OC85 · TP16 vs AFsample2'],
      [K.structures, '', 'predicted structures re-scored from raw CIFs', 'P21589 ×3,700 · CXCR4 ×1,395 · KaiB ×513'],
      [K.p21589.homologs, '', 'homologs clustered for one protein', `ε-scan → ${K.p21589.clusters} clusters → ${K.p21589.selected} kept`],
      [K.kaib.treeSeqs, '', 'sequences in the KaiB phylogeny', `${K.kaib.leaves} leaves predicted & classified`],
      [25, '', 'large assemblies benchmarked', 'up to 28 chains per complex'],
      [K.files, '', 'files with SHA-256 provenance', 'conformation verification package'],
      [4.2, '×', 'end-to-end speed-up on one GPU', 'Boltz-2 · 239 PPI targets · same hardware'],
    ];
    $('#numWall').innerHTML = cells.map(([n, suf, a, b]) => `<div class="num"><b><span data-count="${n}" data-dec="${n % 1 ? 1 : 0}">0</span>${suf ? `<sup>${suf}</sup>` : ''}</b><span>${a}</span><em>${b}</em></div>`).join('');
    const fronts = [
      ['var(--turbo)', 'Engine · Benchmark', 'One optimiser, seven backbones', ['MSA presampling, TensorRT, FlashBias, adaptive recycling', 'JAX and PyTorch models under one interface', 'FoldBench protein–protein and protein–DNA, DockQ-validated', '237-run Pareto sweep of sampling parameters']],
      ['var(--turbo-2)', 'Virtual screening', 'TC-PPI two-stage funnel', ['SaProt post-training on multi-species PPIs', 'Seven-backbone structural re-scoring + HGB calibration', 'Genome-wide phage–E. coli interaction atlas', 'Feature caching for 100k-pair screens']],
      ['var(--violet)', 'Complex generation', 'Binder and DNA-binder design', ['Protenix v1.0 design loop with early stopping', '12 protein targets, 6 transcription-factor motifs', 'Inverse-folding (MPNN) consistency checks', 'Fixed-budget yield analysis by bootstrap']],
      ['var(--m2)', 'Large assemblies', 'Stepwise prediction of giants', ['Subunit pair and group prediction with accelerated AF3', 'Combinatorial assembly with PAE vs pLDDT scoring', 'Single-shot AF3 whole-complex baseline', '25 CombFold benchmark complexes']],
      ['var(--m1)', 'Multi-conformation', 'Ensembles at a fraction of the cost', ['MSA clustering with ε-scan and confidence pre-screen', 'Boltz-2 and AF3 on OC23 / OC85 / TP16', 'Ligand-dependent GPCR states (CXCR4, GCGR)', 'KaiB fold-switching across a phylogeny']],
      ['var(--m5)', 'Experimental validation', 'From prediction to the bench', ['Candidate pair selection and cloning', 'High-throughput phage–host interaction assay', '15,411 clean pairs scored against dry calls', 'Binder expression and target-binding assays']],
    ];
    $('#fronts').innerHTML = fronts.map(([c, tag, h, li]) => `<div class="front" style="--c:${c}"><span class="tag">${tag}</span><h4>${h}</h4><ul>${li.map((x) => `<li>${x}</li>`).join('')}</ul></div>`).join('');
  })();

  document.addEventListener('tc-theme', () => {
    if (window.echarts) T.rebuildAll();
    viewers.forEach((v) => { v.setBackgroundColor(molBg(), 0); v.render(); });
  });

  /* ---------------- bibtex ---------------- */
  $('#copyBib').addEventListener('click', (e) => {
    const txt = $('#bib').textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { e.target.textContent = 'Copied ✓'; }).catch(() => { e.target.textContent = 'Select & copy'; });
  });

  /* ---------------- counters + reveals ---------------- */
  bindCounters();
  if (hasGsap && !reduced) {
    const targets = $$('.sec-head, .panel, .kpi-card, .num, .front, .step, .tech-list li, .backbones');
    gsap.set(targets, { opacity: 0, y: 34 });
    ScrollTrigger.batch(targets, { start: 'top 90%', once: true, onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out', stagger: 0.07, overwrite: true }) });
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }
})();
