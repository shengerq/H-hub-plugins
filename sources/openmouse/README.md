> 这是现有插件分发仓库中的对应源码目录。发行 `.hhub` 和统一 `index.json` 仍在仓库根目录；本目录的 `library/`、`preview/`、`demo/` 是运行构建脚本后生成的输出，不在源码树内重复存储。

# H hub · OpenMouse 鼠标协议储备包

首批 420 个 `.hhub` 候选包，按明确的 VID/PID 分包，覆盖 26 个品牌标识。版本 `0.1.0`。全部标明 **未实机验证**，可供 H hub 后续适配、导入及硬件测试储备。

另附一个独立的 **虚拟鼠标体验插件**，放在 `demo/`。它归入应用插件 / 实验型应用，只使用离线页面权限，以真实 VAXEE / MCHOSE 协议驱动软件模拟设备。打开 `demo/index.html` 可直接体验 DPI、回报率、传感器开关、拔插及写入失败；不创建系统级 USB 设备、不改变真实鼠标。

包数量包含鼠标本体、不同连接方式、接收器和上游过滤器中的候选组合；不是 420 款已确认存在且兼容的鼠标 SKU。部分接收器的具体型号只能连接后读取。未声明准确 PID 的宽泛过滤器没有直接生成万能包。

## 使用与文件

- `library/`：可供支持 HID v2 的 H hub 导入的 `.hhub` 包、独立 `index.json`、SHA-256 摘要。未改动现有正式插件库。
- `reports/inventory.csv`：按品牌、名称、VID/PID 列出的储备清单，实机验证均为“没有”。
- `reports/inventory.json`：完整条目、驱动方法清单及排除原因。
- `preview/`：各品牌离线页面预览。普通浏览器可看界面，配置设备需由 H hub 提供 HID v2。
- `src/`、`tooling/`：H hub 传输适配、通用页面和可重复构建脚本。
- `upstream/mouse-protocol/`：固定版本的完整上游源码快照。

在 H hub 插件管理中导入相应 `.hhub`，打开插件页面，点击“连接设备”。先按清单核对 VID/PID；一个物理设备若提供多个控制接口，可用页面的接口选择框切换。

本批要求宿主具备 `PluginHidV2` / `pluginHidV2` 与 `transportVersion: 2` 消息通道。`apiVersion: 1.0` 本身不能证明宿主已实现该扩展；不支持时页面会提示更新 H hub。**本次未运行 H hub 的实际导入验收。**

`compatibility.firmwareVersions` 全部为空，表示固件未知；严格固件匹配接口不会自动匹配这些包。补充真实固件和验收记录后再发布新版本，不能填猜测版本。

## 页面与功能

页面沿用现有雷柏 VT3S MAX 0.5.2 插件的蓝灰底色、浅蓝强调色、紧凑卡片和横向标签页；保留宿主主题覆盖所需的结构与 CSS 类。未复制雷柏品牌产品图片。

| 页面 | 当前接入 |
| --- | --- |
| DPI 设置 | 当前驱动状态、DPI 选择与应用、电量及连接信息 |
| 性能设置 | 回报率、Motion Sync、角度修正、波纹修正 |
| 高级参数 | 已返回参数与通用适配范围说明 |
| 设备与来源 | 固件读数、硬件识别、版本、协议提交与验证状态 |

可写选项受实际驱动方法、有效值列表、状态字段及 UI 能力限制。没有能力依据的控件不开放。页面加载不会主动枚举或配置设备，点击“连接设备”后才启动协议操作。

本批通用页面尚未接入各品牌专用的改键、宏、RGB、配对、固件更新及校准流程。上游库中存在这些方法，不代表通用页面已经提供对应功能。

驱动声明 `valuesVerified: false` 时，会展示其值来自缓存或默认值；发送命令后也不显示为独立硬件回读验证。其他驱动的读后比较只说明软件返回值相同，仍不构成本插件实机验收。

## 已完成的验证

