# OpenMouse 正式协议储备包

共 329 个有型号名称依据的真实协议包，20 个品牌。包名包含鼠标型号、协议实现名、VID/PID 和版本。原有五个插件条目保持原内容与位置。所有新增包均是 HID v2 设备插件；本次发行不含体验插件。

[品牌文件夹](../catalog/peripherals/mouse/README.md) · [完整储备 ZIP](../downloads/OpenMouse-Physical-Plugins-0.1.1.zip) · [对应源码](../sources/openmouse/README.md)

## 功能范围

包含 OpenMouse 真实驱动及 H hub HID v2 适配，采用雷柏插件页面风格。DPI、回报率和 Motion Sync / 角度修正 / 波纹修正按各驱动实际返回的能力开放。只读协议不会获得虚构写入功能。专用改键、宏、RGB、配对及固件更新尚未接入通用页面。

## 验证状态

实机验证：**没有**。固件列表：未知。型号标签来自对应源码，不代表本项目已验收硬件。共享接收器的具体配对型号仍以连接读取为准。宽泛过滤器不能作为 VID/PID 组合存在的证据；未确认条目列在 inventory.json 的 skipped 中，不计入正式包。

## 虚拟设备

虚拟设备属于 H hub 宿主的 HID 后端。以隔离鼠标测试配置启动宿主，并设置 `HHUB_VIRTUAL_MOUSE=1`，会出现 VAXEE XE Wireless 和 MCHOSE A7 V2 Ultra+ 接收器两台虚拟设备。直接安装本库对应的正式 `.hhub` 即可；不需要另一种体验包。虚拟设备只能验证软件协议流程，不能证明真实鼠标可用，也不表示其他协议已有模拟器。

## 构建

源码采用 AGPL-3.0-or-later，保留上游对应源码和提交号。先在 tooling 安装依赖，然后运行 catalog-names.mjs、inspect.mjs、build.mjs；export-physical.py 保留原有目录分类并导出品牌文件夹。
