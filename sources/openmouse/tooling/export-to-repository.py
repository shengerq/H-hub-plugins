"""Add the reserve to the existing H hub distribution layout without moving old files."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import re

parser = argparse.ArgumentParser()
parser.add_argument('repository', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
repo = args.repository.resolve()
def read_json(file):
    return json.loads(file.read_text(encoding='utf-8-sig'))
def write(file, value):
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(value if isinstance(value, str) else json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

feed = read_json(repo / 'index.json')
existing = [e for e in feed['plugins'] if not e['id'].startswith('hhub.openmouse.')]
original_hashes = {e['packageUrl']: digest(repo / e['packageUrl']) for e in existing}
reserve = read_json(root / 'library/index.json')
inventory = read_json(root / 'reports/inventory.json')
demo = read_json(root / 'demo/entry.json')
entries = []
packages_by_brand = {}
for entry in reserve['plugins']:
    package = entry['packageUrl']
    shutil.copy2(root / 'library' / package, repo / package)
    item = next(p for p in inventory['packages'] if p['id'] == entry['id'])
    entry = dict(entry, brand=item['brand'], sourceCodePath='sources/openmouse', releaseChannel='reserve')
    entries.append(entry)
    packages_by_brand.setdefault(item['brand'], []).append(entry)
shutil.copy2(root / 'demo' / demo['packageUrl'], repo / demo['packageUrl'])
demo = dict(demo, sourceCodePath='sources/openmouse', releaseChannel='experimental')
feed['plugins'] = existing + entries + [demo]
write(repo / 'index.json', feed)
write(repo / 'SHA256SUMS.txt', ''.join(e['sha256'] + '  ' + e['packageUrl'] + '\n' for e in feed['plugins']))

source = repo / 'sources/openmouse'
for name in ['README.md', 'CHANGELOG.md', 'LICENSE', 'upstream-commit.txt']:
    write(source / name, (root / name).read_text(encoding='utf-8-sig'))
for folder in ['src', 'tooling', 'upstream/mouse-protocol']:
    for file in (root / folder).rglob('*'):
        if file.is_file() and not any(part in {'.git', 'node_modules', '__pycache__'} for part in file.relative_to(root).parts):
            target = source / file.relative_to(root)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(file, target)
report_names = ['inventory.csv', 'inventory.json', 'device-candidates.json', 'catalog-names.json', 'contract-check.txt', 'package-check.json', 'protocol-tests.tap', 'transport-tests.tap', 'ui-check.json', 'style-provenance.json', 'virtual-lab-check.json', 'rapoo-style-desktop.png', 'rapoo-style-narrow.png', 'virtual-lab-desktop.png']
for name in report_names:
    file = root / 'reports' / name
    if file.exists():
        target = source / 'reports' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file, target)
source_readme = (source / 'README.md').read_text(encoding='utf-8')
write(source / 'README.md', '> 这是现有插件分发仓库中的对应源码目录。发行 `.hhub` 和统一 `index.json` 仍在仓库根目录；本目录的 `library/`、`preview/`、`demo/` 是运行构建脚本后生成的输出，不在源码树内重复存储。\n\n' + source_readme)

slugs = {brand: re.sub(r'[^a-z0-9]+', '-', brand.lower()).strip('-') for brand in packages_by_brand}
mouse_dir = repo / 'catalog/peripherals/mouse'
brand_rows = []
for brand in sorted(packages_by_brand, key=str.lower):
    items = sorted(packages_by_brand[brand], key=lambda e: e['name'].lower())
    brand_rows.append(f'| [{brand}](./brands/{slugs[brand]}.md) | {len(items)} | 未实机验证 |')
    lines = [f'# {brand} 鼠标插件', '', f'本品牌目录收录 {len(items)} 个 OpenMouse VID/PID 候选包。全部为 **未实机验证**，准确固件未知；包数量包含设备、接收器及上游发现候选组合，不能换算为已验收型号数。', '', '包文件沿用现有库规则，位于仓库根目录；本页提供分类浏览，不重复存放包。', '']
    if brand == 'Rapoo':
        lines += ['## 原有雷柏插件', '', '[雷柏 VT3S MAX 0.5.2](../../../../Hhub-Rapoo-VT3S-MAX-0.5.2.hhub) 保持原包、ID、版本和内容；OpenMouse 雷柏候选包单独列在下表。', '']
    lines += ['## OpenMouse 储备包', '', '| 名称 | 硬件识别 | 包 | 验证 |', '| --- | --- | --- | --- |']
    for entry in items:
        name = entry['name'].replace('|', '\\|')
        lines.append(f"| {name} | `{entry['compatibility']['hardwareId']}` | [下载 0.1.0](../../../../{entry['packageUrl']}) | 未实机验证 |")
    lines += ['', '[安装与功能范围](../../../../docs/OpenMouse储备包.md) · [源码与测试](../../../../sources/openmouse/README.md) · [返回鼠标品牌目录](../README.md)', '']
    write(mouse_dir / 'brands' / (slugs[brand] + '.md'), '\n'.join(lines))
write(mouse_dir / 'README.md', '\n'.join(['# 鼠标插件 · 按品牌浏览', '', '沿用“外设插件 → 鼠标”分类，在该层增加品牌目录。原有雷柏 VT3S MAX 插件保留；新增 420 个 OpenMouse 候选包，覆盖 26 个品牌标识。', '', '**全部 OpenMouse 包未实机验证，固件未知。** 接收器、连接方式和候选识别组合分别计入数量。', '', '| 品牌 | OpenMouse 候选包 | 验证状态 |', '| --- | ---: | --- |', *brand_rows, '', '## 虚拟鼠标体验', '', '[下载体验插件](../../../Hhub-OpenMouse-Virtual-Lab-0.1.0.hhub) · [离线体验页面源文件](./virtual-experience.html)', '', '体验包位于现有“应用插件 → 实验型应用”分类。它运行真实 VAXEE / MCHOSE 协议与软件虚拟设备，支持 DPI、回报率、传感器开关、拔插和失败模拟。仅申请离线页面权限，不访问真实鼠标。下载 HTML 后在本地浏览器打开即可体验；GitHub 文件页面本身不会执行 HTML。', '', '[安装与验证边界](../../../docs/OpenMouse储备包.md) · [源码](../../../sources/openmouse/README.md) · [返回外设目录](../README.md)', '']))
shutil.copy2(root / 'demo/index.html', mouse_dir / 'virtual-experience.html')

peripheral = repo / 'catalog/peripherals/README.md'
text = peripheral.read_text(encoding='utf-8-sig')
text = text.replace('| 鼠标 | [雷柏 VT3S MAX 0.5.2](../../Hhub-Rapoo-VT3S-MAX-0.5.2.hhub) |', '| 鼠标 | [雷柏 VT3S MAX 0.5.2](../../Hhub-Rapoo-VT3S-MAX-0.5.2.hhub)；[按品牌浏览 OpenMouse 鼠标储备包](./mouse/README.md) |')
write(peripheral, text)
applications = repo / 'catalog/applications/README.md'
text = applications.read_text(encoding='utf-8-sig').replace('| 实验型应用 | 暂无 |', '| 实验型应用 | [OpenMouse 虚拟鼠标体验 0.1.0](../../Hhub-OpenMouse-Virtual-Lab-0.1.0.hhub)（纯软件模拟，不访问真实 HID） |')
write(applications, text)

doc = '''# OpenMouse 鼠标储备包

在现有 H hub 插件库结构上新增 420 个 VID/PID 候选包，按 26 个品牌分类。原有五个索引条目及历史包保持原内容。所有 `.hhub` 仍放在仓库根目录，由同一 `index.json` 分发。

## 下载与分类

- [鼠标品牌目录](../catalog/peripherals/mouse/README.md)：每个品牌列出名称、识别码、独立包及验证状态。
- [完整储备 ZIP](../Hhub-OpenMouse-Reserve-0.1.0.zip)：包含独立包、对应源码、许可、清单及测试记录。
- [完整清单 CSV](../sources/openmouse/reports/inventory.csv)。
- [对应源码与构建说明](../sources/openmouse/README.md)。

## 安装与范围

在兼容 H hub 的插件管理中导入对应 `.hhub`。设备包需要原生 HID v2 通道；实际导入验收尚未进行。支持 DPI、回报率和标准传感器开关，具体控件按驱动能力开放；MCHOSE A7 V2 的 DPI 编辑使用当前板载档位。专用改键、宏、RGB、配对和固件更新未接入通用页面。

所有设备包均标为 **未实机验证**，准确固件列表为空，未添加任何实机验收记录。软件/协议模拟测试不能代替实机验证；未知固件不会通过严格匹配接口自动匹配。包数量还包含接收器与上游候选组合，不能理解为 420 款已验收鼠标。

## 虚拟设备体验

[OpenMouse 虚拟鼠标体验插件](../Hhub-OpenMouse-Virtual-Lab-0.1.0.hhub) 放在原有“应用插件 → 实验型应用”分类；[体验 HTML](../catalog/peripherals/mouse/virtual-experience.html) 下载后可直接在本地浏览器打开。它提供两台软件虚拟鼠标：

| 虚拟设备 | 可体验 |
| --- | --- |
| VAXEE | 真实 VAXEE 编解码驱动下的 DPI、回报率、状态读取 |
| MCHOSE A7 V2 | 当前档位 DPI、回报率、Motion Sync、角度修正、波纹修正 |

两台设备都能模拟拔插、重连和写入不生效；配置保存在浏览器本地。界面明确标注软件模拟。体验包只申请离线页面权限，不生成操作系统级虚拟 USB 设备、不改变真实鼠标配置，也不构成硬件验收。

## 完整性与许可

根目录总索引、`SHA256SUMS.txt` 和每项身份编码沿用原有契约。运行 `scripts/verify-index.ps1` 检查全部条目。

OpenMouse 协议固定提交 `c3b1bc20866fbef3a27b37ad020887607d6dbbf2`，对应 AGPL-3.0-or-later 许可及修改源码在 `sources/openmouse/`，每个包也携带许可文本。现有其他插件的许可与来源声明保持原规则。

[返回插件库](../README.md)
'''
write(repo / 'docs/OpenMouse储备包.md', doc)
main = repo / 'README.md'
text = main.read_text(encoding='utf-8-sig')
text = text.replace('当前插件库包含雷柏 VT3S MAX、开发者工具、通用 EQ、手机遥控与 Windows 设置五个条目，以及插件索引、安装说明和历史原始包。', '原有雷柏 VT3S MAX、开发者工具、通用 EQ、手机遥控与 Windows 设置五个条目保持原位置；新增 420 个 OpenMouse 鼠标候选包和一个虚拟鼠标体验插件，沿用统一索引与原有分类结构。')
text = text.replace('| [外设插件](./catalog/peripherals/README.md) | 鼠标、键盘、耳机、手柄、其他 | 雷柏 VT3S MAX（鼠标） |', '| [外设插件](./catalog/peripherals/README.md) | 鼠标、键盘、耳机、手柄、其他 | 雷柏 VT3S MAX；[OpenMouse 鼠标按品牌浏览](./catalog/peripherals/mouse/README.md) |')
marker = '\n## OpenMouse 鼠标储备与虚拟体验\n'
if marker in text:
    text = text.split(marker)[0]
text += marker + '''
在原有结构上增加 **420 个 OpenMouse VID/PID 候选包，按 26 个品牌分类**。包文件和总索引继续放在根目录，分类页位于“外设插件 → 鼠标 → 品牌”。原有插件未被替换。

全部设备包明确标注 **未实机验证**，固件未知。它们是协议储备包，数量包含接收器、连接方式及识别候选组合；具体能力和验收范围见说明。

- [按品牌浏览与逐包下载](./catalog/peripherals/mouse/README.md)
- [下载完整储备 ZIP](./Hhub-OpenMouse-Reserve-0.1.0.zip) · [SHA-256](./Hhub-OpenMouse-Reserve-0.1.0.zip.sha256)
- [安装、验证与功能范围](./docs/OpenMouse储备包.md)
- [完整对应源码与构建脚本](./sources/openmouse/README.md)
- [虚拟鼠标体验插件](./Hhub-OpenMouse-Virtual-Lab-0.1.0.hhub)：位于“应用插件 → 实验型应用”；真实 VAXEE / MCHOSE 协议配合软件模拟设备，不访问真实鼠标。
'''
write(main, text)
for filename, value in original_hashes.items():
    assert digest(repo / filename) == value, 'Original package changed: ' + filename
report = {'originalEntriesPreserved': len(existing), 'originalPackageHashes': original_hashes, 'reservePackagesAdded': len(entries), 'brandCount': len(packages_by_brand), 'virtualExperiencePackagesAdded': 1, 'totalIndexEntries': len(feed['plugins']), 'verificationRecordsPreserved': feed.get('verificationRecords', [])}
write(root / 'reports/repository-export.json', report)
print(json.dumps({key: value for key, value in report.items() if key != 'originalPackageHashes'}, ensure_ascii=False))
