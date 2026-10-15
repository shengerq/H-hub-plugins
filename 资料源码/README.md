# 源码与构建资料

[Hhub 1.0.10 本次宿主及驱动安装包装源码](./Hhub-native-1.0.10-source.zip)。包含原生插件组件契约、EQ 界面、独立驱动安装包装及相应测试，构建说明在压缩包 README 中。

FxSound 驱动来源：[fxsound2/fxsound-driver](https://github.com/fxsound2/fxsound-driver)。原始驱动及许可保持不变，设备显示名称通过安装后设置属性调整，不修改签名 INF。


[Hhub 1.0.10 修订 2 源码](./Hhub-native-1.0.10-r2-source.zip)：恢复开发者工具的市场打开、插件管理及按安装状态显示的侧边栏入口。本地插件页面按规范化后的文件路径校验导航与消息来源，兼容中文目录；仍只在打开时创建 WebView，离页后释放。开发者插件本身仍为 0.5.2，无需重装插件。
