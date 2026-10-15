import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {root} from './build-options.mjs';
const dir=path.join(root,'library'),feed=JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8'));
const ids=new Set(),errors=[];
for(const entry of feed.plugins){try{
 assert(!ids.has(entry.id));ids.add(entry.id);
 assert.equal(path.basename(entry.packageUrl),entry.packageUrl);
 const data=fs.readFileSync(path.join(dir,entry.packageUrl));assert(data.length<8*1024*1024);
 assert.equal(crypto.createHash('sha256').update(data).digest('hex'),entry.sha256);
 const p=JSON.parse(data);for(const k of ['id','name','author','version'])assert.equal(p[k],entry[k]);
 assert.deepEqual(p.compatibility,entry.compatibility);assert.deepEqual(p.compatibility.firmwareVersions,[]);
 assert.equal(p.validation.hardwareVerified,false);assert.equal(p.validation.hostImportVerified,false);assert.equal(p.compatibility.mobileUi,false);
 assert.equal(p.license,'AGPL-3.0-or-later');assert.match(p.licenseText,/GNU AFFERO GENERAL PUBLIC LICENSE/);
 assert.equal(p.ui.type,'offline-html');assert.match(p.ui.content,/未实机验证/);
 for(const match of p.ui.content.matchAll(/<script>([\s\S]*?)<\/script>/gi))new vm.Script(match[1]);
 assert.equal(/<script[^>]*\bsrc\s*=|<link[^>]*\bhref\s*=/i.test(p.ui.content),false);
 for(const target of p.hidV2Targets){assert.equal(target.vendorIds.length,1);assert.equal(target.productIds.length,1);assert.equal(target.usagePages.length,1);assert(target.usages.length>0);assert.equal(`USB\\VID_${target.vendorIds[0].toString(16).padStart(4,'0')}&PID_${target.productIds[0].toString(16).padStart(4,'0')}`.toUpperCase(),p.compatibility.hardwareId);}
 }catch(error){errors.push({id:entry.id,error:error.message});}}
assert.equal(feed.verificationRecords.length,0);
const result={packages:feed.plugins.length,allPassed:errors.length===0,errors,hardwareVerified:false,hostImportVerified:false,checks:['摘要与身份','设备契约与未知固件','未实机验证状态','AGPL 许可','内嵌 JavaScript 语法','离线资源','精确 VID/PID 与接口策略','8 MiB 包大小限制']};
fs.writeFileSync(path.join(root,'reports/package-check.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({packages:result.packages,errors:errors.length,hardwareVerified:false}));if(errors.length)process.exitCode=1;
