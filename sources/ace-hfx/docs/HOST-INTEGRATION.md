# H-hub 宿主集成接口

该目录是独立插件工程，协议层与宿主通信层分开维护。优先导入 `dist/*.hhub`；也可复用 `src/protocol.js` 的 `AceHfx.Driver`。

## 最小通信接口

独立协议层接收一个对象：

```javascript
const driver = new AceHfx.Driver({
  async exchange(payload) {
    // payload: 64-byte Uint8Array, report ID is separately fixed to 0.
    // Return a matching input payload, without the report ID byte.
    // Reject on timeout/disconnect/device rejection. Never retry writes here.
    return replyPayload;
  }
});
```

`Driver` 方法完成单位编码、串行配置写入及回读确认；界面代码不负责拼接报文。`commands` 可供离线查看，不能把编码成功当成设备成功。

## 当前 H-hub HID V2 契约

以公开仓库 `shengerq/H-hub` 的 `source/PluginHidV2.h` 和 `source/PluginPage.inc` 为接口依据，研究时仓库 HEAD 为 `ce323511db21e69b567936cab87dbcb62c8b30e9`。重构后若接口变化，修改 `src/transport.js` 即可。

页面发送：

```json
{"type":"hhub.hid","token":"ace-unique-token","body":{"request":{"transportVersion":2,"operation":"enumerate"}}}
```

宿主回复：

```json
{"type":"hhub.hid.result","token":"ace-unique-token","result":{"transportVersion":2,"devices":[]}}
```

异常用同级 `error` 字符串，不同时返回伪成功 `result`。

| operation | 额外请求字段 | 回复 |
|---|---|---|
| enumerate | — | transportVersion=2、devices 数组 |
| open | key：宿主枚举返回的临时令牌 | inputAvailable=true |
| sendOutput | key、reportId=0、data=空格分隔 hex | 写入结果或异常 |
| poll | key | events: [{reportId:0,data:"12 15 ..."}] |
| close | key | 释放输入和输出句柄 |

枚举字段使用 `key/vendorId/productId/productName/usagePage/usage/inputLength/outputLength/inputIds/outputIds/containerId`。宿主必须保留插件的 `hidV2Targets` 白名单。页面不提交 Windows 设备路径，宿主令牌必须按插件隔离。

UI 类型为 `offline-html`，role=device，权限为“离线插件页面”“USB HID 配置”，插件种类 keyboard。`hidTargets` 中的旧传输命令列表为空；不会降级到旧 Feature 传输。最低要求是已实现 V2 契约的宿主，单看 `apiVersion:1.0` 不足以证明具备 V2。

官网链接通过相同桥中的 `openLink` 请求，由宿主只允许 manifest.externalLinks 中的精确 HTTPS 地址。

## 状态与验证

- `compatibility.firmwareVersions` 与索引的 `verificationRecords` 为空，直到有实际硬件、固件和验收记录。
- 没有注册自动场景 Worker；配置持久化当前只走键盘自身的保存命令。
- 无电池上报、无系统键盘监听、无普通输入报告采集。
- `dist/index.json` 是本地开发索引，不是已发布公共目录。不要直接把它覆盖合并进现有公共目录。
- 标准宿主 `PluginContract.cs` 的包身份、SHA256 和契约检查已通过；完整宿主导入及设备交互仍需在重构项目中验收。

## 重构后的接入验收

导入并启用包后，打开页面应显示“H-hub HID V2 插件”。没有键盘时“连接键盘”应给出未发现设备提示。匹配硬件连接后先完成纯读取流程，再按 `ACCEPTANCE.md` 验收单项写入。关闭页面需释放 HID 句柄，主题变更和减少动画设置通过 `hhub.theme` 继续传入。
