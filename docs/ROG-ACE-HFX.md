# ROG 魔导士 ACE HFX 0.1.0

[下载插件](../Hhub-ROG-Falchion-ACE-HFX-0.1.0.hhub) · [源码与构建](../sources/ace-hfx/README.md) · [协议记录](../sources/ace-hfx/docs/PROTOCOL.md)

目标设备为 ROG FALCHION ACE HFX / M605 有线版，VID `0B05`、PID `1B7E`，页面为 68 键 ANSI 布局。包 ID 为 `hhub.rog-falchion-ace-hfx`，分类为外设 / 键盘。

## 安装

在 H-hub 同步本插件库，找到“ROG 魔导士 ACE HFX”；也可直接下载 `.hhub` 并导入。宿主须支持 HID V2。只有插件 API `1.0` 标记不能证明宿主已经实现 V2；接口要求见[宿主集成说明](../sources/ace-hfx/docs/HOST-INTEGRATION.md)。

启用插件并进入设备页面，USB 连接 ACE HFX 后点击“连接键盘”。连接和切换按键只读取参数，点击某项“应用”才写入，随后执行回读核对。最后按需点击“保存到键盘”，断电保留仍需重新插拔确认。

## 功能与验证边界

实现触发行程 0.1–4.0 mm、上下死区 0–0.5 mm、单键或 WASD 的对称 RT 灵敏度、主层按键映射、Speed Tap 配对、静态 / 呼吸 / 色彩循环、1000 / 8000 Hz 和板载保存命令。

**本包未实机验证，也尚未完成宿主导入验收。** 30 项离线测试及插件契约校验通过；不把编码、页面数值或命令 ACK 当成硬件验证。连续 RT、实际灯效、物理拨杆覆盖与断电保存待[真机验收](../sources/ace-hfx/docs/ACCEPTANCE.md)。

未实现宏、DKS、Mod Tap、Fn 层、校准、固件刷写或自动场景切换。旧版 Feature 传输不会作为 V2 失败后的替代通道。

## 官方来源

参考 [ROG 产品官网](https://rog.asus.com.cn/keyboards/keyboards/compact/rog-falchion-ace-hfx/) 和 [Gear Link](https://gearlink.asus.com.cn/zh-cn) 中 M605 设备模块，重新编写适配器。已记录官方键盘 Companion 3.1.0.10、固件工具 1.0.0.1 / 固件 1.00.59 及快速使用指南来源；这些版本不是已验证兼容固件声明。

官方安装器、固件、网页源码和 PDF 未打包分发。[来源与摘要记录](../sources/ace-hfx/research/SOURCES.json) 可用于从原厂核对文件。独立 WebHID 页面可从源码构建，不需要安装自定义内核驱动。
