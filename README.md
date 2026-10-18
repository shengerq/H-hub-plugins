# Hhub 外设插件库

本库保留外设插件及现有开发测试工具，共 332 个索引条目。型号、协议和验证状态以各插件声明为准；协议或虚拟设备测试不代表实机验收。

- [鼠标插件](./外设插件/鼠标/)
- [键盘插件](./外设插件/键盘/)
- [开发测试工具](./应用插件/测试型/)
- [Hhub 应用插件库](https://github.com/shengerq/H-hub-app-plugins)：手机遥控、EQ、Windows 管理，统一版本 **1.0**。
- [Hhub 主程序 1.0](https://github.com/shengerq/H-hub/releases/latest)

主程序插件市场默认连接两个官方库，支持相互切换并保留用户自定义源。自动同步入口为本库 `index.json`；应用库的索引为 [应用插件索引](https://raw.githubusercontent.com/shengerq/H-hub-app-plugins/main/index.json)。两个索引通过 `relatedLibraries` 相互连接。
