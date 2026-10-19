/* Hand-transcribed numbers that live in logs / notes rather than CSV files.
 * Each block names its source so it can be re-checked. */
window.TC_EXTRA = {
  // Af3Speed/main/goal_times_boltz.md — Boltz-2, FoldBench protein–protein full set (239 inputs),
  // SS=120, DS=5, recycling early stop TH=0.10. Seconds are end-to-end duration from boltz_timing.csv, all on ONE GPU
  // (the log's 4-GPU 383.88 s run is left out on purpose: that is more hardware, not a faster pipeline).
  // DockQ is from the f3 configuration; per-target seeding makes the 1-GPU and 4-GPU f3 outputs identical.
  boltzStack: {
    stages: [
      { key: 'Default Boltz-2', note: 'stock sampling, mean of 5 seeds', s: 6269 },
      { key: '+ Sampling budget & adaptive recycling', note: 'SS 120 · DS 5 · early-stop TH 0.10', s: 3445.51 },
      { key: '+ TensorRT FP16', note: 'FP16 triangle kernels, pair transition, TF32 GEMMs', s: 1967.93 },
      { key: '+ Systems engineering', note: 'async I/O, token bucketing, fast loading, Triton LayerNorm, tuned caches · 1 GPU', s: 1500.59 },
    ],
    dockqRef: 0.4956,   // ablate-fast3x-full239 reference
    dockqFinal: 0.4945, // f3-all239-g4
    successFinal: 0.662,
    targets: 239,
  },
  // Writing outline p.14 (Extended Data): PPI feature-loader caching benchmark.
  loader: { measuredMax: 36, measuredAt: '5k pairs', extrapolated: 145, extrapolatedAt: '100k pairs' },
  // resource/taoran/本机验证记录.md and verification/monomer/summary.csv
  conformation: {
    p21589: { homologs: 5447, columns: 574, eps: 17, clusters: 370, selected: 37, models: 1850, selectedModels: 185,
              dual: { 'Boltz-2': 0.93349, 'AlphaFold 3': 0.91102 } },
    cxcr4: { models: 1395, active: 1381, inactive: 14 },
    kaib: { ground: 417, fs: 62, unassigned: 34, leaves: 513, treeSeqs: 1898 },
    files: 8791, structures: 5608, proteins: 66,
  },
};
