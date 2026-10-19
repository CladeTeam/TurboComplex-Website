# TurboComplex project site

Static single-page site — open `index.html` directly in a browser (works over `file://`, no server or build step).
To share on a LAN: `python3 -m http.server 8000` in this folder.

## Layout
- `index.html` — page structure and copy (9 sections: race, engine, stack, benchmark, screening, design, assembly, conformation, scale)
- `assets/css/style.css` — layout plus two token sets: night (`:root`, default) and day (`:root[data-theme="light"]`); the nav sun/moon button switches and remembers the choice in localStorage
- `assets/js/hero.js` — hero: 7QVE (28 chains) assembled chain by chain as a 3Dmol cartoon over a speed-streak layer; also the shared script/structure loader (`window.TCL`) used by main.js
- `assets/js/charts.js` — all ECharts panels (lazy-built when scrolled into view)
- `assets/js/main.js` — nav, race animation, engine diagram, 3Dmol viewers, number wall, gallery
- `assets/data/data.js` — numbers collected by `tools/build_data.py` from project / collaborator directories
- `assets/data/extra.js` — hand-transcribed numbers (Boltz-2 speed log, loader caching, conformation verification), each with its source
- `assets/structures/*.js` — structures wrapped as JS by `tools/pack_structures.py` (lets 3Dmol load them over file://); the three assemblies keep only N/CA/O columns up to the coordinates, which is all a cartoon needs (half the size, same secondary structure)
- `assets/lib/` — vendored gsap 3.12.5, ScrollTrigger, echarts 5.6.0, 3Dmol

## Data sources
| Section | Source |
|---|---|
| Race, benchmark | `main/draw/group/benchmark_group_a-j_summary.csv`, `_source_data.json` |
| Stack | `main/goal_times_boltz.md` (single-GPU runs only; the 4-GPU wall-clock run is excluded) |
| Screening (TC-PPI, wet lab) | `huhan/result_fig/…`, `huhan/result_fig2/overlap_focus_C_combined/metrics.csv` |
| Design | `main/draw/group/protein_hunter_group_a-g_computed_data.json` |
| Assembly | `peijun/…` CombFold benchmark2 results → `assets/data/large_tm.json` |
| Conformation | `Web/resource/taoran/` verification package |

Regenerate data: `python3 tools/build_data.py` (then `tools/pack_structures.py` if structures change).
Paper figures are intentionally not on the site; the previously generated copies and their script were moved to `../removed_from_site/`.
Google Fonts (Inter, Space Grotesk, JetBrains Mono) load online; offline the page falls back to system fonts.

## To fill in
Author list and BibTeX in the footer of `index.html` are placeholders.
