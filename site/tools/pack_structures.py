"""Wrap structure files as JS (window.TC_STRUCT[id] = {fmt, text}) so 3Dmol can load them over file://."""
import json, os
T = '/mnt/shared-storage-user/dnacoding/yedongxin/Af3Speed/Web/resource/taoran'
G = '/mnt/shared-storage-user/dnacoding/yedongxin/Af3Speed/main/draw/group'
S = os.path.join(os.path.dirname(__file__), '..', 'assets', 'structures')
items = {
    '7QVE': (f'{S}/7QVE_assembled.pdb', 'pdb'),
    '7ARC': (f'{S}/7ARC_assembled.pdb', 'pdb'),
    '7QRU': (f'{S}/7QRU_assembled.pdb', 'pdb'),
    'derf7': (f'{G}/protein_hunter_group_a-g_structure.cif', 'cif'),
    'p21589_open': (f'{T}/01_P21589/models/boltz2/P21589/P21589_000/P21589_000_model_3.cif', 'cif'),
    'p21589_closed': (f'{T}/01_P21589/models/boltz2/P21589/P21589_015/P21589_015_model_3.cif', 'cif'),
    'cxcr4': (f'{T}/02_CXCR4_CXCL12/models/cxcr4_cxcl12/cxcr4_cxcl12_001/cxcr4_cxcl12_001_model_2.cif', 'cif'),
    'kaib_ground': (f'{T}/03_KaiB/models/MCB2210322.1/MCB2210322.1_model_0.cif', 'cif'),
    'kaib_fs': (f'{T}/03_KaiB/models/MFP4030837.1/MFP4030837.1_model_0.cif', 'cif'),
}
ASSEMBLED = {'7QVE', '7ARC', '7QRU'}


def slim_backbone(text):
    # cartoon needs N, CA and O (3Dmol assigns helix/sheet from N–O hydrogen bonds; CA+O alone turns
    # everything into coil); columns after the coordinates are dropped and the element is inferred
    return '\n'.join(l[:54] for l in text.splitlines() if l.startswith('ATOM') and l[12:16].strip() in ('N', 'CA', 'O')) + '\nEND\n'


for k, (src, fmt) in items.items():
    text = open(src).read().replace('\r\n', '\n')
    if k in ASSEMBLED:
        text = slim_backbone(text)
    with open(f'{S}/{k}.js', 'w') as f:
        f.write(f'(window.TC_STRUCT=window.TC_STRUCT||{{}})[{json.dumps(k)}]={{fmt:{json.dumps(fmt)},text:{json.dumps(text)}}};\n')
    print(k, os.path.getsize(f'{S}/{k}.js'))
