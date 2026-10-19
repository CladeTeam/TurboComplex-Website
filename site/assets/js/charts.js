/* All ECharts panels. Each entry builds its chart lazily when scrolled into view (see main.js). */
(function () {
  const D = window.TC_DATA, X = window.TC_EXTRA;

  // Colours come from the active theme's CSS tokens; refresh() re-reads them when the theme flips.
  const MODELS = ['AlphaFold 3', 'Boltz-1', 'Boltz-2', 'Chai-1', 'OpenFold3', 'Protenix v0.5', 'Protenix v1.0'];
  const ALIAS = { 'AF3': 'AlphaFold 3', 'Protenix-0.5': 'Protenix v0.5', 'Protenix-1.0': 'Protenix v1.0' };
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function palette() {
    const L = document.documentElement.dataset.theme === 'light';
    return {
      light: L, text: css('--text'), text2: css('--text-2'), muted: css('--muted'),
      turbo: css('--turbo'), turbo2: css('--turbo-2'), violet: css('--violet'), hot: css('--hot'), red: css('--red'), base: css('--base'),
      ink: L ? '#0f172a' : '#ffffff', grid: L ? '#1c2d55' : '#94aadc', dot: L ? '#5d6a86' : '#94a0be',
      tipBg: css('--tip-bg'), neutral: L ? '#8b95aa' : '#9aa3b8', blue: L ? '#2563eb' : '#6aa8ff', onBar: L ? '#ffffff' : '#04121a',
      m: MODELS.map((_, i) => css('--m' + i)),
    };
  }
  let C = palette();
  const mcolor = (m) => { const i = MODELS.indexOf(ALIAS[m] || m); return i < 0 ? C.base : C.m[i]; };
  const mvar = (m) => { const i = MODELS.indexOf(ALIAS[m] || m); return i < 0 ? 'var(--base)' : `var(--m${i})`; };
  const fmt = (v, d = 0) => (v == null ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const hexA = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };

  const axis = (o = {}) => { const a = Object.assign({
    axisLine: { lineStyle: { color: hexA(C.grid, C.light ? 0.2 : 0.14) } }, axisTick: { show: false },
    axisLabel: { color: C.muted, fontFamily: 'Inter', fontSize: 11.5 },
    splitLine: { lineStyle: { color: hexA(C.grid, 0.07) } },
    nameTextStyle: { color: C.muted, fontFamily: 'Inter', fontSize: 12 },
  }, o);
    if (a.name && a.nameLocation !== 'middle') a.nameTextStyle = Object.assign({}, a.nameTextStyle, { align: 'left' });
    return a;
  };
  const tooltip = (o = {}) => Object.assign({
    backgroundColor: C.tipBg, borderColor: hexA(C.grid, 0.25), borderWidth: 1, padding: [8, 12],
    textStyle: { color: C.text, fontFamily: 'Inter', fontSize: 12.5 }, extraCssText: 'border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.5);',
  }, o);
  const base = (o) => Object.assign({ backgroundColor: 'transparent', textStyle: { fontFamily: 'Inter', color: C.text2 }, animationDuration: 1200, animationEasing: 'cubicOut' }, o);
  const legend = (o = {}) => Object.assign({ textStyle: { color: C.text2, fontSize: 12 }, itemWidth: 14, itemHeight: 9, icon: 'roundRect', top: 0 }, o);
  let hatch;
  const mkHatch = () => ({ symbol: 'rect', symbolSize: 1, dashArrayX: [1, 0], dashArrayY: [3, 5], rotation: -Math.PI / 4, color: hexA(C.ink, C.light ? 0.22 : 0.28) });
  hatch = mkHatch();

  // One debounced resize for every chart, and each chart's render loop (ripples, line effects) is paused
  // while it is off-screen so idle charts cost nothing during scroll.
  const all = [];
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => all.forEach((c) => !c.isDisposed() && c.resize()), 150); });
  const onScreen = new WeakMap();
  // resume alone leaves zrender's loop asleep if it went idle while paused, so wake it explicitly
  const setRunning = (ch, on) => {
    const zr = ch.getZr(), a = zr.animation;
    if (on) { a.resume && a.resume(); zr.wakeUp && zr.wakeUp(); zr.refresh(); } else if (a.pause) a.pause();
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => {
    onScreen.set(e.target, e.isIntersecting);
    const ch = echarts.getInstanceByDom(e.target); if (ch) setRunning(ch, e.isIntersecting);
  }), { rootMargin: '80px 0px' }) : null;
  function make(el) {
    const ch = echarts.init(el, null, { renderer: 'canvas' });
    all.push(ch);
    if (io) io.observe(el);
    if (onScreen.get(el) === false) setRunning(ch, false);
    return ch;
  }

  function seg(id, cb) {
    const s = document.getElementById(id);
    if (!s) return;
    s._cb = cb;
    if (s._bound) return;
    s._bound = true;
    s.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.classList.contains('on')) return;
      s.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      s._cb(b.dataset.v);
    });
  }
  const segVal = (id, dflt) => { const b = document.querySelector(`#${id} button.on`); return b ? b.dataset.v : dflt; };

  const B = {};

  /* ---------------- 03 Boltz-2 stack ---------------- */
  B.stackChart = (el) => {
    const st = X.boltzStack.stages, b0 = st[0].s;
    const short = ['Default', 'Sampling +\nrecycling', 'TensorRT\nFP16', 'Systems\nengineering'];
    const ch = make(el);
    ch.setOption(base({
      grid: { left: 64, right: 20, top: 30, bottom: 54 },
      tooltip: tooltip({ trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: hexA(C.turbo, 0.05) } },
        formatter: (p) => { const i = p[0].dataIndex; return `<b>${st[i].key}</b><br><span style="color:${C.muted}">${st[i].note}</span><br>${fmt(st[i].s)} s · ${(b0 / st[i].s).toFixed(2)}× vs default`; } }),
      xAxis: axis({ type: 'category', data: short, axisLabel: { color: C.text2, fontSize: 12, lineHeight: 15, interval: 0 } }),
      yAxis: axis({ type: 'value', name: 'seconds, 239 targets', nameGap: 12, axisLabel: { color: C.muted, formatter: (v) => fmt(v) } }),
      series: [{
        type: 'bar', barWidth: '54%',
        data: st.map((s, i) => ({ value: s.s, itemStyle: { borderRadius: [8, 8, 2, 2], color: i === 0 ? { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#8a93ab' }, { offset: 1, color: '#3c4458' }] } : { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: i === st.length - 1 ? C.turbo2 : C.turbo }, { offset: 1, color: hexA(C.blue, 0.25) }] }, shadowBlur: i ? 18 : 0, shadowColor: hexA(C.turbo, 0.35) } })),
        label: { show: true, position: 'top', color: C.text, fontFamily: 'JetBrains Mono', fontSize: 12, lineHeight: 20, formatter: (p) => (p.dataIndex ? `{x|${(b0 / p.value).toFixed(1)}×}\n${fmt(p.value)} s` : `${fmt(p.value)} s`), rich: { x: { color: C.turbo, fontWeight: 700, fontSize: 16, lineHeight: 22, fontFamily: 'Space Grotesk' } } },
        animationDelay: (i) => i * 220,
      }],
    }));
    return ch;
  };

  /* ---------------- 04 Pareto explorer ---------------- */
  const SYM = { 0.05: 'circle', 0.1: 'rect', 0.15: 'triangle', 0.2: 'diamond' };
  const SS_PAL = ['#3a2c8f', '#3060d8', '#1fa6d0', '#2fd8b0', '#9ef06a', '#f5f06a'];
  function paretoFront(pts) {
    const s = [...pts].sort((a, b) => a.t - b.t || b.iptm - a.iptm);
    const out = []; let best = -1;
    for (const p of s) if (p.iptm > best + 1e-9) { out.push(p); best = p.iptm; }
    return out;
  }
  B.paretoChart = (el) => {
    const ch = make(el);
    const side = document.getElementById('paretoSide');
    function draw(model) {
      const g = D.grid[model].map((p) => ({ ...p, tm: p.t / 60 }));
      const front = paretoFront(g);
      const bestScore = front.reduce((b, p) => { const sc = Math.pow(p.iptm, 20) / p.tm; return sc > b.sc ? { sc, p } : b; }, { sc: -1 }).p;
      const def = D.bench.pp[model].baseline;
      const sel = D.bench.pp[model].optimised;
      const dsSize = { 2: 7, 5: 11, 8: 15 };
      ch.setOption(base({
        grid: { left: 58, right: 24, top: 34, bottom: 50 },
        tooltip: tooltip({ formatter: (p) => {
          const d = p.data && p.data.raw; if (!d) return p.seriesName;
          return `<b>SS ${d.ss} · DS ${d.ds} · TH ${d.th}</b><br>time ${fmt(d.tm, 1)} min · ipTM ${d.iptm.toFixed(4)}`;
        } }),
        visualMap: { show: false, dimension: 2, min: 20, max: 200, inRange: { color: SS_PAL }, seriesIndex: 0 },
        xAxis: axis({ type: 'value', name: 'total inference time (GPU-min, 239 targets)', nameLocation: 'middle', nameGap: 30, scale: true, axisLabel: { color: C.muted, formatter: (v) => fmt(v) } }),
        yAxis: axis({ type: 'value', name: 'mean ipTM', scale: true, axisLabel: { color: C.muted, formatter: (v) => v.toFixed(3) } }),
        series: [
          { name: 'configs', type: 'scatter', data: g.map((p) => ({ value: [p.tm, p.iptm, p.ss], raw: p, symbol: SYM[p.th], symbolSize: dsSize[p.ds] })), itemStyle: { opacity: 0.85, borderColor: 'rgba(0,0,0,0.35)', borderWidth: 0.5 }, emphasis: { scale: 1.6 }, animationDelay: (i) => i * 6 },
          { name: 'Pareto front', type: 'line', step: 'end', data: front.map((p) => [p.tm, p.iptm]), symbol: 'circle', symbolSize: 14, itemStyle: { color: 'transparent', borderColor: C.ink, borderWidth: 1.6 }, lineStyle: { color: hexA(C.ink, 0.55), width: 1.2, type: 'dashed' }, z: 3, silent: true, animationDuration: 2200 },
          { name: 'default', type: 'scatter', data: [{ value: [def.time_min, def.iptm], raw: { ss: 'default', ds: '', th: '', tm: def.time_min, iptm: def.iptm } }], symbol: 'path://M50 0 L61 35 L98 35 L68 57 L79 91 L50 70 L21 91 L32 57 L2 35 L39 35 Z', symbolSize: 24, itemStyle: { color: C.red, shadowBlur: 14, shadowColor: C.red }, z: 5,
            label: { show: true, position: 'left', formatter: 'default', color: C.red, fontFamily: 'JetBrains Mono', fontSize: 11 } },
          { name: 'best', type: 'effectScatter', data: [{ value: [bestScore.tm, bestScore.iptm], raw: bestScore }], symbolSize: 18, rippleEffect: { scale: 3, brushType: 'stroke' }, itemStyle: { color: 'transparent', borderColor: C.hot, borderWidth: 3 }, z: 6,
            label: { show: true, position: 'right', formatter: `(${bestScore.ss}, ${bestScore.ds}, ${bestScore.th})`, color: C.hot, fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 700 } },
        ],
      }), true);
      const red = (1 - bestScore.tm / def.time_min) * 100;
      side.innerHTML = `
        <div class="ps-card"><h4>Default</h4><div class="big">${fmt(def.time_min, 1)}<small style="font-size:14px;color:${C.muted}"> min</small></div><div class="cfg">ipTM ${def.iptm.toFixed(3)}</div></div>
        <div class="ps-card best"><h4>Best ipTM²⁰ / time on front</h4><div class="big">−${red.toFixed(1)}%</div><div class="cfg">SS ${bestScore.ss} · DS ${bestScore.ds} · TH ${bestScore.th}<br>${fmt(bestScore.tm, 1)} min · ipTM ${bestScore.iptm.toFixed(3)}</div></div>
        <div class="ps-card"><h4>Searched</h4><div class="big">${g.length}</div><div class="cfg">full-benchmark runs · ${front.length} Pareto-optimal<br>${fmt(g.reduce((a, p) => a + p.t, 0) / 3600, 0)} GPU-hours</div></div>
        <div class="ps-card legend-mini">
          <div class="row"><b style="color:${C.text2}">SS</b>${[20, 60, 100, 140, 200].map((v, i) => `<span class="sw" style="background:${SS_PAL[Math.round(i * 5 / 4)]}"></span>${v}`).join(' ')}</div>
          <div class="row"><b style="color:${C.text2}">DS</b> size: small 2 · mid 5 · large 8</div>
          <div class="row"><b style="color:${C.text2}">TH</b> ● 0.05 ■ 0.10 ▲ 0.15 ◆ 0.20</div>
        </div>`;
      void sel;
    }
    draw(segVal('gridModel', 'AlphaFold 3'));
    seg('gridModel', draw);
    return ch;
  };

  /* ---------------- 04 Model comparison ---------------- */
  B.cmpChart = (el) => {
    const ch = make(el);
    let task = segVal('cmpTask', 'pp'), metric = segVal('cmpMetric', 'time_min');
    const label = { time_min: 'total time (GPU-min)', iptm: 'mean ipTM', ptm: 'mean pTM', success: 'DockQ ≥ 0.23 (%)' };
    function draw() {
      const b = D.bench[task];
      const base0 = MODELS.map((m) => b[m].baseline[metric]);
      const opt = MODELS.map((m) => b[m].optimised[metric]);
      const isTime = metric === 'time_min';
      const lo = isTime ? 0 : Math.max(0, Math.min(...base0, ...opt) - (metric === 'success' ? 10 : 0.08));
      ch.setOption(base({
        grid: { left: 52, right: 12, top: 40, bottom: 58 },
        legend: legend({ data: ['Baseline', 'TurboComplex'], right: 0 }),
        tooltip: tooltip({ trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: hexA(C.turbo, 0.05) } },
          formatter: (p) => { const i = p[0].dataIndex; const a = base0[i], o = opt[i];
            return `<b>${MODELS[i]}</b><br>baseline ${isTime ? fmt(a, 1) : a.toFixed(metric === 'success' ? 2 : 4)}<br>TurboComplex ${isTime ? fmt(o, 1) : o.toFixed(metric === 'success' ? 2 : 4)}<br>${isTime ? `<b style="color:${C.turbo}">${(a / o).toFixed(2)}× faster</b>` : `Δ ${(o - a >= 0 ? '+' : '')}${(o - a).toFixed(metric === 'success' ? 2 : 4)}`}`; } }),
        xAxis: axis({ type: 'category', data: MODELS.map((m) => m.replace('Protenix ', 'Protenix\n').replace('AlphaFold 3', 'AF3')), axisLabel: { color: C.text2, fontSize: 11.5, interval: 0, lineHeight: 14 } }),
        yAxis: axis({ type: 'value', name: label[metric], min: lo, axisLabel: { color: C.muted, formatter: (v) => (isTime || metric === 'success' ? fmt(v) : v.toFixed(2)) } }),
        series: [
          { name: 'Baseline', type: 'bar', barGap: '12%', barWidth: '32%', data: base0.map((v, i) => ({ value: v, itemStyle: { color: hexA(mcolor(MODELS[i]), 0.28), borderColor: hexA(mcolor(MODELS[i]), 0.7), borderWidth: 1, decal: hatch, borderRadius: [5, 5, 0, 0] } })) },
          { name: 'TurboComplex', type: 'bar', barWidth: '32%', data: opt.map((v, i) => ({ value: v, itemStyle: { color: mcolor(MODELS[i]), borderRadius: [5, 5, 0, 0], shadowBlur: 12, shadowColor: hexA(mcolor(MODELS[i]), 0.45) } })),
            label: { show: true, position: 'top', fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700,
              formatter: (p) => { const a = base0[p.dataIndex]; const o = p.value; if (isTime) return `${(a / o).toFixed(1)}×`; const d = o - a; return (d >= 0 ? '+' : '') + d.toFixed(metric === 'success' ? 1 : 3); },
              color: C.text } },
        ],
      }), true);
      ch.setOption({ legend: { data: [{ name: 'Baseline', itemStyle: { color: hexA(C.dot, 0.35), decal: hatch } }, { name: 'TurboComplex', itemStyle: { color: C.turbo } }] } });
      document.getElementById('cmpNote').textContent = isTime ? `Speed-up = baseline time ÷ accelerated time · ${task === 'pp' ? '239 protein–protein' : '190 protein–DNA'} targets.` : 'Labels: change of the accelerated configuration relative to baseline.';
    }
    draw();
    seg('cmpTask', (v) => { task = v; draw(); });
    seg('cmpMetric', (v) => { metric = v; draw(); });
    return ch;
  };

  /* ---------------- 04 Time vs DockQ arrows ---------------- */
  B.arrowChart = (el) => {
    const ch = make(el);
    function draw(task) {
      const b = D.bench[task];
      const lines = MODELS.map((m) => ({ coords: [[b[m].baseline.time_min, b[m].baseline.dockq], [b[m].optimised.time_min, b[m].optimised.dockq]], lineStyle: { color: mcolor(m) } }));
      ch.setOption(base({
        grid: { left: 54, right: 20, top: 34, bottom: 50 },
        tooltip: tooltip({ formatter: (p) => { const m = p.data.m; if (!m) return ''; const a = b[m].baseline, o = b[m].optimised;
          return `<b>${m}</b><br>${fmt(a.time_min, 1)} → ${fmt(o.time_min, 1)} min (−${((1 - o.time_min / a.time_min) * 100).toFixed(1)}%)<br>DockQ ${a.dockq.toFixed(3)} → ${o.dockq.toFixed(3)} (${o.dockq >= a.dockq ? '+' : ''}${(((o.dockq / a.dockq) - 1) * 100).toFixed(2)}%)`; } }),
        xAxis: axis({ type: 'log', name: 'total time (GPU-min, log)', nameLocation: 'middle', nameGap: 30, min: 10, max: 500, axisLabel: { color: C.muted } }),
        yAxis: axis({ type: 'value', name: 'mean DockQ', scale: true, axisLabel: { color: C.muted, formatter: (v) => v.toFixed(2) } }),
        series: [
          { type: 'lines', coordinateSystem: 'cartesian2d', data: lines, symbol: ['none', 'arrow'], symbolSize: 10, lineStyle: { width: 2, opacity: 0.85, curveness: 0.12 }, effect: { show: true, period: 2.4, trailLength: 0.4, symbol: 'circle', symbolSize: 5, color: '#fff' }, z: 2 },
          { name: 'baseline', type: 'scatter', data: MODELS.map((m) => ({ value: [b[m].baseline.time_min, b[m].baseline.dockq], m, itemStyle: { color: 'transparent', borderColor: mcolor(m), borderWidth: 2 } })), symbolSize: 12, z: 3 },
          { name: 'TurboComplex', type: 'scatter', data: MODELS.map((m) => ({ value: [b[m].optimised.time_min, b[m].optimised.dockq], m, itemStyle: { color: mcolor(m), shadowBlur: 12, shadowColor: mcolor(m) } })), symbolSize: 13, z: 4,
            label: { show: true, position: 'left', distance: 8, formatter: (p) => p.data.m.replace('AlphaFold 3', 'AF3'), color: C.text2, fontSize: 11 } },
        ],
      }), true);
    }
    draw(segVal('arrowTask', 'pp'));
    seg('arrowTask', draw);
    return ch;
  };

  /* ---------------- 04 DockQ survival ---------------- */
  B.survChart = (el) => {
    const ch = make(el);
    const chips = document.getElementById('survModels');
    let task = segVal('survTask', 'pp');
    const prev = [...chips.querySelectorAll('.chip.on')].map((c) => c.dataset.m);
    const on = new Set(chips.children.length ? prev : ['Boltz-1', 'OpenFold3', 'Protenix v1.0']);
    chips.innerHTML = MODELS.map((m) => `<span class="chip${on.has(m) ? ' on' : ''}" data-m="${m}" style="--c:${mvar(m)}"><i></i>${m}</span>`).join('');
    chips.onclick = ((e) => { const c = e.target.closest('.chip'); if (!c) return; const m = c.dataset.m; on.has(m) ? on.delete(m) : on.add(m); c.classList.toggle('on'); draw(); });
    const cuts = Array.from({ length: 51 }, (_, i) => i / 50);
    function draw() {
      const S = D.survival[task];
      const series = [];
      [...on].forEach((m) => {
        series.push({ name: `${m} · baseline`, type: 'line', data: cuts.map((c, i) => [c, S[m].baseline[i]]), showSymbol: false, smooth: 0.2, lineStyle: { color: mcolor(m), width: 1.6, type: 'dashed', opacity: 0.8 }, itemStyle: { color: mcolor(m) } });
        series.push({ name: `${m} · TurboComplex`, type: 'line', data: cuts.map((c, i) => [c, S[m].optimised[i]]), showSymbol: false, smooth: 0.2, lineStyle: { color: mcolor(m), width: 2.6 }, itemStyle: { color: mcolor(m) } });
      });
      series.push({ type: 'line', data: [], markArea: { silent: true, data: [
        [{ xAxis: 0.23, itemStyle: { color: hexA(C.turbo, 0.035) }, label: { show: true, formatter: 'acceptable', color: C.muted, fontSize: 10.5, position: 'insideTop' } }, { xAxis: 0.49 }],
        [{ xAxis: 0.49, itemStyle: { color: hexA(C.turbo, 0.07) }, label: { show: true, formatter: 'medium', color: C.muted, fontSize: 10.5, position: 'insideTop' } }, { xAxis: 0.8 }],
        [{ xAxis: 0.8, itemStyle: { color: hexA(C.turbo, 0.11) }, label: { show: true, formatter: 'high', color: C.muted, fontSize: 10.5, position: 'insideTop' } }, { xAxis: 1 }],
      ] } });
      ch.setOption(base({
        grid: { left: 50, right: 20, top: 56, bottom: 46 },
        tooltip: tooltip({ trigger: 'axis', valueFormatter: (v) => (v * 100).toFixed(1) + '%', formatter: (ps) => `DockQ > ${ps[0].value[0].toFixed(2)}<br>` + ps.filter((p) => p.seriesName).map((p) => `${p.marker}${p.seriesName}: <b>${(p.value[1] * 100).toFixed(1)}%</b>`).join('<br>') }),
        xAxis: axis({ type: 'value', min: 0, max: 1, name: 'DockQ threshold', nameLocation: 'middle', nameGap: 28 }),
        yAxis: axis({ type: 'value', min: 0, max: 1, name: 'fraction above', axisLabel: { color: C.muted, formatter: (v) => (v * 100).toFixed(0) + '%' } }),
        series,
      }), true);
    }
    draw();
    seg('survTask', (v) => { task = v; draw(); });
    return ch;
  };

  /* ---------------- 05 PPI runtime ---------------- */
  B.rtChart = (el) => {
    const ch = make(el);
    const rt = [...D.ppi.runtime].sort((a, b) => a.human_h - b.human_h);
    const isTC = (m) => m.startsWith('TC-PPI');
    ch.setOption(base({
      grid: { left: 118, right: 86, top: 10, bottom: 40 },
      tooltip: tooltip({ formatter: (p) => { const r = rt[p.dataIndex]; return `<b>${r.model}</b><br>Human ${fmt(r.human_h, 2)} GPU·h · Micro ${fmt(r.micro_h, 2)} GPU·h<br>${fmt(r.speedup, 2)}× vs AF3 (geo-mean)`; } }),
      xAxis: axis({ type: 'log', min: 0.1, max: 30000, name: 'GPU-hours (Human, log)', nameLocation: 'middle', nameGap: 26, axisLabel: { color: C.muted, formatter: (v) => fmt(v, v < 1 ? 1 : 0) } }),
      yAxis: axis({ type: 'category', data: rt.map((r) => r.model), axisLabel: { color: C.text2, fontSize: 12, formatter: (v) => (isTC(v) ? `{tc|${v}}` : v), rich: { tc: { color: C.turbo, fontWeight: 700 } } } }),
      series: [{ type: 'bar', barWidth: '62%', data: rt.map((r) => ({ value: r.human_h, itemStyle: { borderRadius: [0, 6, 6, 0], color: isTC(r.model) ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: hexA(C.turbo2, 0.3) }, { offset: 1, color: C.turbo2 }] } : r.model.startsWith('RF2') ? hexA(C.dot, 0.55) : hexA(mcolor(r.model), 0.75), shadowBlur: isTC(r.model) ? 16 : 0, shadowColor: hexA(C.turbo2, 0.6) } })),
        label: { show: true, position: 'right', fontFamily: 'JetBrains Mono', fontSize: 11, color: C.text2, formatter: (p) => { const r = rt[p.dataIndex]; return r.model === 'AF3' ? `${fmt(r.human_h)} h` : `{x|${r.speedup >= 1000 ? fmt(r.speedup) : r.speedup.toFixed(r.speedup >= 100 ? 0 : 1)}×}`; }, rich: { x: { color: C.turbo, fontWeight: 700, fontSize: 12.5, fontFamily: 'Space Grotesk' } } },
        animationDelay: (i) => (rt.length - i) * 90 }],
    }));
    return ch;
  };

  /* ---------------- 05 AUC ---------------- */
  B.aucChart = (el) => {
    const ch = make(el);
    let set = segVal('aucSet', 'Human'), metric = segVal('aucMetric', 'pr_auc');
    function draw() {
      const M = D.ppi.metrics[set];
      const rows = Object.keys(M).map((m) => ({ m, v: M[m].Original[metric] })).filter((r) => r.v != null).sort((a, b) => a.v - b.v);
      ch.setOption(base({
        grid: { left: 118, right: 50, top: 10, bottom: 34 },
        tooltip: tooltip({ formatter: (p) => `<b>${rows[p.dataIndex].m}</b><br>${metric === 'pr_auc' ? 'AUPRC' : 'AUROC'} ${p.value.toFixed(3)}` }),
        xAxis: axis({ type: 'value', min: metric === 'roc_auc' ? 0.4 : 0, max: metric === 'roc_auc' ? 0.9 : null }),
        yAxis: axis({ type: 'category', data: rows.map((r) => r.m), axisLabel: { color: C.text2, fontSize: 12, formatter: (v) => (v.startsWith('TC') ? `{tc|${v}}` : v), rich: { tc: { color: C.turbo, fontWeight: 700 } } } }),
        series: [{ type: 'bar', barWidth: '62%', data: rows.map((r) => ({ value: r.v, itemStyle: { borderRadius: [0, 6, 6, 0], color: r.m.startsWith('TC') ? C.turbo2 : r.m.startsWith('RF2') ? hexA(C.dot, 0.55) : hexA(mcolor(r.m), 0.65), shadowBlur: r.m.startsWith('TC') ? 16 : 0, shadowColor: hexA(C.turbo2, 0.6) } })),
          label: { show: true, position: 'right', fontFamily: 'JetBrains Mono', fontSize: 11, color: C.text2, formatter: (p) => p.value.toFixed(3) } }],
      }), true);
    }
    draw();
    seg('aucSet', (v) => { set = v; draw(); });
    seg('aucMetric', (v) => { metric = v; draw(); });
    return ch;
  };

  /* ---------------- 05 Metric fitting dumbbell ---------------- */
  B.fitChart = (el) => {
    const ch = make(el);
    function draw(set) {
      const M = D.ppi.metrics[set];
      const ms = Object.keys(M).filter((m) => M[m].Fitted);
      ms.sort((a, b) => M[a].Fitted.pr_auc - M[b].Fitted.pr_auc);
      ch.setOption(base({
        grid: { left: 100, right: 70, top: 14, bottom: 36 },
        tooltip: tooltip({ formatter: (p) => { const m = ms[p.dataIndex]; const o = M[m].Original.pr_auc, f = M[m].Fitted.pr_auc; return `<b>${m}</b><br>raw ${o.toFixed(3)} → fitted ${f.toFixed(3)}<br><b style="color:${C.turbo}">${(f / o).toFixed(2)}×</b>`; } }),
        xAxis: axis({ type: 'value', min: 0, max: set === 'Human' ? 0.8 : 0.5, name: 'AUPRC', nameLocation: 'middle', nameGap: 24 }),
        yAxis: axis({ type: 'category', data: ms, axisLabel: { color: C.text2, fontSize: 12 } }),
        series: [
          { type: 'custom', renderItem: (params, api) => { const a = api.coord([api.value(1), api.value(0)]), b = api.coord([api.value(2), api.value(0)]); return { type: 'line', shape: { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, style: { stroke: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: hexA(C.grid, 0.25) }, { offset: 1, color: mcolor(ms[params.dataIndex]) }] }, lineWidth: 4, lineCap: 'round' } }; },
            data: ms.map((m, i) => [i, M[m].Original.pr_auc, M[m].Fitted.pr_auc]), encode: { x: [1, 2], y: 0 }, z: 1 },
          { type: 'scatter', data: ms.map((m) => ({ value: [M[m].Original.pr_auc, m], itemStyle: { color: C.tipBg, borderColor: mcolor(m), borderWidth: 2 } })), symbolSize: 12, z: 2 },
          { type: 'scatter', data: ms.map((m) => ({ value: [M[m].Fitted.pr_auc, m], itemStyle: { color: mcolor(m), shadowBlur: 12, shadowColor: mcolor(m) } })), symbolSize: 14, z: 3,
            label: { show: true, position: 'right', fontFamily: 'JetBrains Mono', fontSize: 11, color: C.turbo, fontWeight: 700, formatter: (p) => `+${((M[ms[p.dataIndex]].Fitted.pr_auc / M[ms[p.dataIndex]].Original.pr_auc - 1) * 100).toFixed(0)}%` } },
        ],
      }), true);
    }
    draw(segVal('fitSet', 'Human'));
    seg('fitSet', draw);
    return ch;
  };

  /* ---------------- 05 Wet donut ---------------- */
  B.wetChart = (el) => {
    const ch = make(el);
    const w = D.ppi.wet;
    ch.setOption(base({
      tooltip: tooltip({ formatter: (p) => `${p.name}: <b>${fmt(p.value)}</b> (${p.percent}%)` }),
      series: [{ type: 'pie', radius: ['58%', '84%'], center: ['50%', '52%'], startAngle: 90, padAngle: 2, itemStyle: { borderRadius: 6 },
        label: { show: true, position: 'center', formatter: () => `{a|${fmt(w.dry_positive)}}\n{b|dry-positive}`, rich: { a: { fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 700, color: C.text }, b: { color: C.muted, fontSize: 11.5, padding: [4, 0, 0, 0] } } },
        data: [{ name: 'Wet-confirmed', value: w.overlap, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: C.turbo }, { offset: 1, color: C.violet }] }, shadowBlur: 18, shadowColor: hexA(C.turbo, 0.5) } }, { name: 'Not detected', value: w.dry_only, itemStyle: { color: hexA(C.dot, 0.35) } }],
        animationType: 'expansion', animationDuration: 1800 }],
    }));
    return ch;
  };

  /* ---------------- 06 Design yield ---------------- */
  B.yieldChart = (el) => {
    const ch = make(el);
    const t = D.design.yield_t, P = D.design.pooled;
    const conds = [['early_stop', 'Early stop', C.turbo], ['no_early_stop', 'Full sampling', C.neutral]];
    const series = [];
    conds.forEach(([k, name, col]) => {
      const [mean, q25, q75] = P[k].yield;
      series.push({ name: name + ' band', type: 'custom', data: [0], silent: true, tooltip: { show: false }, z: 1,
        renderItem: (params, api) => ({ type: 'polygon', shape: { points: t.map((x, i) => api.coord([x, q75[i]])).concat(t.map((x, i) => api.coord([x, q25[i]])).reverse()) }, style: { fill: hexA(col, 0.22) } }) });
      series.push({ name, type: 'line', data: t.map((x, i) => [x, mean[i]]), showSymbol: false, smooth: true, lineStyle: { color: col, width: 3, shadowBlur: k === 'early_stop' ? 14 : 0, shadowColor: col }, itemStyle: { color: col },
        endLabel: { show: true, formatter: () => `${P[k].slope.toFixed(1)} / GPU·h`, color: col, fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 12 } });
    });
    ch.setOption(base({
      grid: { left: 50, right: 110, top: 56, bottom: 46 },
      legend: legend({ data: conds.map((c) => c[1]), left: 0 }),
      tooltip: tooltip({ trigger: 'axis', formatter: (ps) => `${ps[0].value[0].toFixed(2)} GPU·h<br>` + ps.filter((p) => !/lo|band/.test(p.seriesName)).map((p) => `${p.marker}${p.seriesName}: <b>${p.value[1].toFixed(0)}</b> designs`).join('<br>') }),
      xAxis: axis({ type: 'value', name: 'GPU budget (h)', nameLocation: 'middle', nameGap: 28, max: Math.ceil(t[t.length - 1] * 10) / 10 }),
      yAxis: axis({ type: 'value', name: 'designs with ipTM ≥ 0.7' }),
      series,
      animationDuration: 2400,
    }));
    return ch;
  };

  /* ---------------- 06 Stage time ---------------- */
  B.stageChart = (el) => {
    const ch = make(el);
    const s = D.design.stats;
    const names = ['Pairformer', 'Diffusion', 'Confidence', 'MPNN'];
    const cols = [C.blue, C.turbo, C.violet, C.m[2]];
    ch.setOption(base({
      grid: { left: 100, right: 60, top: 36, bottom: 40 },
      legend: legend({ data: names, left: 0 }),
      tooltip: tooltip({ trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: hexA(C.turbo, 0.05) } }, valueFormatter: (v) => v.toFixed(2) + ' s' }),
      xAxis: axis({ type: 'value', name: 's per round', nameLocation: 'middle', nameGap: 26 }),
      yAxis: axis({ type: 'category', data: ['Full sampling', 'Early stop'], axisLabel: { color: C.text2, fontSize: 13 } }),
      series: names.map((n, i) => ({ name: n, type: 'bar', stack: 'a', barWidth: '46%', data: [s.stage_time_no_early_s[i], s.stage_time_early_s[i]], itemStyle: { color: cols[i], borderColor: C.tipBg, borderWidth: 1.5 },
        label: { show: s.stage_time_early_s[i] > 0.5, formatter: (p) => p.value.toFixed(1), color: C.onBar, fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: 11 } })).concat([{
        type: 'bar', stack: 'a', data: [0, 0], label: { show: true, position: 'right', fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 15, color: C.text, formatter: (p) => `${(p.dataIndex ? s.stage_time_early_s : s.stage_time_no_early_s).reduce((a, b) => a + b, 0).toFixed(1)} s` }, silent: true, tooltip: { show: false } }]),
    }));
    return ch;
  };

  /* ---------------- 06 Targets ---------------- */
  const TGT = { bbf_14: 'BBF-14', betv1: 'Bet v1', cbago_n_piwi_spliced: 'CbAgo N-PIWI', cbago_paz_180_276: 'CbAgo PAZ', cd45: 'CD45', cldn1: 'Claudin-1', crsas_6_15_160: 'CrSAS-6', derf21_25_136: 'Der f21', derf7_18_213: 'Der f7', ifnar2_2lag_a_8_110: 'IFNAR2', pd1: 'PD-1', spcas9_rec1_spliced_96_174_306_446: 'SpCas9 REC1', crp: 'CRP', fnr: 'FNR', h_ns: 'H-NS', laci: 'LacI', lexa: 'LexA', lrp: 'Lrp' };
  B.tgtChart = (el) => {
    const ch = make(el);
    function draw(task) {
      const rows = {};
      D.design.summary.filter((r) => r.task === task).forEach((r) => { (rows[r.target] = rows[r.target] || {})[r.condition] = r; });
      const ts = Object.keys(rows).sort((a, b) => rows[a].early_stop.median_best_iptm - rows[b].early_stop.median_best_iptm);
      const thr = task === 'protein' ? 0.7 : 0.6;
      ch.setOption(base({
        grid: { left: 100, right: 26, top: 30, bottom: 36 },
        legend: legend({ data: ['Early stop', 'Full sampling'], left: 0 }),
        tooltip: tooltip({ trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: hexA(C.turbo, 0.04) } }, formatter: (ps) => { const r = rows[ts[ps[0].dataIndex]]; return `<b>${TGT[ts[ps[0].dataIndex]]}</b><br>early stop ${r.early_stop.median_best_iptm.toFixed(3)} · ${fmt(r.early_stop.median_model_forward_s, 0)} s<br>full ${r.no_early_stop.median_best_iptm.toFixed(3)} · ${fmt(r.no_early_stop.median_model_forward_s, 0)} s`; } }),
        xAxis: axis({ type: 'value', min: 0.2, max: 1, name: 'median best ipTM', nameLocation: 'middle', nameGap: 24 }),
        yAxis: axis({ type: 'category', data: ts.map((t) => TGT[t] || t), axisLabel: { color: C.text2, fontSize: 12 } }),
        series: [
          { type: 'custom', renderItem: (params, api) => { const a = api.coord([api.value(1), api.value(0)]), b = api.coord([api.value(2), api.value(0)]); return { type: 'line', shape: { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, style: { stroke: hexA(C.grid, 0.3), lineWidth: 3, lineCap: 'round' } }; },
            data: ts.map((t, i) => [i, rows[t].early_stop.median_best_iptm, rows[t].no_early_stop.median_best_iptm]), encode: { x: [1, 2], y: 0 }, silent: true },
          { name: 'Full sampling', type: 'scatter', data: ts.map((t, i) => [rows[t].no_early_stop.median_best_iptm, i]), symbolSize: 11, itemStyle: { color: C.neutral } },
          { name: 'Early stop', type: 'scatter', data: ts.map((t, i) => [rows[t].early_stop.median_best_iptm, i]), symbolSize: 12, itemStyle: { color: C.turbo, shadowBlur: 10, shadowColor: C.turbo },
            markLine: { silent: true, symbol: 'none', data: [{ xAxis: thr }], lineStyle: { color: C.turbo2, type: 'dashed' }, label: { formatter: `ipTM ${thr}`, color: C.turbo2, fontSize: 11 } } },
        ],
      }), true);
    }
    draw(segVal('tgtTask', 'protein'));
    seg('tgtTask', draw);
    return ch;
  };

  /* ---------------- 07 Large assemblies ---------------- */
  B.tmChart = (el) => {
    const ch = make(el);
    const L = D.large.top1;
    const ids = Object.keys(L).sort((a, b) => (L[a].pae ?? 0) - (L[b].pae ?? 0));
    const NA = 0.03;
    const cross = 'path://M2 0 L10 8 L18 0 L20 2 L12 10 L20 18 L18 20 L10 12 L2 20 L0 18 L8 10 L0 2 Z';
    const ser = [['pae', 'TurboComplex (staged, PAE)', C.turbo, 15], ['paper', 'CombFold · AF-Multimer (published)', C.violet, 10], ['whole_complex', 'AlphaFold 3 single-shot', C.hot, 10]];
    ch.setOption(base({
      grid: { left: 54, right: 20, top: 52, bottom: 40 },
      legend: legend({ data: ser.map((s) => s[1]), left: 0, width: '100%' }),
      tooltip: tooltip({ trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: hexA(C.grid, 0.2) } }, formatter: (ps) => { const id = ids[ps[0].dataIndex]; return `<b>${id}</b><br>` + ser.map(([k, n, c]) => `<span style="color:${c}">●</span> ${n}: <b>${L[id][k] == null ? 'no model' : L[id][k].toFixed(3)}</b>`).join('<br>'); } }),
      xAxis: axis({ type: 'value', min: 0, max: 1, name: 'TM-score', nameLocation: 'middle', nameGap: 24 }),
      yAxis: axis({ type: 'category', data: ids, axisLabel: { color: C.text2, fontSize: 11, fontFamily: 'JetBrains Mono' }, splitLine: { show: true, lineStyle: { color: hexA(C.grid, 0.07) } } }),
      series: ser.map(([k, n, c, sz], si) => ({ name: n, type: 'scatter', z: 5 - si,
        data: ids.map((id) => (L[id][k] == null ? { value: [NA, id], symbol: cross, symbolSize: 9, itemStyle: { color: c, opacity: 0.85 } } : { value: [L[id][k], id] })),
        symbolSize: sz, itemStyle: { color: c, shadowBlur: si ? 0 : 12, shadowColor: c }, animationDelay: (i) => i * 40 + si * 300 })).concat([{
        type: 'line', data: [], markLine: { silent: true, symbol: 'none', data: [{ xAxis: 0.5 }], lineStyle: { color: hexA(C.grid, 0.35), type: 'dashed' }, label: { formatter: 'TM 0.5', color: C.muted, fontSize: 10.5 } } }]),
    }));
    return ch;
  };

  /* ---------------- 08 Conformations ---------------- */
  B.confChart = (el) => {
    const ch = make(el);
    function draw(model) {
      const rows = D.conf['p21589_' + model];
      const rest = rows.filter((r) => !r[3]), sel = rows.filter((r) => r[3]);
      const bestO = sel.reduce((a, r) => (r[0] > a[0] ? r : a), sel[0]);
      const bestC = sel.reduce((a, r) => (r[1] > a[1] ? r : a), sel[0]);
      ch.setOption(base({
        grid: { left: 50, right: 20, top: 56, bottom: 46 },
        legend: legend({ data: ['other clusters', 'top-10% clusters'], left: 0 }),
        tooltip: tooltip({ formatter: (p) => `TM open ${p.value[0].toFixed(3)} · closed ${p.value[1].toFixed(3)}<br>pLDDT ${p.value[2]}` }),
        xAxis: axis({ type: 'value', min: 0.4, max: 1, name: 'TM-score to open', nameLocation: 'middle', nameGap: 28 }),
        yAxis: axis({ type: 'value', min: 0.4, max: 1, name: 'TM-score to closed' }),
        series: [
          { name: 'other clusters', type: 'scatter', data: rest, symbolSize: 4, itemStyle: { color: hexA(C.dot, 0.35) }, large: true, largeThreshold: 500, silent: true },
          { name: 'top-10% clusters', type: 'scatter', data: sel, symbolSize: 6.5, itemStyle: { color: C.turbo, opacity: 0.9 }, animationDelay: (i) => 600 + i * 3 },
          { type: 'effectScatter', data: [{ value: bestO, name: 'best open', label: { position: 'top' } }, { value: bestC, name: 'best closed' }], symbolSize: 13, itemStyle: { color: C.hot }, rippleEffect: { scale: 3.2, brushType: 'stroke' },
            label: { show: true, position: 'right', formatter: (p) => `${p.name} ${(p.name.includes('open') ? p.value[0] : p.value[1]).toFixed(3)}`, color: C.hot, fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700 }, z: 6 },
        ],
      }), true);
    }
    draw(segVal('confModel', 'boltz2'));
    seg('confModel', draw);
    return ch;
  };

  B.tsneChart = (el) => {
    const ch = make(el);
    const pts = D.conf.tsne;
    const hue = (l) => `hsl(${(l * 137.508) % 360},80%,62%)`;
    const noise = pts.filter((p) => p[2] < 0), cl = pts.filter((p) => p[2] >= 0);
    const ncl = new Set(cl.map((p) => p[2])).size;
    ch.setOption(base({
      grid: { left: 6, right: 6, top: 6, bottom: 22 },
      xAxis: { type: 'value', show: false, scale: true }, yAxis: { type: 'value', show: false, scale: true },
      graphic: [{ type: 'text', left: 8, bottom: 2, style: { text: `${fmt(pts.length)} seqs · ${ncl} clusters`, fill: C.muted, font: '11px JetBrains Mono' } }],
      series: [
        { type: 'scatter', data: noise, symbolSize: 2.5, itemStyle: { color: hexA(C.dot, 0.25) }, large: true, silent: true },
        ...Array.from({ length: 12 }, (_, b) => ({ type: 'scatter', data: cl.filter((p) => p[2] % 12 === b), symbolSize: 3.6, silent: true, large: true, largeThreshold: 200, itemStyle: { color: hue(b * 31 + 7) } })),
      ],
    }));
    return ch;
  };

  B.cxcrChart = (el) => {
    const ch = make(el);
    const rows = D.conf.cxcr4;
    ch.setOption(base({
      grid: { left: 46, right: 54, top: 30, bottom: 44 },
      tooltip: tooltip({ formatter: (p) => `RMSD active ${p.value[0].toFixed(2)} Å · inactive ${p.value[1].toFixed(2)} Å<br>ipTM ${p.value[2].toFixed(3)}` }),
      visualMap: { type: 'continuous', dimension: 2, min: 0.8, max: 0.95, right: 0, top: 'middle', itemHeight: 120, itemWidth: 10, text: ['ipTM', ''], textStyle: { color: C.muted, fontSize: 10.5 }, inRange: { color: ['#2a2f6b', '#3060d8', C.turbo, C.turbo2] }, calculable: false },
      xAxis: axis({ type: 'value', name: 'RMSD to active (Å)', nameLocation: 'middle', nameGap: 26, min: 0.6, max: 2.4 }),
      yAxis: axis({ type: 'value', name: 'RMSD to inactive (Å)', min: 0.6, max: 2.4 }),
      series: [
        { type: 'scatter', data: rows, symbolSize: 4.5, itemStyle: { opacity: 0.85 }, progressive: 800 },
        { type: 'line', data: [[0.6, 0.6], [2.4, 2.4]], showSymbol: false, lineStyle: { color: hexA(C.grid, 0.4), type: 'dashed', width: 1 }, silent: true, tooltip: { show: false } },
      ],
      graphic: [
        { type: 'text', left: 70, top: 22, style: { text: `active-like  ${X.conformation.cxcr4.active}`, fill: C.turbo2, font: '600 12px JetBrains Mono' } },
        { type: 'text', right: 70, bottom: 56, style: { text: `inactive-like  ${X.conformation.cxcr4.inactive}`, fill: C.muted, font: '600 12px JetBrains Mono' } },
      ],
    }));
    return ch;
  };

  B.kaibChart = (el) => {
    const ch = make(el);
    const rows = D.conf.kaib;
    const st = { ground: ['ground', C.turbo], fs: ['fold-switched', C.hot], unassigned: ['unassigned', hexA(C.dot, 0.5)] };
    const k = X.conformation.kaib;
    ch.setOption(base({
      grid: { left: 46, right: 14, top: 56, bottom: 44 },
      legend: legend({ data: [`ground ${k.ground}`, `fold-switched ${k.fs}`, `unassigned ${k.unassigned}`], left: 0 }),
      tooltip: tooltip({ formatter: (p) => `<b>${p.data.id}</b><br>RMSD ground ${p.value[0]} Å · FS ${p.value[1]} Å<br>pLDDT ${p.data.pl}` }),
      xAxis: axis({ type: 'value', name: 'RMSD to ground (Å)', nameLocation: 'middle', nameGap: 26, min: 0, max: 14 }),
      yAxis: axis({ type: 'value', name: 'RMSD to FS (Å)', min: 0, max: 14 }),
      series: Object.entries(st).map(([key, [n, c]]) => ({ name: `${n} ${key === 'fs' ? k.fs : k[key]}`, type: 'scatter', symbolSize: key === 'unassigned' ? 4 : 6, itemStyle: { color: c, shadowBlur: key === 'fs' ? 8 : 0, shadowColor: c },
        data: rows.filter((r) => r[4] === key).map((r) => ({ value: [r[1], r[2]], id: r[0], pl: r[3] })) })),
    }));
    return ch;
  };

  // Theme switch: re-read the palette and rebuild every chart that has been built, keeping the
  // current selections (builders read their segmented controls' state via segVal).
  const built = new Map();
  function build(id, el) { built.set(id, el); B[id](el); }
  function rebuildAll() {
    C = palette(); hatch = mkHatch();
    built.forEach((el, id) => { const old = echarts.getInstanceByDom(el); if (old) old.dispose(); B[id](el); });
  }
  window.TCC = { builders: B, build, rebuildAll, MODELS, mcolor, mvar, fmt, seg };
})();
