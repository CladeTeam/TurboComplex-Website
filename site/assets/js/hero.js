/* Hero: the 7QVE assembly (28 chains) built chain by chain as a cartoon — each chain flies in from
 * outside and docks, as in TurboComplex stepwise assembly — over a light speed-streak field.
 * Also defines window.TCL, the shared script/structure loader main.js uses, so 3Dmol and 7QVE are
 * fetched once for both the hero and the large-assembly section. */
(function () {
  const scripts = {};
  const script = (src) => scripts[src] || (scripts[src] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  }));
  const struct = (id) => (window.TC_STRUCT && window.TC_STRUCT[id] ? Promise.resolve(window.TC_STRUCT[id])
    : script(`assets/structures/${id}.js`).then(() => window.TC_STRUCT[id]));
  const need3Dmol = () => (window.$3Dmol ? Promise.resolve() : script('assets/lib/3Dmol-min.js'));
  window.TCL = { script, struct, need3Dmol };

  // 3Dmol lights cartoons with a single directional Lambert term, colour × max(n·l, 0), and no ambient,
  // so every surface turned away from the light renders black. Add an ambient floor to those shaders
  // as they are compiled (matched on 3Dmol's exact GLSL; nothing else on the page uses WebGL shaders).
  const AMBIENT = '0.6';
  [window.WebGLRenderingContext, window.WebGL2RenderingContext].forEach((C) => {
    if (!C || C.prototype.__tcAmbient) return;
    const orig = C.prototype.shaderSource;
    C.prototype.shaderSource = function (sh, src) {
      if (typeof src === 'string' && src.includes('directionalLightWeighting')) {
        src = src.split('vec3( max( dotProduct, 0.0 ) )').join(`vec3( ${AMBIENT} + (1.0 - ${AMBIENT}) * max( dotProduct, 0.0 ) )`)
          .split('vec3( max( -dotProduct, 0.0 ) )').join(`vec3( ${AMBIENT} + (1.0 - ${AMBIENT}) * max( -dotProduct, 0.0 ) )`);
      }
      return orig.call(this, sh, src);
    };
    C.prototype.__tcAmbient = true;
  });

  const host = document.getElementById('heroMol'), stars = document.getElementById('heroStars');
  if (!host) return;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const light = () => root.dataset.theme === 'light';
  let visible = true;

  /* ---------------- speed streaks (2D, ~140 lines) ---------------- */
  let resumeStars = () => {};
  (function streaks() {
    if (!stars) return;
    const ctx = stars.getContext('2d');
    const field = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), s: 0.3 + Math.random() }));
    let W = 0, H = 0, dpr = 1, raf = 0;
    const t0 = performance.now();
    const size = () => { dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = stars.clientWidth; H = stars.clientHeight; stars.width = W * dpr; stars.height = H * dpr; };
    size();
    let rz = 0;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(size, 150); });
    function frame(now) {
      raf = 0;
      if (!visible) return;
      raf = requestAnimationFrame(frame);
      const t = (now - t0) / 1000, warp = reduced ? 0 : Math.max(0, 1 - t / 4.2), lt = light();
      const cx = W > 900 ? W * 0.68 : W * 0.5, cy = W > 900 ? H * 0.5 : H * 0.36;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      ctx.strokeStyle = lt ? 'rgb(40,80,180)' : 'rgb(120,200,255)';
      for (const s of field) {
        if (!reduced) s.z -= (0.0015 + warp * 0.03) * s.s;
        if (s.z <= 0.02) { s.z = 1; s.x = Math.random(); s.y = Math.random(); }
        const k = 1 / s.z, x = cx + (s.x - 0.5) * W * k * 0.5, y = cy + (s.y - 0.5) * H * k * 0.5;
        const len = 2 + warp * 60 * s.s, dx = x - cx, dy = y - cy, dl = Math.hypot(dx, dy) || 1;
        ctx.globalAlpha = (0.08 + 0.35 * (1 - s.z)) * (0.4 + warp) * (lt ? 0.6 : 1);
        ctx.lineWidth = 0.6 + (1 - s.z) * 1.2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dx / dl * len, y - dy / dl * len); ctx.stroke();
      }
    }
    raf = requestAnimationFrame(frame);
    resumeStars = () => { if (!raf) raf = requestAnimationFrame(frame); };
  })();

  /* ---------------- cartoon assembly ---------------- */
  // blue → sky → cyan → mint → pale mint along the chain order; neighbours alternate slightly in lightness
  const STOPS = {
    dark: ['#6a82ff', '#5aa2ff', '#62c4ff', '#7fe2fb', '#4ff3d6', '#dcfbf5'],
    light: ['#3346c4', '#2563eb', '#0b87cc', '#0891b2', '#0d9488', '#1fae9a'],
  };
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function chainColor(i, n) {
    const st = STOPS[light() ? 'light' : 'dark'], u = (n > 1 ? i / (n - 1) : 0) * (st.length - 1), lo = Math.floor(u);
    const a = rgb(st[lo]), b = rgb(st[Math.min(st.length - 1, lo + 1)]), f = u - lo, k = i % 2 ? 0.94 : 1.06;
    return '#' + a.map((x, j) => Math.max(0, Math.min(255, Math.round((x + (b[j] - x) * f) * k))).toString(16).padStart(2, '0')).join('');
  }
  const styleOf = (i, n) => ({ cartoon: { color: chainColor(i, n), thickness: 0.6 } });
  const bg = () => (light() ? '#f5f7fb' : '#04060c');
  const label = document.getElementById('heroLabel');
  let v = null, models = [], assembled = false;

  function build() {
    need3Dmol().then(() => struct('7QVE')).then((s) => {
      // big assembly → no supersampling and a coarser cartoon mesh (as in the large-assembly viewer)
      v = $3Dmol.createViewer(host, { backgroundColor: bg(), backgroundAlpha: 0, antialias: false, cartoonQuality: 3, disableFog: true });
      const byChain = new Map();
      for (const line of s.text.split('\n')) {
        if (!line.startsWith('ATOM')) continue;
        const c = line[21];
        if (!byChain.has(c)) byChain.set(c, []);
        byChain.get(c).push(line);
      }
      models = [...byChain.values()].map((lines) => { const m = v.addModel(lines.join('\n') + '\nEND\n', 'pdb'); m.setStyle({}, {}); return m; });
      v.zoomTo(); v.zoom(0.7); v.render(); // leave margin: the complex is tall and spins about y
      assemble();
    }).catch((e) => console.warn('hero structure', e));
  }

  function assemble() {
    const n = models.length;
    const all = models.flatMap((m) => m.selectedAtoms({}));
    const c0 = [0, 1, 2].map((k) => all.reduce((a, at) => a + (k === 0 ? at.x : k === 1 ? at.y : at.z), 0) / all.length);
    let R = 0;
    for (const at of all) R = Math.max(R, Math.hypot(at.x - c0[0], at.y - c0[1], at.z - c0[2]));
    // each chain flies in along the outward direction from the complex centre (and a little toward the viewer)
    const jobs = models.map((m, i) => {
      const atoms = m.selectedAtoms({}), home = atoms.map((a) => [a.x, a.y, a.z]);
      const cc = [0, 1, 2].map((k) => home.reduce((a, p) => a + p[k], 0) / home.length);
      const d = [cc[0] - c0[0], cc[1] - c0[1], cc[2] - c0[2]], l = Math.hypot(...d) || 1;
      return { m, atoms, home, off: [d[0] / l * R * 1.6, d[1] / l * R * 1.6, d[2] / l * R * 1.6 + R * 0.6], t0: i * 0.11, dur: 0.75, launched: false, done: false, style: styleOf(i, n) };
    });
    // A chain is meshed once, with its atoms parked at the start of its flight path; the flight itself only
    // moves that mesh (renderedMolObj.position) home, so no geometry is rebuilt while chains are moving.
    const launch = (j) => {
      j.atoms.forEach((a, q) => { a.x = j.home[q][0] + j.off[0]; a.y = j.home[q][1] + j.off[1]; a.z = j.home[q][2] + j.off[2]; });
      j.m.setStyle({}, j.style);
      j.launched = true;
    };
    const move = (j, e) => { const o = j.m.renderedMolObj; if (o) o.position.set(-j.off[0] * e, -j.off[1] * e, -j.off[2] * e); };
    const land = (j) => {
      move(j, 1);
      // atoms back home so any later rebuild (theme switch) meshes the chain in place with a zero offset
      j.atoms.forEach((a, q) => { a.x = j.home[q][0]; a.y = j.home[q][1]; a.z = j.home[q][2]; });
      j.done = true;
    };
    const finish = () => {
      assembled = true;
      if (label) label.textContent = `7QVE · ${n} chains · 6,792 residues`;
      if (visible && !reduced) v.spin('y', 0.25);
    };
    host.classList.add('on');
    if (reduced) { jobs.forEach((j) => j.m.setStyle({}, j.style)); v.render(); finish(); return; }
    const tStart = performance.now();
    (function tick(now) {
      const t = (now - tStart) / 1000;
      let placed = 0;
      for (const j of jobs) {
        if (j.done) { placed++; continue; }
        const u = (t - j.t0) / j.dur;
        if (u <= 0) continue;
        if (!j.launched) { launch(j); continue; } // its mesh is built by this frame's render
        if (u >= 1) { land(j); placed++; } else move(j, 1 - Math.pow(1 - u, 3));
      }
      v.render();
      if (label) label.textContent = `placing chain ${Math.min(n, placed + 1)} / ${n}`;
      if (placed < n) requestAnimationFrame(tick); else finish();
    })(tStart);
  }

  build(); // deferred script: the DOM is parsed, so start fetching 3Dmol + 7QVE right away

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible) resumeStars();
      if (v && assembled && !reduced) v.spin(visible ? 'y' : false, 0.25);
    }).observe(host);
  }
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => v && v.resize(), 150); });
  document.addEventListener('tc-theme', () => {
    if (!v) return;
    v.setBackgroundColor(bg(), 0);
    models.forEach((m, i) => m.setStyle({}, styleOf(i, models.length)));
    v.render();
  });
})();
