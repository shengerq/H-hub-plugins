import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {root,upstream,options} from './build-options.mjs';
const read=p=>fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'');
const write=(p,data)=>fs.writeFileSync(p,typeof data==='string'?data:JSON.stringify(data,null,2)+'\n');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const candidates=JSON.parse(read(path.join(root,'reports/device-candidates.json')));
const labels=JSON.parse(read(path.join(root,'reports/catalog-names.json')));
const registry=read(path.join(upstream,'src/drivers/registry.ts'));
const imports=registry.slice(0,registry.indexOf('export type PulsarClient'));
const array=registry.slice(registry.indexOf('export const DEVICE_DRIVERS:'));
const driverEntries=array.slice(array.indexOf('[')+1,array.indexOf('\n];')).split('\n').filter(s=>/^\s*\{\s*brand:/.test(s)).map(s=>s.trim().replace(/,$/,''));
if(driverEntries.length!==candidates.driverCount)throw Error(`Registry extraction mismatch ${driverEntries.length} / ${candidates.driverCount}`);
const commit=fs.existsSync(path.join(upstream,'.git'))?execFileSync('git',['-c','safe.directory='+upstream.replaceAll('\\','/'),'-C',upstream,'rev-parse','HEAD'],{encoding:'utf8'}).trim():read(path.join(root,'upstream-commit.txt')).trim();
write(path.join(root,'upstream-commit.txt'),commit+'\n');
const cssFile=path.join(root,'src/rapoo-style.css');
if(!fs.existsSync(cssFile)){
 const rapooFile=path.join(root,'../github-plugin-library/Hhub-Rapoo-VT3S-MAX-0.5.2.hhub');
 const rapoo=JSON.parse(read(rapooFile));
 write(cssFile,rapoo.ui.content.match(/<style>([\s\S]*?)<\/style>/)[1]);
 write(path.join(root,'reports/style-provenance.json'),{source:'Hhub-Rapoo-VT3S-MAX-0.5.2.hhub',sha256:hash(fs.readFileSync(rapooFile)),assetsCopied:false});
}
const css=read(cssFile);
const extra=`header h1{font-size:20px}.verification{color:#e3b66c;font-size:11px;white-space:nowrap}.toolbar{justify-content:flex-end}.toolbar button{padding:7px 12px}.setting{padding:14px 0;border-bottom:1px solid var(--line)}.setting strong{max-width:65%;text-align:right;overflow-wrap:anywhere}.mono{font-family:Consolas,monospace;overflow-wrap:anywhere}#page>.grid{height:auto;min-height:100%;grid-template-columns:repeat(2,minmax(0,1fr));align-items:stretch}.card{display:flex;flex-direction:column}.card .primary{align-self:flex-start;margin-top:14px}.card>p{margin-top:12px}.notice [data-error=true]{color:#ff8a8a!important}.range-control{display:block}.range-control select{margin-top:8px}select{max-width:100%}#interface{width:auto;max-width:240px}.large{margin:20px 0}nav{margin-top:12px}.switch{min-height:56px}@media(max-width:700px){#page>.grid{grid-template-columns:1fr}header{flex-wrap:wrap}.toolbar{justify-content:flex-start}.notice{height:auto;min-height:28px;flex-wrap:wrap}output#status{margin-left:0}}`;
const template=(cfg,bundle)=>`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${cfg.brand} · H hub</title><style>${css}\n${extra}</style></head><body><main><header><h1 id="title"></h1><div class="toolbar"><select id="interface" aria-label="控制接口" hidden></select><button class="primary" id="connect">连接设备</button><button id="refresh" disabled>重新读取</button><button id="disconnect" disabled>断开</button></div></header><div class="notice"><span class="dot"></span><span id="connection">尚未连接设备</span><span class="verification">未实机验证</span><output id="status" aria-live="polite"></output></div><nav id="tabs" aria-label="鼠标设置页面"></nav><section id="page"></section></main><script>window.OPENMOUSE_PLUGIN=${JSON.stringify(cfg).replaceAll('<','\\u003c')};</script><script>${bundle.replaceAll('</script','<\\/script')}</script></body></html>`;
const out=path.join(root,'library');fs.mkdirSync(out,{recursive:true});
fs.mkdirSync(path.join(root,'preview'),{recursive:true});
fs.mkdirSync(path.join(root,'reports/bundles'),{recursive:true});
const used=[...new Set(candidates.devices.flatMap(d=>d.matches.map(m=>m.driverIndex)))];
const bundles=new Map();
for(const idx of used){
 const contents=imports+`\nexport const driver=${driverEntries[idx]};\nimport {mount} from ${JSON.stringify(path.join(root,'src/page.js'))}; mount(driver);`;
 const result=await build({...options,stdin:{contents,resolveDir:path.join(upstream,'src/drivers'),loader:'ts'},platform:'browser',format:'iife',minify:true,write:false,metafile:true});
 bundles.set(idx,result.outputFiles[0].text);
 write(path.join(root,`reports/bundles/driver-${idx}.json`),{inputs:Object.keys(result.metafile.inputs),bytes:result.outputFiles[0].contents.length});
}
const license=read(path.join(upstream,'LICENSE'));
const pack=fields=>fields.map(s=>Buffer.byteLength(s,'utf8')+':'+s).join('');
const plugins=[];const summary=[];const skipped=[];const previewed=new Set();
for(const d of candidates.devices){
 // A single concrete USB identity may resolve to multiple drivers. Do not silently choose one.
 const drivers=[...new Set(d.matches.map(m=>m.driverIndex))];
 if(drivers.length!==1){skipped.push({key:d.key,reason:'同一 VID/PID 存在多个驱动，需要补充实机接口信息',drivers});continue;}
 const idx=drivers[0], id='hhub.openmouse.'+d.key, version='0.1.1';
 if(/Keyboard|Wooting|Nape|DockHidClient|Ak820/.test(driverEntries[idx])){skipped.push({key:d.key,reason:'键盘、轨迹球或独立灯效底座，本批鼠标包不纳入',driverIndex:idx});continue;}
 const hardwareId='USB\\VID_'+d.key.slice(0,4).toUpperCase()+'&PID_'+d.key.slice(5).toUpperCase();
 const slug=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
 const label=labels.find(l=>l.productId===d.productId&&(l.vendorId===undefined||l.vendorId===d.vendorId)&&slug(l.namespace)===slug(d.brand));
 const labelText=label?(label.name.toLowerCase().startsWith(d.brand.toLowerCase())?label.name:d.brand+' '+label.name):d.name;
 let baseName=(labelText||d.brand+' HID').replace(new RegExp(' HID '+d.key+'$','i'),' HID');
 const explicit={'3837-100b':'MCHOSE A7 V2 Ultra+ Receiver','24ae-1205':'Rapoo VT9 Pro Receiver','24ae-4405':'Rapoo VT9 Pro Wired','04f3-026e':'Ryunix KYU Pro MX1 Wired','04f3-026f':'Ryunix KYU Pro MX1 Receiver','1532-00e5':'Razer Viper V4 Pro','1532-00e6':'Razer Viper V4 Pro'};
 if(explicit[d.key])baseName=explicit[d.key];
 // Shared receivers and unknown model labels remain documented gaps, never fabricated products.
 if(!label&&!explicit[d.key]&&/HID/i.test(baseName)){skipped.push({key:d.key,brand:d.brand,reason:'没有可确认的具体型号，未生成成品包'});continue;}
 if(d.brand==='Glorious'&&/GloriousClassicHidClient/.test(driverEntries[idx])){
  const allowed=d.vendorId===0x22d4?[0x1503]:d.vendorId===0x320f?[0x823a,0x821a,0x831a]:d.vendorId===0x3794?[0xa312,0xa300]:d.vendorId===0x258a?null:[];
  if(allowed?!allowed.includes(d.productId):[0x1503,0x823a,0x821a,0x831a,0xa312,0xa300].includes(d.productId)){skipped.push({key:d.key,brand:d.brand,reason:'上游宽泛过滤器组合，缺少该 VID/PID 的型号依据'});continue;}
 }
 const protocol=driverEntries[idx].match(/create:.*?new (\w+)/)?.[1].replace(/HidClient$|Client$/,'')||'Unknown';
 const deviceName=baseName+' ['+d.key.toUpperCase()+']';
 const cfg={name:deviceName,protocol,brand:d.brand,vendorId:d.vendorId,productId:d.productId,version,hardwareId,commit,stripNumberedFeatureId:/VaxeeHidClient/.test(driverEntries[idx])};
 const compatibility={version:1,scope:'device',deviceName,hardwareId,firmwareVersions:[],mobileUi:false};
 const ids=Array.from({length:256},(_,i)=>i);
 const pages=[...new Set(d.matches.map(m=>m.usagePage))];
 const targets=pages.map(usagePage=>({vendorIds:[d.vendorId],productIds:[d.productId],usagePages:[usagePage],usages:[...new Set(d.matches.filter(m=>m.usagePage===usagePage).map(m=>m.usage))],inputReportIds:ids,outputReportIds:ids,featureReportIds:ids,maxPayload:4096}));
 const html=template(cfg,bundles.get(idx));
 const manifest={schemaVersion:1,id,name:deviceName,deviceName,author:'H hub',version,apiVersion:'1.0',kind:'mouse',group:'peripheral',category:'mouse',description:`${d.brand} HID ${d.key.toUpperCase()}：OpenMouse 协议储备包，雷柏风格页面；DPI、回报率及标准传感器开关按驱动能力开放。未实机验证；固件未知。`,permissions:['离线插件页面','USB HID 配置'],requiredHost:{id:'hhub',apiVersion:'1.0',execution:'host-only',standalone:false,features:['pluginHidV2']},updateUrl:'',ui:{type:'offline-html',role:'device',content:html},hidTargets:[],hidV2Targets:targets,compatibility,validation:{hardwareVerified:false,hostImportVerified:false,mobileUiVerified:false,firmwareVerified:false,status:'未实机验证',upstreamRecognitionOnly:true},implementation:{type:'openmouse-native-hid-v2',driverIndex:idx,settings:['dpi','pollingRate','motionSync','angleSnapping','rippleControl'],notes:'按驱动实际能力开放通用控件。专用改键、宏、RGB、配对与固件更新未接入。Report ID 权限还受宿主实际 HID 描述符约束。隐式 Feature Report 和多接口形态可能需要进一步宿主适配。'},sources:[{name:'OpenMouse mouse-protocol',url:'https://github.com/OpenMouse-Project/mouse-protocol',commit,license:'AGPL-3.0-or-later'},{name:'H hub Rapoo VT3S MAX page style',package:'Hhub-Rapoo-VT3S-MAX-0.5.2.hhub'}],license:'AGPL-3.0-or-later',licenseText:license,modificationNotice:'H hub adapter and generic Rapoo-style control page added 2026-10-15. Upstream device-protocol sources preserved in the reserve source snapshot.'};
 const clean=s=>s.replace(/[<>:\\/?*|"\x00-\x1f]/g,'-').replace(/\s+/g,' ').trim();
 const filename=clean(d.brand)+'/'+clean(baseName)+'__'+protocol+'__'+d.key.toUpperCase()+'__'+version+'.hhub';
 fs.mkdirSync(path.dirname(path.join(out,filename)),{recursive:true});
 const data=JSON.stringify(manifest,null,2)+'\n';
 if(Buffer.byteLength(data)>8*1024*1024)throw Error('Package too large: '+filename);
 write(path.join(out,filename),data);
 const entry=Object.fromEntries(['id','name','author','version','kind','group','category','description','compatibility','validation'].map(k=>[k,manifest[k]]));
 entry.packageUrl=filename;entry.sha256=hash(data);entry.tags=['鼠标',d.brand,'OpenMouse','储备','未实机验证'];
 const canonical=pack(['hhub-contract/1','device',deviceName,hardwareId,'false']);
 entry.identityCode='HHUB1-'+hash(pack([id,'H hub',version,entry.sha256,canonical]));
 plugins.push(entry);
 summary.push({id,name:deviceName,brand:d.brand,protocol,hardwareId,package:filename,bytes:Buffer.byteLength(data),driverIndex:idx,hardwareVerified:false,firmwareVersions:[],methods:d.matches[0].methods});
 if(!previewed.has(d.brand)){write(path.join(root,'preview',d.brand.replace(/[^a-z0-9]/gi,'-')+'.html'),html);previewed.add(d.brand);}
}
write(path.join(out,'index.json'),{schemaVersion:1,name:'H hub OpenMouse 储备库（未实机验证）',plugins,verificationRecords:[],upstreamCommit:commit});
write(path.join(out,'SHA256SUMS.txt'),plugins.map(p=>p.sha256+'  '+p.packageUrl).join('\n')+'\n');
for(const filename of fs.readdirSync(out)){if(/^Hhub-OpenMouse-[0-9A-F]{4}-[0-9A-F]{4}-0\.1\.0\.hhub$/.test(filename)&&!plugins.some(p=>p.packageUrl===filename))fs.unlinkSync(path.join(out,filename));}
for(const filename of fs.readdirSync(path.join(root,'preview'))){if(filename.endsWith('.html')&&![...previewed].some(b=>b.replace(/[^a-z0-9]/gi,'-')+'.html'===filename))fs.unlinkSync(path.join(root,'preview',filename));}
write(path.join(root,'LICENSE'),license);
write(path.join(root,'reports/inventory.json'),{commit,pluginCount:plugins.length,brandCount:new Set(summary.map(s=>s.brand)).size,driverBundleCount:bundles.size,packages:summary,skipped});
write(path.join(root,'reports/inventory.csv'),'\uFEFF'+['品牌,名称,硬件识别,包文件,实机验证,固件',...summary.map(s=>[s.brand,s.name,s.hardwareId,s.package,'没有','未知'].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))].join('\r\n'));
console.log(JSON.stringify({commit,packages:plugins.length,brands:new Set(summary.map(s=>s.brand)).size,bundles:bundles.size,skipped:skipped.length,bytes:summary.reduce((n,s)=>n+s.bytes,0)}));
