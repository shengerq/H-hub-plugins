# Hhub 虚拟音频驱动独立安装

[下载 HhubAudioDriverSetup.exe](./HhubAudioDriverSetup.exe?raw=1)。仅安装虚拟音频驱动，不安装 Hhub 或 FxSound 应用；通用 EQ 插件也包含同一安装程序，无需重复下载。

使用 FxSound 官方原始签名驱动（Windows x64）。安装时需要 Windows 管理员授权，可能需要重启。请先退出 FxSound，再运行并按提示安装；安装后在 Hhub 中选择物理输出、绑定需要处理的应用。端点显示名称通过系统属性设置为 Hhub，不修改签名文件。

SHA-256 见 SHA256SUMS.txt。安装器包含 FxSound driver 的 AGPL 及 Microsoft Limited Public License 文本。[安装包装源码及构建资料](../资料源码/)，[驱动原始源码](https://github.com/fxsound2/fxsound-driver)。
