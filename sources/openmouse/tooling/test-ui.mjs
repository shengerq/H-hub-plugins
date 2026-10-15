import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {root} from './build-options.mjs';
const runtime=process.env.HHUB_TEST_NODE_MODULES||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=createRequire(path.join(runtime,'package.json'))('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const context=await browser.newContext({viewport:{width:1120,height:740}});
const checks=[],errors=[];
try{
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 window.hidMock={calls:[],dpi:800,rateCode:2,ignoreWrites:false,denyNext:false};let pending=null;const handlers=[];
 window.chrome={webview:{addEventListener(type,fn){if(type==='message')handlers.push(fn);},postMessage(message){
  const m=window.hidMock,r=message.body.request;m.calls.push(r);
  const reply=(result,error)=>queueMicrotask(()=>handlers.forEach(fn=>fn({data:{type:'hhub.hid.result',token:message.token,result,error}})));
  if(r.operation==='closeAll'||r.operation==='close')return reply({transportVersion:2});
  if(r.operation==='enumerate')return reply({transportVersion:2,devices:[{key:'test-vaxee',vendorId:0x3057,productId:0x1003,productName:'VAXEE simulated receiver',usagePage:0xff05,usage:1,inputLength:0,outputLength:0,featureLength:64,collections:[{usagePage:0xff05,usage:1,children:[],inputReports:[],outputReports:[],featureReports:[{reportId:14,items:[]}]}]}]});
  if(r.operation==='open')return reply({transportVersion:2,inputAvailable:false});
  if(r.operation==='sendFeature'){
   if(m.denyNext){m.denyNext=false;return reply(null,'测试：宿主拒绝写入');}
   pending=r.data.split(/\s+/).map(v=>parseInt(v,16));
   if(pending[2]===2&&!m.ignoreWrites){if(pending[1]===4)m.dpi=pending[5]|pending[6]<<8;if(pending[1]===7)m.rateCode=pending[4];}
   return reply({transportVersion:2});
  }
  if(r.operation==='receiveFeature'){
   const cmd=pending[1],data=cmd===10?[0x11,0x10]:cmd===2?[1]:cmd===4?[1,m.dpi&255,m.dpi>>8]:cmd===7?[m.rateCode]:cmd===8?[1]:cmd===9?[1]:cmd===11?[13]:cmd===16?[0]:cmd===1?[1,2]:[1];
   const packet=new Uint8Array(64);packet.set([14,0xa5,cmd,3,1,data.length,...data]);return reply({transportVersion:2,data:Array.from(packet,v=>v.toString(16).padStart(2,'0')).join(' ')});
  }
  return reply(null,'Unexpected operation: '+r.operation);
 }}};
});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'library',JSON.parse(fs.readFileSync(path.join(root,'library/index.json'),'utf8')).plugins.find(e=>e.id==='hhub.openmouse.3057-1003').packageUrl),'utf8'));
const fixture=path.join(root,'reports/e2e-vaxee.html');fs.writeFileSync(fixture,manifest.ui.content);
await page.goto(pathToFileURL(fixture).href);await page.waitForFunction(()=>window.hhubOpenMouse);
assert.equal(await page.evaluate(()=>window.hidMock.calls.length),0);checks.push('打开页面不枚举或写入硬件');
assert.equal(await page.locator('[data-action="dpi"]').count(),0);checks.push('未连接时不开放写入');
await page.locator('#connect').click();await page.waitForFunction(()=>window.hhubOpenMouse.snapshot?.dpi===800);
assert.equal(await page.locator('#status').getAttribute('data-error'),'false');checks.push('真实 VAXEE 驱动通过模拟 H hub HID v2 完成状态读取');
await page.locator('#dpi').fill('1600');await page.locator('[data-action="dpi"]').click();await page.waitForFunction(()=>window.hhubOpenMouse.snapshot?.dpi===1600&&!document.querySelector('#refresh').disabled);
assert.equal(await page.evaluate(()=>window.hidMock.dpi),1600);checks.push('DPI 从页面经过真实编解码写入模拟设备并回读');
const calls=await page.evaluate(()=>window.hidMock.calls.length);
await page.locator('#dpi').fill('1001');await page.locator('[data-action="dpi"]').click();await page.waitForFunction(()=>document.querySelector('#status').dataset.error==='true');
assert.equal(await page.evaluate(()=>window.hidMock.calls.length),calls);checks.push('无效 DPI 在发送前拒绝');
await page.locator('#tabs [data-tab="performance"]').click();await page.locator('#polling').selectOption('500');await page.locator('[data-action="polling"]').click();await page.waitForFunction(()=>window.hhubOpenMouse.snapshot?.pollingRateHz===500&&!document.querySelector('#refresh').disabled);checks.push('回报率经过协议写入和回读');
await page.locator('#tabs [data-tab="dpi"]').click();await page.evaluate(()=>window.hidMock.ignoreWrites=true);await page.locator('#dpi').fill('3200');await page.locator('[data-action="dpi"]').click();await page.waitForFunction(()=>document.querySelector('#status').dataset.error==='true'&&!document.querySelector('#refresh').disabled);
assert.match(await page.locator('#status').textContent(),/persist/);checks.push('设备忽略写入时显示失败');
await page.evaluate(()=>window.hidMock.ignoreWrites=false);await page.locator('#refresh').click();await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
await page.screenshot({path:path.join(root,'reports/rapoo-style-desktop.png'),fullPage:true});
for(const width of [760,520,390]){await page.setViewportSize({width,height:820});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);for(const tab of ['dpi','performance','advanced','info']){await page.locator(`#tabs [data-tab="${tab}"]`).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}}
checks.push('四个标签页在 760/520/390 px 均无页面横向溢出');
await page.locator('#tabs [data-tab="dpi"]').click();await page.screenshot({path:path.join(root,'reports/rapoo-style-narrow.png'),fullPage:true});
await page.locator('#disconnect').click();await page.waitForFunction(()=>!window.hhubOpenMouse.client&&!document.querySelector('#connect').disabled);checks.push('断开后清除连接及状态');
await page.locator('#connect').click();await page.waitForFunction(()=>window.hhubOpenMouse.snapshot?.dpi===1600);checks.push('断开后可重新连接模拟设备');
await page.locator('#disconnect').click();await page.waitForFunction(()=>!window.hhubOpenMouse.client);
const previewPage=await context.newPage();previewPage.on('pageerror',e=>errors.push(e.message));
for(const name of fs.readdirSync(path.join(root,'preview')).filter(n=>n.endsWith('.html'))){await previewPage.goto(pathToFileURL(path.join(root,'preview',name)).href);await previewPage.waitForFunction(()=>window.hhubOpenMouse);assert.match(await previewPage.locator('#status').textContent(),/未实机验证/);for(const tab of ['performance','advanced','info','dpi'])await previewPage.locator(`#tabs [data-tab="${tab}"]`).click();}
checks.push('所有品牌离线预览脚本加载与四页切换通过');
assert.deepEqual(errors,[]);
fs.writeFileSync(path.join(root,'reports/ui-check.json'),JSON.stringify({hardwareVerified:false,hostImportVerified:false,mode:'真实协议 + 模拟 H hub 传输；Edge 浏览器渲染',checks,errors},null,2));
console.log(JSON.stringify({checks:checks.length,errors:errors.length,hardwareVerified:false}));
}finally{await browser.close();}

