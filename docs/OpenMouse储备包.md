# OpenMouse 鼠标储备包

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
