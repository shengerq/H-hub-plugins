const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),source=path.join(root,'sources/ace-hfx');
function run(args){const r=spawnSync(process.execPath,args,{cwd:source,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
run(['tools/build.cjs']);
run(['--test',...fs.readdirSync(path.join(source,'tests')).filter(n=>n.endsWith('.test.cjs')).map(n=>'tests/'+n)]);
const entry=JSON.parse(fs.readFileSync(path.join(root,'index.json'),'utf8')).plugins.find(p=>p.id==='hhub.rog-falchion-ace-hfx');
if(!entry)throw new Error('Missing ACE HFX catalog entry');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if(hash(path.join(root,entry.packageUrl))!==entry.sha256||hash(path.join(source,'dist',entry.packageUrl))!==entry.sha256)throw new Error('ACE HFX source build does not reproduce the catalog package');
if(entry.validation.hardwareVerified||entry.compatibility.firmwareVersions.length)throw new Error('No ACE HFX hardware verification evidence is present');
console.log('PASS: ACE HFX source reproduces the published package; hardware remains unverified.');
