import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {root,upstream,options} from './build-options.mjs';
const modules=[];
for(const folder of fs.readdirSync(path.join(upstream,'src'),{withFileTypes:true}).filter(d=>d.isDirectory())){
 for(const file of ['index.ts','devices.ts','products.ts']){const source=path.join(upstream,'src',folder.name,file);if(fs.existsSync(source))modules.push({brand:folder.name,file:source});}
}
modules.push({brand:'vendors',file:path.join(upstream,'src/drivers/vendors.ts')});
const dest=path.join(root,'reports/catalog-modules.mjs');
await build({...options,stdin:{contents:modules.map((m,i)=>`export * as catalog${i} from ${JSON.stringify(m.file)};`).join('\n'),loader:'ts',resolveDir:upstream},format:'esm',platform:'node',outfile:dest,logLevel:'error'});
const lib=await import(pathToFileURL(dest).href);
const records=[];
for(let i=0;i<modules.length;i++){
 const module=lib['catalog'+i];const seen=new Set();
 const walk=(value,key,depth=0)=>{
  if(depth>5||!value||typeof value!=='object'||seen.has(value))return;seen.add(value);
  const name=value.model||value.name;const pid=value.productId??value.pid??(typeof key==='number'?key:undefined);
  if(typeof name==='string'&&Number.isInteger(pid))records.push({namespace:modules[i].brand,productId:pid,vendorId:value.vendorId,name,verified:value.verified});
  if(value instanceof Map){for(const [k,v]of value)walk(v,k,depth+1);}
  else if(Array.isArray(value)){for(const v of value)walk(v,undefined,depth+1);}
  else for(const [k,v]of Object.entries(value)){if(typeof v==='string'&&/^\d+$/.test(k)&&Number(k)<=65535)records.push({namespace:modules[i].brand,productId:Number(k),name:v});else walk(v,/^\d+$/.test(k)?Number(k):k,depth+1);}
 };
 walk(module,'module');
}
fs.writeFileSync(path.join(root,'reports/catalog-names.json'),JSON.stringify(records,null,2));
console.log('Extracted '+records.length+' catalog labels.');
