"""Verify additive brand catalogs, shared source and the complete reserve archive."""
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import re

root = Path(__file__).resolve().parent.parent
def load(file):
    return json.loads(file.read_text(encoding='utf-8-sig'))
feed = load(root / 'index.json')
inventory = load(root / 'sources/openmouse/reports/inventory.json')
items = {entry['id']: entry for entry in feed['plugins']}
reserve = [entry for entry in feed['plugins'] if entry['id'].startswith('hhub.openmouse.') and entry['id'] != 'hhub.openmouse.virtual-lab']
assert len(reserve) == inventory['pluginCount'] == 420
assert len({entry['brand'] for entry in reserve}) == inventory['brandCount'] == 26
for record in inventory['packages']:
    entry = items[record['id']]
    assert entry['packageUrl'] == record['package']
    assert entry['brand'] == record['brand']
    assert entry['group'] == 'peripheral' and entry['category'] == 'mouse'
    assert entry['validation']['hardwareVerified'] is False
    assert entry['compatibility']['firmwareVersions'] == []
    slug = re.sub(r'[^a-z0-9]+', '-', entry['brand'].lower()).strip('-')
    page = root / 'catalog/peripherals/mouse/brands' / (slug + '.md')
    assert page.read_text(encoding='utf-8').count(entry['packageUrl']) == 1
demo = items['hhub.openmouse.virtual-lab']
manifest = load(root / demo['packageUrl'])
assert demo['group'] == 'application' and demo['category'] == 'experimental'
assert manifest['permissions'] == ['离线插件页面']
assert manifest['compatibility']['scope'] == 'tool'
assert not manifest.get('hidV2Targets') and not manifest.get('hidTargets')
assert '软件模拟' in manifest['ui']['content']
for relative in ['README.md', 'LICENSE', 'src/page.js', 'src/transport.js', 'src/virtual-device.js', 'tooling/build.mjs', 'tooling/build-demo.mjs', 'upstream/mouse-protocol/LICENSE', 'upstream/mouse-protocol/src/drivers/registry.ts']:
    assert (root / 'sources/openmouse' / relative).is_file(), relative
pages = [root / 'docs/OpenMouse储备包.md', root / 'catalog/peripherals/mouse/README.md', *list((root / 'catalog/peripherals/mouse/brands').glob('*.md'))]
for page in pages:
    for target in re.findall(r'\]\(([^)]+)\)', page.read_text(encoding='utf-8')):
        if not target.startswith(('http:', 'https:', '#')):
            assert (page.parent / target.split('#')[0]).resolve().is_file(), f'{page}: {target}'
archive = root / 'Hhub-OpenMouse-Reserve-0.1.0.zip'
expected = (root / (archive.name + '.sha256')).read_text(encoding='utf-8').split()[0]
assert hashlib.sha256(archive.read_bytes()).hexdigest() == expected
with ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    assert sum(name.endswith('.hhub') for name in bundle.namelist()) == 421
    archived = load_feed = json.loads(bundle.read('Hhub-OpenMouse-Reserve/library/index.json'))
    for entry in archived['plugins']:
        assert entry['sha256'] == items[entry['id']]['sha256']
    assert hashlib.sha256(bundle.read('Hhub-OpenMouse-Reserve/demo/' + demo['packageUrl'])).hexdigest() == demo['sha256']
print('PASS: 420 reserve packages, 26 brand catalogs, virtual experience, source, links and archive. Hardware remains unverified.')
