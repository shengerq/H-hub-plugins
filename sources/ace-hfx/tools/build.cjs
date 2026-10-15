const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..'),src=path.join(root,'src'),out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
let html=fs.readFileSync(path.join(src,'index.html'),'utf8');
for(const [marker,file] of [['STYLES','style.css'],['PROTOCOL','protocol.js'],['TRANSPORT','transport.js'],['APP','app.js']]){
  const content=fs.readFileSync(path.join(src,file),'utf8');
  if(file.endsWith('.js'))new vm.Script(content,{filename:file});
  html=html.replace(`/*__${marker}__*/`,()=>content.replace(/<\/script/gi,'<\\/script'));
}
if(/\/\*__[A-Z]+__\*\//.test(html))throw new Error('构建占位符未替换');
manifest.ui.content=html;
const filename=`Hhub-ROG-Falchion-ACE-HFX-${manifest.version}.hhub`;
const data=JSON.stringify(manifest,null,2)+'\n';
fs.writeFileSync(path.join(out,filename),data);
fs.writeFileSync(path.join(out,'index.html'),html);
const sha=crypto.createHash('sha256').update(data).digest('hex');
const compatibility=manifest.compatibility;
const pack=items=>items.map(x=>`${Buffer.byteLength(x)}:${x}`).join('');
const canonical=pack(['hhub-contract/1','device',compatibility.deviceName,compatibility.hardwareId,'false',...compatibility.firmwareVersions.slice().sort()]);
const identity='HHUB1-'+crypto.createHash('sha256').update(pack([manifest.id,manifest.author,manifest.version,sha,canonical])).digest('hex');
const entry={id:manifest.id,name:manifest.name,author:manifest.author,version:manifest.version,kind:manifest.kind,group:'peripheral',category:'keyboard',description:manifest.description,packageUrl:filename,sha256:sha,compatibility,identityCode:identity,tags:['键盘','ROG','ACE HFX']};
fs.writeFileSync(path.join(out,'index.json'),JSON.stringify({schemaVersion:1,name:'ACE HFX 本地开发包',plugins:[entry],verificationRecords:[]},null,2)+'\n');
fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),`${sha}  ${filename}\n`);
console.log(`Built ${filename} (${Buffer.byteLength(data)} bytes)\nSHA256 ${sha}`);
