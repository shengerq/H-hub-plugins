import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {root} from './build-options.mjs';
const output=path.join(root,'reports/transport-under-test.mjs');
await build({entryPoints:[path.join(root,'src/transport.js')],bundle:true,platform:'node',format:'esm',outfile:output});
const {createTransport}=await import(pathToFileURL(output).href);
const config={vendorId:0x1234,productId:0x5678};
function device(extra={}){return {key:'owned-token',vendorId:config.vendorId,productId:config.productId,featureLength:65,inputLength:3,outputLength:65,collections:[{usagePage:0xff00,usage:1,inputReports:[{reportId:4,items:[]}],featureReports:[{reportId:0,items:[]}],outputReports:[],children:[]}],...extra};}
function setup(handler,extra={}){const listeners=[],calls=[];globalThis.chrome={webview:{addEventListener(type,fn){listeners.push(fn);},postMessage(m){calls.push(m.body.request);Promise.resolve().then(()=>handler(m.body.request)).then(result=>listeners.forEach(fn=>fn({data:{type:'hhub.hid.result',token:m.token,result}})),error=>listeners.forEach(fn=>fn({data:{type:'hhub.hid.result',token:m.token,error:error.message}})));}}};return {hid:createTransport({...config,...extra}),calls};}
test('no traffic until requested; enumeration refuses devices outside the package identity',async()=>{
 const {hid,calls}=setup(async()=>({transportVersion:2,devices:[device(),device({vendorId:7})]}));assert.equal(calls.length,0);const devices=await hid.getDevices();assert.equal(devices.length,1);assert.equal(devices[0].collections[0].featureReports[0].items[0].reportCount,64);await hid.getDevices();assert.equal(calls.length,1);
});
test('sendReport preserves subarray boundaries and uses only the opaque device token',async()=>{
 const {hid,calls}=setup(async r=>r.operation==='enumerate'?{transportVersion:2,devices:[device()]}:{});const [d]=await hid.getDevices();await d.sendReport(7,new Uint8Array([9,1,2,9]).subarray(1,3));assert.equal(calls[1].data,'01 02');assert.equal(calls[1].key,'owned-token');assert.equal(calls[1].transportVersion,2);assert.equal('path' in calls[1],false);
});
test('concurrent requests remain serialized; a rejected command does not poison the queue',async()=>{
 let count=0;const {hid,calls}=setup(async r=>{if(r.operation==='enumerate')return {transportVersion:2,devices:[device()]};if(++count===1)throw Error('denied');return {};});const [d]=await hid.getDevices();const results=await Promise.allSettled([d.sendReport(1,new Uint8Array([1])),d.sendReport(2,new Uint8Array([2]))]);assert.equal(results[0].status,'rejected');assert.equal(results[1].status,'fulfilled');assert.deepEqual(calls.slice(1).map(c=>c.reportId),[1,2]);
});
test('unnumbered feature reports remove exactly one Windows zero prefix',async()=>{
 const {hid}=setup(async r=>r.operation==='enumerate'?{transportVersion:2,devices:[device()]}:{data:'00 00 2a'});const [d]=await hid.getDevices();const result=await d.receiveFeatureReport(0);assert.deepEqual([...new Uint8Array(result.buffer,result.byteOffset,result.byteLength)],[0,42]);
});
test('numbered feature prefix is retained unless payload framing is explicitly selected',async()=>{
 for(const strip of [false,true]){const {hid}=setup(async r=>r.operation==='enumerate'?{transportVersion:2,devices:[device()]}:{data:'07 2a'},{stripNumberedFeatureId:strip});const [d]=await hid.getDevices();const view=await d.receiveFeatureReport(7);assert.deepEqual([...new Uint8Array(view.buffer,view.byteOffset,view.byteLength)],strip?[42]:[7,42]);}
});
test('input polling dispatches report payload and stops after close',async()=>{
 let polled=0;const {hid,calls}=setup(async r=>r.operation==='enumerate'?{transportVersion:2,devices:[device()]}:r.operation==='open'?{inputAvailable:true}:r.operation==='poll'?{events:++polled===1?[{reportId:4,data:'aa bb'}]:[]}:{});const [d]=await hid.getDevices();const eventPromise=new Promise(resolve=>d.addEventListener('inputreport',resolve,{once:true}));await d.open();const event=await eventPromise;assert.equal(event.reportId,4);assert.deepEqual([...new Uint8Array(event.data.buffer)],[170,187]);await d.close();const n=calls.length;await new Promise(resolve=>setTimeout(resolve,45));assert.equal(calls.length,n);
});
test('reset invalidates the enumeration cache',async()=>{
 const {hid,calls}=setup(async r=>r.operation==='enumerate'?{transportVersion:2,devices:[device()]}:{});await hid.getDevices();await hid.reset();await hid.getDevices();assert.deepEqual(calls.map(c=>c.operation),['enumerate','closeAll','enumerate']);
});
test('unsupported host fails with an actionable error',async()=>{
 const {hid}=setup(async()=>({transportVersion:1,devices:[]}));await assert.rejects(()=>hid.getDevices(),/HID v2/);globalThis.chrome=undefined;const unavailable=createTransport(config);await assert.rejects(()=>unavailable.getDevices(),/H hub/);
});
