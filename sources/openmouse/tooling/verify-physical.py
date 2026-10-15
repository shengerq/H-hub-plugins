from pathlib import Path
from zipfile import ZipFile
import hashlib,json,re
root=Path(__file__).resolve().parents[1]
if not (root/'index.json').exists():root=Path(__file__).resolve().parents[3]
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
feed=load(root/'index.json');inventory=load(root/'sources/openmouse/reports/inventory.json')
physical=[e for e in feed['plugins'] if e['id'].startswith('hhub.openmouse.')]
assert len(physical)==inventory['pluginCount']
assert all(e['compatibility']['scope']=='device' for e in physical)
assert len({e['brand'] for e in physical})==inventory['brandCount']
assert not list(root.glob('Hhub-OpenMouse-*.hhub'))
assert not any('virtual-lab' in e['id'] for e in feed['plugins'])
byid={e['id']:e for e in physical}
for r in inventory['packages']:
 e=byid[r['id']];assert e['packageUrl']=='catalog/peripherals/mouse/'+r['package']
 p=root/e['packageUrl'];assert p.parent.name==r['brand'] and r['protocol'] in p.name
 assert not re.search(r'__HID__|Hhub-OpenMouse-',p.name)
 assert hashlib.sha256(p.read_bytes()).hexdigest()==e['sha256']
 m=load(p);assert m['validation']['hardwareVerified'] is False
 assert m['compatibility']['firmwareVersions']==[]
 assert 'hhubVirtualBridge' not in m['ui']['content']
 assert p.name in (p.parent/'README.md').read_text(encoding='utf-8')
archive=root/'downloads/OpenMouse-Physical-Plugins-0.1.1.zip'
assert hashlib.sha256(archive.read_bytes()).hexdigest()==Path(str(archive)+'.sha256').read_text().split()[0]
with ZipFile(archive) as z:
 assert z.testzip() is None
 assert len([n for n in z.namelist() if n.endswith('.hhub')])==len(physical)
 for e in physical:assert hashlib.sha256(z.read(e['packageUrl'])).hexdigest()==e['sha256']
print(f'PASS {len(physical)} physical packages, {inventory["brandCount"]} brand folders, names, hashes, source archive; no experience package. Hardware unverified.')
