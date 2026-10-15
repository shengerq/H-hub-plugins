import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {root,upstream,options} from './build-options.mjs';
const folders=['drivers/razer','drivers/vaxee','drivers/steelseries','drivers/hyperx','drivers/rapoo','drivers/glorious','drivers/gwolves','drivers/keychron','drivers/ninjutso'];
const tests=folders.flatMap(folder=>fs.readdirSync(path.join(upstream,'src',folder)).filter(s=>s.endsWith('.test.ts')).map(s=>path.join(upstream,'src',folder,s)));
const dest=path.join(root,'reports/protocol-tests');fs.mkdirSync(dest,{recursive:true});
const outputs=[];
for(const file of tests){
 const rel=path.relative(path.join(upstream,'src'),file).replaceAll('\\','/');
 const out=path.join(dest,rel+'.mjs');fs.mkdirSync(path.dirname(out),{recursive:true});
 await build({...options,entryPoints:[file],platform:'node',format:'esm',outfile:out,define:{'import.meta.url':JSON.stringify(pathToFileURL(file).href)},logLevel:'error'});outputs.push(out);
}
const shim=path.join(dest,'timers.mjs');
fs.writeFileSync(shim,`const file=(process.argv[1]||'').replaceAll('\\\\','/');if(!file.endsWith('gwolves/magnetic.test.ts.mjs')){const timer=setTimeout;globalThis.setTimeout=(fn,delay=0,...args)=>timer(fn,Math.min(delay,1),...args);}`);
const log=fs.openSync(path.join(root,'reports/protocol-tests.tap'),'w');
console.log('Running '+outputs.length+' upstream test files against the bundled protocol sources.');
const child=spawn(process.execPath,['--import',pathToFileURL(shim).href,'--test','--test-concurrency=4',...outputs],{stdio:['ignore',log,log]});
child.on('exit',code=>{fs.closeSync(log);const text=fs.readFileSync(path.join(root,'reports/protocol-tests.tap'),'utf8');console.log(text.split('\n').slice(-12).join('\n'));process.exitCode=code;});
