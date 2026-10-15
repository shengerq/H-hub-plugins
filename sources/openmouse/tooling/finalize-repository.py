from pathlib import Path
base=Path(__file__).resolve().parents[2];repo=base/'github-plugin-library'
p=repo/'README.md';s=p.read_text(encoding='utf-8-sig');marker='## OpenMouse 鼠标储备与虚拟体验'
s=s.split(marker)[0]+'''## OpenMouse 正式鼠标协议储备

在原有“外设插件 → 鼠标”结构下建立 20 个品牌文件夹，直接存放 329 个有型号依据的正式 `.hhub` 协议包。文件名包含鼠标型号、协议实现名、VID/PID 及版本；原有五个插件保持原内容和位置。根目录保留统一索引。

**实机验证：没有。固件：未知。** 共享接收器和不同连接方式分别计数，不能换算为已验收型号数；没有型号依据的条目未生成成品包。

- [品牌文件夹与逐包下载](./catalog/peripherals/mouse/README.md)
- [完整正式储备 ZIP](./downloads/OpenMouse-Physical-Plugins-0.1.1.zip) · [SHA-256](./downloads/OpenMouse-Physical-Plugins-0.1.1.zip.sha256)
- [功能、安装与验证范围](./docs/OpenMouse储备包.md)
- [完整对应源码与构建脚本](./sources/openmouse/README.md)

虚拟设备由 H hub 宿主提供，直接连接上述正式包。本库不再分发单独的体验插件。当前虚拟设备后端覆盖 VAXEE 和 MCHOSE 两种协议，不能代替实机验证。
''';p.write_text(s,encoding='utf-8')
# Keep the familiar exporter entry point, forwarding to the corrected implementation.
wrapper="from pathlib import Path\nimport runpy\nrunpy.run_path(str(Path(__file__).with_name('export-physical.py')),run_name='__main__')\n"
(base/'openmouse-reserve/tooling/export-to-repository.py').write_text(wrapper,encoding='utf-8')
(repo/'scripts/verify-openmouse.py').write_text((base/'openmouse-reserve/tooling/verify-physical.py').read_text(encoding='utf-8'),encoding='utf-8')
p=base/'openmouse-reserve/tooling/test-ui.mjs';s=p.read_text(encoding='utf-8').replace('productId:0x2002','productId:0x1003').replace("path.join(root,'library/Hhub-OpenMouse-3057-2002-0.1.0.hhub')","path.join(root,'library',JSON.parse(fs.readFileSync(path.join(root,'library/index.json'),'utf8')).plugins.find(e=>e.id==='hhub.openmouse.3057-1003').packageUrl)");p.write_text(s,encoding='utf-8')
