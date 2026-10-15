const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../research');
const vendor='https://gearlink.asus.com.cn/view/7038/';
const rows=[
 ['device-manifest.json',vendor+'manifest.json'],
 ['vendor-main.js',vendor+'main-1.00.28-7038-1784769136-06d08f.js'],
 ['vendor-preload.js',vendor+'preload-1.00.28-7038-1784769136-06d08f.js'],
 ['firmware-manifests.json','https://gearlink.asus.com.cn/api/v1/firmware-update-tools/manifests?pids[]=7038&os=Windows'],
 ['companion-manifests.json','https://gearlink.asus.com.cn/api/v1/local-services/manifests?deviceTypes[]=02&os=Windows'],
 ['official-companion.zip','https://gearlink.asus.com.cn/local-services/02/windows/Gear%20Link_KB%20Companion_3.1.0.10.zip'],
 ['official-firmware.zip','https://gearlink.asus.com.cn/firmware-update-tools/7038/windows/ROG%20FALCHION%20ACE%20HFX%20Firmware%20Update%20Tool%20v1.0.0.1.zip'],
 ['official-manual.pdf','https://dlcdnets.asus.com/pub/ASUS/Accessory/Keyboard/ROG_Falchion_Ace_HFX/Q23762_M605_ROG_Falchion_ACE_HFX_QSG_WEB.pdf'],
 ['official-manual-v4.pdf','https://dlcdnets.asus.com/pub/ASUS/Accessory/Keyboard/ROG_Falchion_Ace_HFX/Q25792_M605_ROG_FALCHION_ACE_HFX_QSG_V4_WEB.pdf'],
 ['PluginHidV2.h','https://raw.githubusercontent.com/shengerq/H-hub/ce323511db21e69b567936cab87dbcb62c8b30e9/source/PluginHidV2.h'],
 ['PluginPage.inc','https://raw.githubusercontent.com/shengerq/H-hub/ce323511db21e69b567936cab87dbcb62c8b30e9/source/PluginPage.inc'],
 ['PluginContract.cs','https://api.github.com/repos/shengerq/H-hub/contents/source/PluginContract.cs'],
 ['gearlink.html','https://gearlink.asus.com.cn/zh-cn'],
 ['support.html','https://rog.asus.com.cn/keyboards/keyboards/compact/rog-falchion-ace-hfx/helpdesk_download/'],
 ['devices.js','https://gearlink.asus.com.cn/assets/devices-DTVeArx5.js'],
 ['apiUrls.js','https://gearlink.asus.com.cn/assets/apiUrls-nhlQLgmN.js']
];
for(const file of fs.readdirSync(root).filter(n=>n.startsWith('chunk-')&&n.endsWith('.js')))rows.push([file,vendor+file]);
const files=rows.filter(([name])=>fs.existsSync(path.join(root,name))).map(([name,url])=>{const bytes=fs.readFileSync(path.join(root,name));return{file:name,url,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};});
fs.writeFileSync(path.join(root,'SOURCES.json'),JSON.stringify({retrievedOn:'2026-10-15',timezone:'Asia/Shanghai',officialWebVersion:'1.00.28',officialCompanionVersion:'3.1.0.10',officialFirmwareToolVersion:'1.0.0.1',officialFirmwareVersion:'1.00.59',hardwarePresent:false,notes:'Official installers and firmware were downloaded for inspection only, never installed or executed. Source snapshots are excluded from the distributable plugin.',files},null,2)+'\n');
console.log(`Recorded ${files.length} source files`);
