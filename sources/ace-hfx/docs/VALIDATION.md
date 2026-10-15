# 验证记录

日期：2026-10-15，Asia/Shanghai。

## 已完成

- `node tools/build.cjs`：生成单文件 WebHID 页面、`.hhub` 包、开发索引、唯一编码及 SHA256。
- `node --test tests/*.test.cjs`：30 项离线测试通过，覆盖独立对照报文、单位及字段顺序、M605 旧版 RT 编码、输入边界、设备接口筛选、请求串行、设备拒绝、超时、断线、句柄释放、回读不一致、包完整性。
- 从 H-hub 公开源码构建 `PluginContract.cs` 校验工具，对 `dist/index.json` 及实际包校验通过。详见 `contract-results.txt`。
- 本地服务正常返回驱动页面。浏览器预览没有控制台错误；实际点击 A 键后选中状态更新，设备写入按钮保持禁用。
- 默认窗口预览双列卡片；窄窗口预览切换单列，页面 scrollWidth 与 clientWidth 均为 465，没有整体水平溢出；键盘区域可以独立横向滚动。临时 viewport 覆盖已撤销。
- 官方安装包只下载及检查归档内容。固件配置中的 VID/PID/型号与官方网页 manifest 一致。

测试明细：`test-results.txt`。页面截图：`preview-desktop.png`、`preview-narrow.png`。截图来自未连接设备状态。

## 尚未验证

- 未发现目标键盘，没有向真实 ACE HFX 发送任何命令。
- 所有硬件写入、设备回读、键盘实际行为、物理 RT 拨杆覆盖、断电保存均未实机验收。
- 尚未在H-hub 宿主里完成导入、页面关闭与主题切换验收。
- 没有把官方固件文件版本 `1.00.59` 当成已验证兼容固件；包的 firmwareVersions 保持为空。

下一步按 `ACCEPTANCE.md` 操作并记录结果。
