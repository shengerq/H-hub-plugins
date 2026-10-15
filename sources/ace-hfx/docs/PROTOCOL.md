# ACE HFX / M605 协议记录

## 身份和来源

官方 Gear Link `view/7038/manifest.json` 报告 PID 7038 / `0x1B7E`，型号 `m605`，页面版本 `1.00.28`，bundleId `7038-1784769136-06d08f`，无电池信息，磁轴单位 0.1 mm。

官方固件包的 `config.ini` 独立确认 VID `0x0B05`、PID `0x1B7E`、UsagePage `0xFF00`，固件文件 `M605_V01_00_59.bin`，工具版本 `1.0.0.1`，目标固件 `1.00.59`。Bootloader PID 为 `0x1B7F`，本插件明确不匹配它。

本实现以官方网页源码中的设备方法和数据定义为协议资料，重新编写适配器。未执行官方安装器，未进行未知命令扫描，未复制第三方驱动实现或 ASUS UI。

以下偏移是本地 `research/chunk-1.00.28-7038-1784769136-06d08f-BI62m6xD.js` 的 JavaScript 字符串偏移，不能当成抓包或硬件验收记录：

| 依据 | 字符偏移 | 含义 |
|---|---:|---|
| USB 初始化 | 781000 附近 | 普通 USB 设备使用报告 ID 0 |
| `initASUSDevices` | 783216 附近 | M605 实例为 `tr` |
| `class tr extends xn` | 771804 | M605 继承旧编码路径，而非现代 ROG 键盘的通用 RT 写法 |
| 固件矩阵 `Ne.NORMAL` | 706779 | W=18、A=31、S=32、D=33；不是标准 HID Usage |
| `setActuation` | 758742 | 全键 0x50、单键 0x4F，行程字段为小端 16 位 |
| `setRapidTriggerPerKeySettings`（xn） | 771338 | 单字节灵敏度、continuous、enable；独立上下行程用两个不同 index |
| `setDeadZone` | 763076 | 数据顺序 bottom、top |
| `setLightingEffect` | 732659 | 灯效 ID 静态=0、呼吸=1、色彩循环=2 |
| `setKeyBinding` | 740403 | 矩阵键位置放在报文 index 中 |

`tools/inspect-vendor.cjs` 和 `tools/extract-methods.cjs` 可针对这些本地快照提取附近文本，供交叉复核。源码分支和文档来源摘要见 `research/SOURCES.json`。

## 帧格式

只操作厂商控制接口：UsagePage `0xFF00`、Usage `1`，输出及输入报告 ID `0`。WebHID payload 长度 64 字节；H-hub V2 / Win32 的描述符长度含报告 ID 位置，因此预期至少 65 字节。标准键盘输入集合不打开。

```
[command, subcommand, index-low, index-high, ...data, ...zero padding]
```

WebHID 的 `sendReport(0, payload)` 单独传报告 ID；payload 中不再加一字节 `0`。H-hub `sendOutput` 同样单独声明 `reportId:0`。

| 功能 | 读取前缀 | 写入前缀 | 数据 |
|---|---|---|---|
| 基本信息 | `12 00 00 00` | — | FW 在返回 4–7，profileCount 在 8，currentProfile 在 10 |
| 回报率 | `12 15 00 00` | `51 31 00 00` | index 数据值 0=1000 Hz，3=8000 Hz |
| 全键触发 | `25 05 00 00` | `51 50 00 00` | 行程 / 0.1，16-bit LE |
| 单键触发 | `25 04 00 00` | `51 4F 00 00` | firmwareKey LE + 行程 LE |
| 全键死区 | `25 0A 00 00` | `51 58 00 00` | 写入 bottom、top，单位 0.1 |
| 单键死区 | `25 09 00 00` | `51 59 00 00` | firmwareKey LE + bottom、top |
| RT 总开关 | `25 00 00 00` | `51 5C 00 00` | enabled |
| 单键 RT | `25 06 00 00` | `51 54 00 00` | 写入 key LE、sensitivity8、continuous、enabled |
| Speed Tap 开关 | `25 01 00 00` | `51 57 00 00` | enabled |
| Speed Tap 配对 | `25 08 page 00` | `51 55 00 00` | 写入 key1 LE、key2 LE、enabled；读取两页 3+2 组 |
| 普通改键 | `25 0D 00 00` | `51 20 sourceLo sourceHi` | 读取请求数据 source LE；写入数据 target LE |
| 灯效配置 | `25 0E type 00` | `51 2C type 00` | speed、brightness、flags、FF、FF、RGB1、RGB2、background RGB |
| 保存当前配置 | — | `50 55 00 00` | 不自动发送；由用户点保存 |

### M605 专用细节

- 磁轴步进为 0.1 mm。1.2 mm 编码为 12，不是现代 0.01 mm 型号的 120。
- `setActuation` 仍使用两字节；`xn` 的普通 trigger 与 RT 写法另有旧版字段。此版只提供普通按键映射和对称 RT，不拼接现代 RT 结构。
- 单键 RT 读取方法按官方基类解码：响应 4–5 是按下/对称灵敏度，6–7 是独立释放值，9 是 enabled。若 index 表示独立灵敏度，则不把它判定为本次对称写入成功。
- 当前读取接口无法确认 continuous 标志，因此界面明确提示连续模式待真机确认。
- 灯效速度不是滑块序号原样发送：呼吸慢/中/快为 42/30/15，色彩循环为 62/31/18；静态为 255。亮度 0–100。颜色与速度配置回读确认不等同于键盘已正确显示。
- 改键 `51 20` 保留触发字段；不使用会重写行程的 `setKeyTrigger`。

## 事务与错误

同一会话只允许一条在途命令。请求等待同一 report ID 和 command/subcommand 的回复。命令拒绝 `FF AA`、断开、传输超时都会终止当前会话，用户必须重连；不自动重发写入，不把延迟回复用于后续事务。

配置写入 ACK 后执行指定读取并比较；不匹配时显示实际值和“未确认”。WASD 批量设置预先校验所有键与值，执行过程中首项失败就停止；此前已成功的按键可能保留新值，没有自动回滚。

保存命令只校验 ACK。断电持久化、物理拨杆覆盖、固件版本差异均需要实机验收。
