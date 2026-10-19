"""Collect TurboComplex result data from project / collaborator directories into assets/data/data.js.

Data is emitted as a JS global (window.TC_DATA) so the site works when opened via file://.
"""
import csv
import json
import os

ROOT = '/mnt/shared-storage-user/dnacoding'
AF3S = f'{ROOT}/yedongxin/Af3Speed'
GROUP = f'{AF3S}/main/draw/group'
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'data', 'data.js')


def r(x, n=4):
    return None if x is None else round(float(x), n)


def benchmark():
    rows = list(csv.DictReader(open(f'{GROUP}/benchmark_group_a-j_summary.csv')))
    out = {'pp': {}, 'pd': {}}
    for row in rows:
        m = out[row['task']].setdefault(row['model'], {})
        m[row['setting']] = {
            'iptm': r(row['mean_iptm']), 'iptm_sem': r(row['sem_iptm']),
            'ptm': r(row['mean_ptm']), 'time_min': r(row['time_min'], 2),
            'dockq': r(row['mean_dockq_matched']), 'dockq_all': r(row['mean_dockq_all']),
            'success': r(row['success_acceptable_pct'], 2), 'n': int(row['n_iptm']),
            'config': row['grid_folder'],
        }
    src = json.load(open(f'{GROUP}/benchmark_group_a-j_source_data.json'))
    grid = {}
    for model, pts in src['grid'].items():
        grid[model] = [{'ss': p['ss'], 'ds': p['ds'], 'th': p['th'],
                        't': r(p['time_s'], 1), 'iptm': r(p['iptm'], 5)} for p in pts]
    # DockQ survival curves (fraction with DockQ > cutoff), paired targets only
    surv = {}
    cut = [i / 50 for i in range(51)]
    for task in ('pp', 'pd'):
        surv[task] = {}
        for model, d in src['dockq'][task].items():
            curves = {}
            for k in ('paired_baseline', 'paired_optimised'):
                xs = [v for v in d[k] if v is not None]
                curves[k.split('_')[1]] = [r(sum(1 for v in xs if v > c) / len(xs), 4) for c in cut]
            surv[task][model] = curves
    return out, grid, surv


def ppi():
    base = f'{ROOT}/huhan/result_fig'
    rt = list(csv.DictReader(open(f'{base}/runtime_aligned_20260907/runtime_summary.csv')))
    runtime = [{'model': x['model'], 'human_h': r(x['human_time_h_gpu'], 3),
                'micro_h': r(x['micro_time_h_gpu'], 3),
                'speedup': r(x['speedup_vs_af3_geomean'], 2)} for x in rt]
    metrics = {}
    for x in csv.DictReader(open(f'{base}/nature_full_figure_radial_20260908/source_data_metrics_long.csv')):
        metrics.setdefault(x['dataset'], {}).setdefault(x['model'], {}).setdefault(x['stage'], {})[x['metric']] = r(x['value'])
    # TC-PPI and RF2 baselines, read from figure legends (huhan result_fig svg)
    extra = {
        'Human': {'RF2Lite': (0.273, 0.621), 'RF2-PPI': (0.492, 0.775),
                  'TC-PPI-stage1': (0.392, 0.773), 'TC-PPI-stage1+2': (0.558, 0.791)},
        'Micro': {'RF2Lite': (0.210, 0.505), 'RF2-PPI': (0.367, 0.635),
                  'TC-PPI-stage1': (0.594, 0.803), 'TC-PPI-stage1+2': (0.588, 0.802)},
    }
    for ds, d in extra.items():
        for m, (pr, roc) in d.items():
            metrics[ds][m] = {'Original': {'pr_auc': pr, 'roc_auc': roc}}
    wet = {}
    for x in csv.DictReader(open(f'{ROOT}/huhan/result_fig2/overlap_focus_C_combined/metrics.csv')):
        wet[x['metric']] = float(x['value'])
    return {'runtime': runtime, 'metrics': metrics, 'wet': wet}


def design():
    d = json.load(open(f'{GROUP}/protein_hunter_group_a-g_computed_data.json'))
    summ = [{k: (r(v) if isinstance(v, float) else v) for k, v in row.items()} for row in d['summary']]
    traj = {t: {k: [r(v) for v in vals] if k != 'cycles' else vals for k, vals in tr.items()}
            for t, tr in d['trajectories'].items()}
    pooled = {c: {'iptm': [r(v, 3) for v in p['iptm']], 'time_s': [r(v, 1) for v in p['time_s']],
                  'yield': [[r(v, 2) for v in band] for band in p['yield']], 'slope': r(p['slope'], 3)}
              for c, p in d['pooled'].items()}
    return {'summary': summ, 'traj': traj, 'pooled': pooled, 'yield_t': [r(v) for v in d['yield_time_h']],
            'stats': {k: (r(v) if isinstance(v, float) else v) for k, v in d['key_statistics'].items()}}


def conformation():
    import csv as _csv
    T = f'{AF3S}/Web/resource/taoran'
    out = {}
    for name, fn in (('boltz2', 'Boltz-2_source.csv'), ('af3', 'AlphaFold_3_source.csv')):
        rows = list(_csv.DictReader(open(f'{T}/01_P21589/expected/{fn}')))
        out['p21589_' + name] = [[r(x['tm_open'], 3), r(x['tm_closed'], 3), r(x['mean_pLDDT'], 1),
                                  1 if x['selected_neff'] == 'True' else 0] for x in rows]
    # t-SNE of 5,447 homologs, cluster labels at best eps=17 (sequence column has commas only as separators at end)
    pts = []
    for line in open(f'{T}/verification/cluster_scan/coordinates_labels.csv').read().splitlines()[1:]:
        parts = line.rsplit(',', 18)
        x, y = float(parts[1]), float(parts[2])
        lab = int(float(parts[3 + 6]))  # label_eps17
        pts.append([round(x, 2), round(y, 2), lab])
    out['tsne'] = pts
    out['eps_scan'] = [[float(x['eps']), int(x['n_clusters']), r(x['clustered_pct'], 2)]
                       for x in _csv.DictReader(open(f'{T}/verification/cluster_scan/epsilon_scan.csv'))]
    out['cxcr4'] = [[r(x['rmsd_a'], 3), r(x['rmsd_b'], 3), r(x['iptm'], 3), r(x['mean_pLDDT'], 1)]
                    for x in _csv.DictReader(open(f'{T}/verification/ppi/all_models.csv'))]
    out['kaib'] = [[x['tip'], r(x['rmsd_ground'], 2), r(x['rmsd_fs'], 2), r(x['plddt'], 1), x['state']]
                   for x in _csv.DictReader(open(f'{T}/verification/kaib/kaib_tip_states.csv'))
                   if x['rmsd_ground'] not in ('', 'nan')]
    return out


def large():
    return json.load(open(f'{os.path.dirname(OUT)}/large_tm.json'))


def main():
    bench, grid, surv = benchmark()
    data = {'bench': bench, 'grid': grid, 'survival': surv, 'ppi': ppi(), 'design': design(), 'large': large(), 'conf': conformation()}
    with open(OUT, 'w') as f:
        f.write('window.TC_DATA = ')
        json.dump(data, f, separators=(',', ':'))
        f.write(';\n')
    print(OUT, os.path.getsize(OUT))


if __name__ == '__main__':
    main()
