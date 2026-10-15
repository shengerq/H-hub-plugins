# ROG 魔导士 ACE HFX 驱动插件

独立目录中的首版用户态配置驱动。目标是 **ROG FALCHION ACE HFX / M605 有线版，VID 0B05、PID 1B7E**。包含可导入 H-hub 的 `.hhub` 包和可独立运行的 WebHID 页面，可单独构建，也可集成进兼容的 H-hub 宿主。

**状态：开发版，未完成真机验收。** 本机没有枚举到目标键盘；离线测试、包契约检查和页面预览不能证明硬件功能已经通过。

## 直接使用

- H-hub：导入 `dist/Hhub-ROG-Falchion-ACE-HFX-0.1.0.hhub`，启用插件并打开设备页面。宿主需保留 HID V2 接口，兼容要求见 `docs/HOST-INTEGRATION.md`。
- 独立使用：用桌面 Chrome / Edge 打开 `dist/index.html`。如果浏览器不提供 WebHID，运行 `node tools/serve.cjs`，然后访问 `http://127.0.0.1:47831`。本地服务仅监听回环地址。
- USB 连接键盘，点击“连接键盘”，选择 ACE HFX。首次连接由用户在浏览器中选择设备。进入页面、切换按键或重新连接均不会自动写入预设值。
- 每项设置点击各自的“应用”后写入并回读。最后可点击“保存到键盘”；保存命令收到确认后，仍需重新插拔确认持久化。

无需安装自定义内核驱动。通过系统现有 HID 通道通信。如果其他程序占用设备，退出奥创或 Gear Link 后重连。

## 当前实现

| 功能 | 实现范围 | 验证边界 |
|---|---|---|
| 设备身份、固件、当前配置 | 精确匹配 0B05:1B7E 和 FF00/Usage 1 控制接口 | 固件版本来自设备回复，未声明任何固件已实测 |
| 触发行程 | 全键基础参数 / 单键，0.1–4.0 mm | 写入后回读；全键命令不会主动删除单键覆盖 |
| 顶部、底部死区 | 全键基础参数 / 单键，0–0.5 mm | 写入后回读 |
| Rapid Trigger | 总开关、单键或 WASD 对称灵敏度，0.1–2.5 mm | 按键开关和灵敏度回读；连续模式行为待真机确认 |
| 按键映射 | 主层键盘键、多媒体键、禁用、恢复当前键 | 独立映射命令，不主动重写触发行程 |
| Speed Tap | 总开关、添加 / 移除指定配对、读取现有配对 | 保留其他已有配对，写入后回读 |
| 灯光 | 静态、呼吸、色彩循环，亮度、颜色、速度 | 回读对应灯效配置；实际亮灯情况待目视确认 |
| USB 回报率 | 1000 / 8000 Hz | 与官方 M605 页面提供的两档一致 |
| 板载保存 | 保存当前配置 | 只声明设备确认命令，不声称已验证断电保留 |

界面为 68 键 ANSI 布局。其他地区布局、ZywOo 版、Ace 75 HE、普通 Falchion ACE 都不在本次适配范围内。未实现 Fn 层、宏、DKS、Mod Tap、校准、固件刷写和自动场景切换；未发送相关命令。

## 文件

- `src/`：独立协议、通信桥、界面源码。没有打包第三方网页框架或 ASUS 网页源码。
- `dist/`：`.hhub` 安装包、单文件网页版、开发索引和 SHA256。
- `research/SOURCES.json`：官方资料的原始 URL、版本、文件大小和摘要。官方网页源码、安装包、固件和 PDF 不随本仓库分发；可按记录访问 ASUS 官网。
- `docs/PROTOCOL.md`：报文表、M605 专用编码、研究依据。
- `docs/HOST-INTEGRATION.md`：H-hub 宿主集成接口。
- `docs/ACCEPTANCE.md`：真机验收步骤和未验证项。
- `docs/VALIDATION.md`：当前离线验证结果。

## 开发

需要 Node.js 18 或更新版本，无 npm 依赖。

```powershell
node tools/build.cjs
node --test tests/*.test.cjs
node tools/serve.cjs
```

编辑 `src` 后重新构建。`tools/build.cjs` 同时更新包内容、SHA256 和 H-hub 插件唯一编码。开发索引的硬件验证记录保持为空，不自动发布到公共插件库。

## 官方入口

- [产品官网](https://rog.asus.com.cn/keyboards/keyboards/compact/rog-falchion-ace-hfx/)
- [驱动与工具下载](https://rog.asus.com.cn/keyboards/keyboards/compact/rog-falchion-ace-hfx/helpdesk_download/)
- [奥创极速网页版](https://gearlink.asus.com.cn/zh-cn)
- [官方常见问题](https://rog.asus.com.cn/support/faq/1054795/)

下载文件、版本、原始 URL 和摘要见 `research/SOURCES.json`。官网研究资料截至 2026-10-15。

发布包：[Hhub-ROG-Falchion-ACE-HFX-0.1.0.hhub](../../Hhub-ROG-Falchion-ACE-HFX-0.1.0.hhub)。源目录中的 `dist/` 在本地运行构建命令后生成。
