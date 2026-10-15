import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {root,upstream,options} from './build-options.mjs';
const dest=path.join(root,'reports/introspection.mjs');
await build({...options, stdin:{contents:`export * from ${JSON.stringify(upstream+'/src/drivers/registry.ts')}; export * from ${JSON.stringify(upstream+'/src/drivers/vendors.ts')};`,resolveDir:upstream,loader:'ts'},format:'esm',platform:'node',outfile:dest});
const lib=await import('file:///'+dest.replaceAll('\\','/'));
const filters=lib.SUPPORTED_HID_FILTERS;
// A concrete receiver identity documented by upstream's captured MCHOSE A7 V2 tests.
filters.push({vendorId:0x3837,productId:0x100b,usagePage:0xff01,usage:1});
const finite=filters.filter(f=>Number.isInteger(f.vendorId)&&Number.isInteger(f.productId));
const pages=[0xff00,0xff01,0xff02,0xff03,0xff04,0xff05,0xff0a,0xffff,0xffc1,0xff60,0x8c,0x01,0x0c];
const groups=new Map();
const exceptions=[];
for(const f of finite){
 const key=f.vendorId.toString(16).padStart(4,'0')+'-'+f.productId.toString(16).padStart(4,'0');
 let group=groups.get(key);
 if(!group){group={key,vendorId:f.vendorId,productId:f.productId,matches:[],filters:[],name:null,brand:null};groups.set(key,group);}
 group.filters.push(f);
 for(const page of (f.usagePage===undefined?pages:[f.usagePage])) for(const usage of (f.usage===undefined?[0,1,2,3,4,0x10,0x61,0x80]:[f.usage])) {
  for(const length of [64,90,32,20,16,8,256]){
   const reports=Array.from({length:33},(_,reportId)=>({reportId,items:[{reportSize:8,reportCount:length}]}));
   const device={vendorId:f.vendorId,productId:f.productId,productName:'',opened:false,collections:[{usagePage:page,usage,inputReports:reports,outputReports:reports,featureReports:reports,children:[]}]};
   const idx=lib.DEVICE_DRIVERS.findIndex(d=>{try{return d.supports(device);}catch{return false;}});
   if(idx<0)continue;
   const driver=lib.DEVICE_DRIVERS[idx];
   let client;try{client=driver.create(device);}catch(e){exceptions.push({key,idx,error:e.message});continue;}
   let name;try{name=client?.displayName?.();}catch{}
   const prototype=Object.getPrototypeOf(client||{});
   const methods=Object.entries(Object.getOwnPropertyDescriptors(prototype)).filter(([k,v])=>!k.startsWith('_')&&typeof v.value==='function').map(([k])=>k);
   const match={driverIndex:idx,brand:driver.brand,usagePage:page,usage,descriptorLength:length,methods};
   if(!group.matches.some(m=>m.driverIndex===idx&&m.usagePage===page&&m.usage===usage))group.matches.push(match);
   if(!group.name){group.name=name||driver.brand+' HID '+key;group.brand=driver.brand;}
   break;
  }
 }
}
const matched=[...groups.values()].filter(g=>g.matches.length);
fs.writeFileSync(path.join(root,'reports/device-candidates.json'),JSON.stringify({filterCount:filters.length,finiteFilterCount:finite.length,driverCount:lib.DEVICE_DRIVERS.length,devices:matched,unmatched:[...groups.values()].filter(g=>!g.matches.length),broadFiltersExcluded:filters.filter(f=>f.productId===undefined),exceptions},null,2));
console.log(JSON.stringify({filters:filters.length,finite:finite.length,devices:matched.length,unmatched:groups.size-matched.length,brands:[...new Set(matched.map(g=>g.brand))],drivers:lib.DEVICE_DRIVERS.length}));
