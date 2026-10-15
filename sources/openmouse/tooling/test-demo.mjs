import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {root} from './build-options.mjs';
const runtime=process.env.HHUB_TEST_NODE_MODULES||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=createRequire(path.join(runtime,'package.json'))('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const checks=[],errors=[];
try{
const context=await browser.newContext({viewport:{width:1200,height:850}}),page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.nativeCalls=0;window.chrome={webview:{postMessage(){window.nativeCalls++;throw Error('Virtual page must never access native HID');},addEventListener(){}}};});
await page.goto(pathToFileURL(path.join(root,'demo/index.html')).href);
const getFrame=()=>page.frames().find(f=>f.parentFrame());
await page.waitForFunction(()=>document.getElementById('plugin').contentWindow?.hhubOpenMouse?.snapshot?.dpi===800);
checks.push('VAXEE 虚拟设备自动连接，使用真实协议读取 800 DPI');
let frame=getFrame();await frame.locator('#dpi').fill('1600');await frame.locator('[data-action="dpi"]').click();await frame.waitForFunction(()=>window.hhubOpenMouse.snapshot?.dpi===1600&&!document.getElementById('refresh').disabled);checks.push('VAXEE DPI 写入及回读');
await page.locator('#plug').click();await frame.waitForFunction(()=>!window.hhubOpenMouse.client);await page.locator('#plug').click();await frame.waitForFunction(()=>window.hhubOpenMouse.snapshot?.dpi===1600);checks.push('虚拟拔插和重连保留配置');
await page.locator('#model').selectOption('mchose');await page.waitForFunction(()=>document.getElementById('plugin').contentWindow?.hhubOpenMouse?.snapshot?.brand==='MCHOSE');frame=getFrame();
const status=await frame.evaluate(()=>window.hhubOpenMouse.snapshot);assert.equal(status.ui.settingsReady,true);checks.push('MCHOSE 虚拟设备真实协议读取配置');
await frame.locator('#dpi').fill('3200');await frame.locator('[data-action="dpi"]').click();await frame.waitForFunction(()=>window.hhubOpenMouse.snapshot?.dpi===3200&&!document.getElementById('refresh').disabled);checks.push('MCHOSE DPI 写入及回读');
await frame.locator('#tabs [data-tab="performance"]').click();
await frame.locator('#polling').selectOption('4000');await frame.locator('[data-action="polling"]').click();await frame.waitForFunction(()=>window.hhubOpenMouse.snapshot?.pollingRateHz===4000&&!document.getElementById('refresh').disabled);checks.push('MCHOSE 回报率写入及回读');
for(const setting of ['motionSync','angleSnapping','rippleControl']){const initial=await frame.evaluate(k=>window.hhubOpenMouse.snapshot[k],setting);await frame.locator(`[data-action="${setting}"]`).click();await frame.waitForFunction(([k,value])=>window.hhubOpenMouse.snapshot[k]===value&&!document.getElementById('refresh').disabled,[setting,!initial]);checks.push('MCHOSE '+setting+' 写入及回读');}
await page.locator('#ignore').check();await frame.locator('#polling').selectOption('1000');await frame.locator('[data-action="polling"]').click();await frame.waitForFunction(()=>document.getElementById('status').dataset.error==='true'&&!document.getElementById('refresh').disabled);checks.push('模拟设备忽略写入显示失败');await page.locator('#ignore').uncheck();
assert.equal(await page.evaluate(()=>window.nativeCalls),0);assert.equal(await frame.evaluate(()=>window.nativeCalls),0);checks.push('全程未调用宿主原生 HID');
await frame.locator('#refresh').click();await frame.waitForFunction(()=>!document.getElementById('refresh').disabled);
await page.screenshot({path:path.join(root,'reports/virtual-lab-desktop.png'),fullPage:true});
await page.reload();await page.waitForFunction(()=>document.getElementById('plugin').contentWindow?.hhubOpenMouse?.snapshot);checks.push('重新加载仍可启动');
const packageData=JSON.parse(fs.readFileSync(path.join(root,'demo/Hhub-OpenMouse-Virtual-Lab-0.1.0.hhub'),'utf8'));
assert.deepEqual(packageData.permissions,['离线插件页面']);
const csp=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-src 'self' about: blob:; object-src 'none'; base-uri 'none'; form-action 'none'">`;
const fixture=path.join(root,'reports/virtual-lab-host-csp.html');fs.writeFileSync(fixture,csp+packageData.ui.content);await page.goto(pathToFileURL(fixture).href);await page.waitForFunction(()=>document.getElementById('plugin').contentWindow?.hhubOpenMouse?.snapshot);checks.push('H hub 同等 CSP 下 iframe 与协议运行通过');
assert.deepEqual(errors,[]);fs.writeFileSync(path.join(root,'reports/virtual-lab-check.json'),JSON.stringify({checks,errors,hardwareVerified:false,nativeHidCalls:0},null,2));console.log(JSON.stringify({checks:checks.length,errors:errors.length,nativeHidCalls:0}));
}finally{await browser.close();}
