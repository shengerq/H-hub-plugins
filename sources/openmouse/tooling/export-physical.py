"""Publish real physical protocol plugins into existing mouse/brand folders."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import argparse, hashlib, json, shutil
from urllib.parse import quote
parser=argparse.ArgumentParser();parser.add_argument('repository',type=Path);args=parser.parse_args()
root=Path(__file__).resolve().parents[1];repo=args.repository.resolve()
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,v):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(v if isinstance(v,str) else json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def safe(p):
 p=p.resolve();assert p.is_relative_to(repo),p;return p
feed=load(repo/'index.json');old=feed['plugins'];existing=[e for e in old if not e['id'].startswith('hhub.openmouse.')]
original={e['packageUrl']:hashlib.sha256((repo/e['packageUrl']).read_bytes()).hexdigest() for e in existing}
for e in old:
 if e['id'].startswith('hhub.openmouse.'):
  p=safe(repo/e['packageUrl'])
  if p.is_file():p.unlink()
reserve=load(root/'library/index.json');inventory=load(root/'reports/inventory.json');by_id={r['id']:r for r in inventory['packages']};by_brand={}
for e in reserve['plugins']:
 r=by_id[e['id']];source=root/'library'/e['packageUrl'];e['packageUrl']='catalog/peripherals/mouse/'+r['package'];e['brand']=r['brand'];e['protocol']=r['protocol']
 dest=safe(repo/e['packageUrl']);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,dest);by_brand.setdefault(r['brand'],[]).append(e)
feed['plugins']=existing+reserve['plugins'];write(repo/'index.json',feed)
write(repo/'SHA256SUMS.txt',''.join(e['sha256']+'  '+e['packageUrl']+'\n' for e in feed['plugins']))
source=repo/'sources/openmouse'
allowed_reports={'catalog-names.json','device-candidates.json','inventory.csv','inventory.json','style-provenance.json','protocol-tests.tap','transport-tests.tap','ui-check.json','native-virtual-device-check.json'}
for folder in ['src','tooling','reports']:
 for p in (root/folder).rglob('*'):
  if folder=='reports' and (p.parent!=root/'reports' or p.name not in allowed_reports):continue
  if not p.is_file() or 'node_modules' in p.parts or p.name in ['virtual-device.js','build-demo.mjs','test-demo.mjs','patch-host.py','finish-host.py','correct-build.py','export-to-repository.py','finalize-repository.py','clean-source-exports.py']:continue
  if p.suffix in ['.html','.png'] or p.name in ['catalog-modules.mjs','introspection.mjs']:continue
  dest=source/p.relative_to(root);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
for name in ['LICENSE','upstream-commit.txt']:shutil.copy2(root/name,source/name)
for retired in ['src/virtual-device.js','tooling/build-demo.mjs','tooling/test-demo.mjs','tooling/export-to-repository.py']:
 p=safe(source/retired)
 if p.exists():p.unlink()
if not (source/'upstream/mouse-protocol/LICENSE').exists():shutil.copytree(root/'upstream/mouse-protocol',source/'upstream/mouse-protocol',ignore=shutil.ignore_patterns('.git','node_modules','dist'))
mouse=repo/'catalog/peripherals/mouse';rows=[]
for brand,items in sorted(by_brand.items()):
 lines=[f'# {brand} 鼠标协议包','','本文件夹直接存放正式 `.hhub` 协议包。全部未实机验证，固件未知；包含不同连接方式和接收器，不等于已验收型号数。','','| 型号 | 协议 | 包 |','| --- | --- | --- |']
 for e in items:lines.append(f"| {e['name']} | {e['protocol']} | [下载](./{quote(Path(e['packageUrl']).name)}) |")
 write(mouse/brand/'README.md','\n'.join(lines)+'\n');rows.append(f'| [{brand}](./{brand}/) | {len(items)} | 未实机验证 |')
count=len(reserve['plugins']);brands=len(by_brand)
write(mouse/'README.md','\n'.join(['# 鼠标插件 · 品牌目录','',f'{count} 个真实设备协议包，{brands} 个品牌。按品牌建立真实文件夹；文件名为“鼠标型号__协议__VID-PID__版本.hhub”。原有雷柏插件保留原位置。','','**实机验证：没有。** 型号依据来自上游源码；未知型号和缺乏依据的 VID/PID 组合不生成包，详见[缺口清单](../../../sources/openmouse/reports/inventory.json)。','','| 品牌 | 包数 | 验证 |','| --- | ---: | --- |',*rows,'','[完整储备 ZIP](../../../downloads/OpenMouse-Physical-Plugins-0.1.1.zip) · [功能与验证说明](../../../docs/OpenMouse储备包.md)','']))
for p in (mouse/'brands').glob('*.md'):safe(p).unlink()
if (mouse/'brands').is_dir() and not list((mouse/'brands').iterdir()):(mouse/'brands').rmdir()
for retired in ['Hhub-OpenMouse-Reserve-0.1.0.zip','Hhub-OpenMouse-Reserve-0.1.0.zip.sha256','catalog/peripherals/mouse/virtual-experience.html']:
 p=safe(repo/retired)
 if p.exists():p.unlink()
application=repo/'catalog/applications/README.md';text=application.read_text(encoding='utf-8-sig');text='\n'.join('| 实验型应用 | 暂无 |' if line.startswith('| 实验型应用 |') else line for line in text.splitlines())+'\n';write(application,text)
readme=repo/'README.md';text=readme.read_text(encoding='utf-8-sig');text=text.replace('新增 420 个 OpenMouse 鼠标候选包和一个虚拟鼠标体验插件',f'新增 {count} 个 OpenMouse 真实设备协议包，按 {brands} 个品牌建立文件夹').replace('包文件保留在仓库根目录','包文件按索引中的相对路径分发').replace('部署时将 `index.json` 和索引引用的全部 `.hhub` 文件放在同一分支的根目录','部署时在同一分支保留根目录 `index.json` 及其引用的品牌文件夹和 `.hhub` 文件');write(readme,text)
doc=f'''# OpenMouse 正式协议储备包

共 {count} 个有型号名称依据的真实协议包，{brands} 个品牌。包名包含鼠标型号、协议实现名、VID/PID 和版本。原有五个插件条目保持原内容与位置。所有新增包均是 HID v2 设备插件；本次发行不含体验插件。

[品牌文件夹](../catalog/peripherals/mouse/README.md) · [完整储备 ZIP](../downloads/OpenMouse-Physical-Plugins-0.1.1.zip) · [对应源码](../sources/openmouse/README.md)

## 功能范围

包含 OpenMouse 真实驱动及 H hub HID v2 适配，采用雷柏插件页面风格。DPI、回报率和 Motion Sync / 角度修正 / 波纹修正按各驱动实际返回的能力开放。只读协议不会获得虚构写入功能。专用改键、宏、RGB、配对及固件更新尚未接入通用页面。

## 验证状态

实机验证：**没有**。固件列表：未知。型号标签来自对应源码，不代表本项目已验收硬件。共享接收器的具体配对型号仍以连接读取为准。宽泛过滤器不能作为 VID/PID 组合存在的证据；未确认条目列在 inventory.json 的 skipped 中，不计入正式包。

## 虚拟设备

虚拟设备属于 H hub 宿主的 HID 后端。以隔离鼠标测试配置启动宿主，并设置 `HHUB_VIRTUAL_MOUSE=1`，会出现 VAXEE XE Wireless 和 MCHOSE A7 V2 Ultra+ 接收器两台虚拟设备。直接安装本库对应的正式 `.hhub` 即可；不需要另一种体验包。虚拟设备只能验证软件协议流程，不能证明真实鼠标可用，也不表示其他协议已有模拟器。

## 构建

源码采用 AGPL-3.0-or-later，保留上游对应源码和提交号。先在 tooling 安装依赖，然后运行 catalog-names.mjs、inspect.mjs、build.mjs；export-physical.py 保留原有目录分类并导出品牌文件夹。
'''
write(repo/'docs/OpenMouse储备包.md',doc);write(source/'README.md',doc.replace('../catalog/','../../catalog/').replace('../downloads/','../../downloads/').replace('../sources/openmouse/README.md','./README.md'))
archive=repo/'downloads/OpenMouse-Physical-Plugins-0.1.1.zip';archive.parent.mkdir(exist_ok=True)
with ZipFile(archive,'w',ZIP_DEFLATED,compresslevel=6) as z:
 for e in reserve['plugins']:z.write(repo/e['packageUrl'],e['packageUrl'])
 z.writestr('index.json',json.dumps({**feed,'plugins':reserve['plugins']},ensure_ascii=False,indent=2))
 for p in source.rglob('*'):
  if p.is_file():z.write(p,p.relative_to(repo))
 for p in mouse.glob('*/README.md'):z.write(p,p.relative_to(repo))
 z.writestr('README.md',doc.replace('../catalog/','./catalog/').replace('../sources/','./sources/').replace('../downloads/OpenMouse-Physical-Plugins-0.1.1.zip','https://github.com/shengerq/H-hub-plugins/blob/main/downloads/OpenMouse-Physical-Plugins-0.1.1.zip'))
write(Path(str(archive)+'.sha256'),hashlib.sha256(archive.read_bytes()).hexdigest()+'  '+archive.name+'\n')
for name,digest in original.items():assert hashlib.sha256((repo/name).read_bytes()).hexdigest()==digest
print(json.dumps({'physicalPackages':count,'brands':brands,'unchangedOriginals':len(original),'archiveBytes':archive.stat().st_size}))