| 验证 | 结果 | 范围 |
| --- | --- | --- |
| 插件契约、身份编码与 SHA-256 | 420 包通过 | 使用 H hub 原有 C# 契约检查器 |
| 包结构、脚本语法及离线资源 | 420 包通过 | 见 `reports/package-check.json` |
| 上游协议模拟测试 | 551 项通过 | 43 个测试文件，覆盖选取的 9 个驱动目录；不是全部型号的硬件测试 |
| H hub HID v2 适配测试 | 8 项通过 | 队列、字节边界、Feature 前缀、输入事件、缓存与失败处理 |
| 虚拟鼠标体验检查 | 13 组通过 | 两台虚拟设备、真实协议读写、失败/拔插、零真实 HID 调用及宿主同等 CSP |
| 浏览器 UI 与协议链路 | 11 组检查通过 | 真实 VAXEE 协议 + 模拟 H hub/设备；所有品牌预览；1120、760、520、390 px 布局 |
| 真实鼠标读写、断线恢复、断电保存 | 没有 | 需要对应硬件与固件 |
| H hub 真实导入和 Windows HID API 端到端验收 | 没有 | 本次使用模拟宿主传输 |
| 手机控制验收 | 没有 | `mobileUi: false` |

测试日志和截图在 `reports/`。预览图中的 DPI、电量和回报率来自模拟设备。

## 已知适配边界

1. 当前宿主按 Windows HID 顶层集合枚举，部分上游驱动需要多接口聚合、实际报告长度或隐式 Feature Report；未实机验证前，识别成功仍可能连接失败。
2. 上游部分过滤器含跨 VID 的候选组合，不能仅据包存在判断具体硬件兼容。
3. 没有从宽泛 VID 过滤器推断任意 PID。罗技、Pulsar 以及部分 ATK/Lamzu 等广泛发现路径需要进一步按设备目录生成精确条目；本批不宣称全量覆盖上游品牌。
4. 8 个键盘、轨迹球或独立底座候选条目未纳入鼠标库；17 个有限 VID/PID 候选未能在描述符模型中匹配驱动，另行记录在 `reports/device-candidates.json`。
5. 非零 Feature Report 的 ID 默认保留；Windows 为无编号报告添加的零前缀会去除。VAXEE 编解码器使用纯负载，单独配置其去除报告 ID。没有修改上游协议源码。

## 来源、许可与构建

上游：[OpenMouse-Project/mouse-protocol](https://github.com/OpenMouse-Project/mouse-protocol)，固定提交 `c3b1bc20866fbef3a27b37ad020887607d6dbbf2`。协议与派生适配保留 **AGPL-3.0-or-later**，许可证见根目录 `LICENSE`。对外分发时保留版权和许可声明，并提供对应源码及修改；本储备目录附有源码与构建脚本。

页面风格来源包和摘要见 `reports/style-provenance.json`。修改记录见 `CHANGELOG.md`。

使用 Node.js 22 或更新版本，在 `tooling/` 安装锁定的 esbuild 依赖后，从本目录依次执行：

```powershell
node tooling/inspect.mjs
node tooling/catalog-names.mjs
node tooling/build.mjs
node tooling/build-demo.mjs
node tooling/verify-packages.mjs
node --test tooling/test-transport.mjs
node tooling/test-protocols.mjs
```

UI 检查脚本 `tooling/test-ui.mjs` 使用 Playwright 和本机 Edge；可通过 `HHUB_TEST_NODE_MODULES` 指定已安装 Playwright 的 `node_modules` 目录。它只访问本地页面与模拟宿主。

`tooling/test-demo.mjs` 检查可供用户操作的虚拟鼠标体验。MCHOSE A7 V2 的 DPI 使用驱动明确提供的当前板载档位编辑接口。

`tooling/build.mjs` 使用随附源码快照、提交记录与 `src/rapoo-style.css`，不需要另行访问原插件仓库。目录中没有自动发布、自动安装或自动写入真实设备的脚本。
