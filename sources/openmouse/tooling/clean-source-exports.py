from pathlib import Path
base=Path(__file__).resolve().parents[2];root=base/'openmouse-reserve';repo=base/'github-plugin-library'
p=root/'tooling/test-ui.mjs';s=p.read_text(encoding='utf-8').replace("selectOption('4000')","selectOption('500')").replace('pollingRateHz===4000','pollingRateHz===500');p.write_text(s,encoding='utf-8')
p=root/'tooling/export-physical.py';s=p.read_text(encoding='utf-8')
s=s.replace("for folder in ['src','tooling','reports']:","""allowed_reports={'catalog-names.json','device-candidates.json','inventory.csv','inventory.json','style-provenance.json','protocol-tests.tap','transport-tests.tap','ui-check.json','native-virtual-device-check.json'}
for folder in ['src','tooling','reports']:""")
s=s.replace("if not p.is_file() or 'node_modules' in p.parts", "if folder=='reports' and (p.parent!=root/'reports' or p.name not in allowed_reports):continue\n  if not p.is_file() or 'node_modules' in p.parts")
p.write_text(s,encoding='utf-8')
source=repo/'sources/openmouse/reports'
allowed={'catalog-names.json','device-candidates.json','inventory.csv','inventory.json','style-provenance.json','protocol-tests.tap','transport-tests.tap','ui-check.json','native-virtual-device-check.json'}
for p in source.rglob('*'):
 if p.is_file() and (p.parent!=source or p.name not in allowed):
  assert p.resolve().is_relative_to(repo.resolve());p.unlink()
for p in sorted(source.rglob('*'),key=lambda p:len(p.parts),reverse=True):
 if p.is_dir() and not list(p.iterdir()):p.rmdir()
old=repo/'sources/openmouse/tooling/export-to-repository.py'
if old.exists():old.unlink()
