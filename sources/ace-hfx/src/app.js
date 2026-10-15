(function(){
  'use strict';
  const P=window.AceHfx,T=window.AceHfxTransport,$=id=>document.getElementById(id);
  const links={product:'https://rog.asus.com.cn/keyboards/keyboards/compact/rog-falchion-ace-hfx/',support:'https://rog.asus.com.cn/keyboards/keyboards/compact/rog-falchion-ace-hfx/helpdesk_download/',gearlink:'https://gearlink.asus.com.cn/zh-cn',faq:'https://rog.asus.com.cn/support/faq/1054795/'};
  const labels={Escape:'Esc',Backspace:'Backspace',Tab:'Tab',CapsLock:'Caps',Enter:'Enter',ShiftLeft:'Shift',ShiftRight:'Shift',ControlLeft:'Ctrl',ControlRight:'Ctrl',MetaLeft:'Win',AltLeft:'Alt',AltRight:'Alt',FN:'Fn',Space:'Space',Delete:'Del',PageUp:'PgUp',PageDown:'PgDn',End:'End',ArrowLeft:'←',ArrowUp:'↑',ArrowDown:'↓',ArrowRight:'→',Minus:'−',Equal:'=',BracketLeft:'[',BracketRight:']',Backslash:'\\',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Backquote:'`',Disabled:'禁用',AV_PlayPause:'播放 / 暂停',AV_Mute:'静音',AV_VolUp:'增大音量',AV_VolDown:'减小音量'};
  const label=key=>labels[key]||key.replace(/^Key|^Digit/,'');
  let bridge=window.chrome?.webview?.postMessage?new T.HostBridge(window.chrome.webview):null;
  let driver=null,transport=null,connected=false,busy=false,selected='KeyW',overview=null,keyInfo=null,candidates=[];
  let selectionGeneration=0;
  if(bridge)$('transport-label').textContent='H-hub HID V2 插件';
  function message(id,text,kind=''){const node=$(id);node.textContent=text;node.className='status'+(kind?' '+kind:'');}
  function controls(){document.querySelectorAll('[data-device]').forEach(node=>node.disabled=!connected||busy);$('connect').disabled=busy||connected;$('disconnect').disabled=busy||!connected;
    document.querySelectorAll('[data-key]').forEach(node=>node.disabled=busy||node.dataset.key==='FN');
    $('choose-device').disabled=busy;
    $('connection-badge').textContent=connected?'已连接':'未连接';
  }
  function markDisconnected(){connected=false;overview=null;keyInfo=null;selectionGeneration++;for(const id of ['firmware','polling-value','ap-value','profile-value'])$(id).textContent='—';$('rt-switch').checked=false;$('speed-switch').checked=false;$('key-summary').textContent='连接后读取单键参数';$('pairs').textContent='连接后读取现有配对';controls();}
  async function operation(statusId,action,success){
    if(busy)return;busy=true;controls();message(statusId,'正在读取 / 写入…');
    try{const result=await action();message(statusId,typeof success==='function'?success(result):success||'已回读确认','ok');}
    catch(error){message(statusId,error.message,'error');if(transport?.closed||transport?.failed){markDisconnected();message('global-status','连接已失效，请重新连接后读取设备参数','error');}}
    finally{busy=false;controls();}
  }
  function scopeKey(){return $('scope').value==='all'?undefined:selected;}
  function showMagnetic(){const info=$('scope').value==='all'?overview:keyInfo;if(!info)return;$('ap').value=info.actuation;$('ap-range').value=info.actuation;$('dz-top').value=info.deadZone.top;$('dz-bottom').value=info.deadZone.bottom;}
  function showKey(info){keyInfo=info;$('selected-key').textContent=label(selected);$('key-summary').textContent=`触发 ${info.actuation.toFixed(1)} mm · 映射为 ${label(info.binding)}`;
    const target=$('target-key');target.querySelectorAll('[data-unknown]').forEach(n=>n.remove());if(!Array.from(target.options).some(n=>n.value===info.binding)){const o=new Option(info.binding,info.binding);o.dataset.unknown='true';o.disabled=true;target.add(o);}target.value=info.binding;showMagnetic();
  }
  async function refreshKey(){const key=selected,generation=++selectionGeneration;const info=await driver.readKey(key);if(generation===selectionGeneration&&key===selected)showKey(info);}
  function showPairs(pairs){$('pairs').textContent=pairs.length?'现有配对：'+pairs.map(p=>p.map(n=>label(Object.keys(P.KEYS).find(k=>P.KEYS[k]===n)||String(n))).join(' + ')).join('，'):'当前没有 Speed Tap 配对';}
  async function refreshAll(){overview=await driver.overview();$('firmware').textContent=overview.info.firmware;$('polling-value').textContent=overview.polling+' Hz';$('ap-value').textContent=overview.actuation.toFixed(1)+' mm';$('profile-value').textContent=String(overview.info.profile);$('polling').value=String(overview.polling);$('rt-switch').checked=overview.rapid;$('speed-switch').checked=overview.speedTap;await refreshKey();showPairs(await driver.readSpeedPairs());}
  function buildKeyboard(){for(const row of P.PHYSICAL){const container=document.createElement('div');container.className='key-row';for(const key of row){const button=document.createElement('button');button.className='key'+(key==='Space'?' space':['ShiftLeft','Enter','Backspace'].includes(key)?' extrawide':['CapsLock','Tab','ShiftRight'].includes(key)?' wide':'')+(key==='FN'?' fn':'')+(key===selected?' selected':'');button.textContent=label(key);button.dataset.key=key;button.setAttribute('aria-label',key==='FN'?'Fn：此版本不编辑 Fn 层':`${label(key)}，选择按键`);button.setAttribute('aria-pressed',String(key===selected));button.addEventListener('click',()=>{
      if(busy||key==='FN')return;selected=key;keyInfo=null;$('selected-key').textContent=label(key);document.querySelectorAll('[data-key]').forEach(b=>{b.classList.toggle('selected',b.dataset.key===key);b.setAttribute('aria-pressed',String(b.dataset.key===key));});if(connected)operation('mag-status',refreshKey,'已读取此键的触发与死区');
    });container.append(button);} $('keyboard').append(container);}}
  function options(id,keys,value){for(const key of keys){const o=document.createElement('option');o.value=key;o.textContent=label(key);$(id).append(o);}$(id).value=value;}
  buildKeyboard();const physical=[...P.MAGNETIC];options('target-key',Object.keys(P.KEYS).filter(k=>k!=='FN'),'KeyW');options('pair-a',physical,'KeyA');options('pair-b',physical,'KeyD');controls();
  async function connectDevice(device){
    if(transport)await transport.close().catch(()=>{});
    markDisconnected();
    transport=bridge?new T.NativeTransport(bridge,device):new T.BrowserTransport(navigator.hid,device);
    transport.onLost=()=>{markDisconnected();message('global-status','键盘已断开，请重新连接','error');};
    await transport.open();driver=new P.Driver(transport);
    try{await refreshAll();connected=true;$('device-picker').classList.add('hidden');}
    catch(error){await transport.close().catch(()=>{});markDisconnected();throw error;}
  }
  $('connect').addEventListener('click',()=>operation('global-status',async()=>{
    candidates=bridge?await T.NativeTransport.discover(bridge):await T.BrowserTransport.discover(navigator.hid);
    if(!candidates.length)throw new Error('没有找到 ACE HFX 控制接口，请检查 USB 连接和型号');
    if(candidates.length===1){await connectDevice(candidates[0]);return '已连接，参数来自设备回读';}
    const picker=$('devices');picker.replaceChildren();candidates.forEach((d,i)=>picker.add(new Option(`${d.productName||'ACE HFX'} · ${d.containerId||i+1}`,String(i))));$('device-picker').classList.remove('hidden');return '检测到多个键盘，请选择要配置的设备';
  },value=>value));
  $('choose-device').addEventListener('click',()=>operation('global-status',()=>connectDevice(candidates[Number($('devices').value)]),'已连接，参数来自设备回读'));
  $('disconnect').addEventListener('click',()=>operation('global-status',async()=>{await transport?.close();markDisconnected();},'已断开连接'));
  $('refresh').addEventListener('click',()=>operation('global-status',refreshAll,'已重新读取设备参数'));
  $('scope').addEventListener('change',showMagnetic);
  for(const [slider,number] of [['ap-range','ap'],['rt-range','rt-sensitivity']]){ $(slider).addEventListener('input',()=>$(number).value=$(slider).value);$(number).addEventListener('input',()=>$(slider).value=$(number).value); }
  $('apply-ap').addEventListener('click',()=>operation('mag-status',async()=>{const key=scopeKey();const value=await driver.setActuation(Number($('ap').value),key);if(key==null){overview.actuation=value;$('ap-value').textContent=value.toFixed(1)+' mm';}await refreshKey();},'触发行程已回读确认'));
  $('apply-dz').addEventListener('click',()=>operation('mag-status',async()=>{const key=scopeKey();const value=await driver.setDeadZone(Number($('dz-top').value),Number($('dz-bottom').value),key);if(key==null)overview.deadZone=value;await refreshKey();},'死区已回读确认'));
  $('rt-switch').addEventListener('change',()=>{const before=overview?.rapid;operation('rt-status',async()=>{try{const value=await driver.setRapidState($('rt-switch').checked);overview.rapid=value;$('rt-switch').checked=value;}catch(e){$('rt-switch').checked=!!before;throw e;}},'RT 开关已回读确认；若键盘物理开关覆盖设置，请检查拨杆位置');});
  const rtOptions=()=>({enabled:$('rt-key-enabled').checked,sensitivity:Number($('rt-sensitivity').value),continuous:$('rt-continuous').checked});
  const applyRapid=keys=>operation('rt-status',()=>driver.setRapidKeys(keys,rtOptions()),n=>`${n} 个按键的 RT 开关与灵敏度已回读确认；连续模式需真机确认`);
  $('apply-rt').addEventListener('click',()=>applyRapid([selected]));$('apply-wasd').addEventListener('click',()=>applyRapid(['KeyW','KeyA','KeyS','KeyD']));
  function bind(target){operation('binding-status',async()=>{await driver.setBinding(selected,target);await refreshKey();},'按键映射已回读确认');}
  $('apply-binding').addEventListener('click',()=>bind($('target-key').value));$('restore-binding').addEventListener('click',()=>bind(selected));
  $('speed-switch').addEventListener('change',()=>{const before=overview?.speedTap;operation('speed-status',async()=>{try{const value=await driver.setSpeedState($('speed-switch').checked);overview.speedTap=value;$('speed-switch').checked=value;}catch(e){$('speed-switch').checked=!!before;throw e;}},'Speed Tap 开关已回读确认');});
  const pair=enabled=>operation('speed-status',async()=>showPairs(await driver.setSpeedPair($('pair-a').value,$('pair-b').value,enabled)),'配对已回读确认');$('add-pair').addEventListener('click',()=>pair(true));$('remove-pair').addEventListener('click',()=>pair(false));
  $('brightness').addEventListener('input',()=>$('brightness-label').textContent=$('brightness').value+'%');
  function showLight(value){$('brightness').value=value.brightness;$('brightness-label').textContent=value.brightness+'%';$('color').value=value.color;}
  $('read-light').addEventListener('click',()=>operation('light-status',async()=>showLight(await driver.readLight(Number($('light-type').value))),'已读取所选灯效配置'));
  $('apply-light').addEventListener('click',()=>operation('light-status',async()=>showLight(await driver.setLight({type:Number($('light-type').value),brightness:Number($('brightness').value),color:$('color').value,speed:Number($('light-speed').value)})),'灯效配置已回读确认；实际灯效需观察键盘'));
  $('apply-polling').addEventListener('click',()=>operation('polling-status',async()=>{const hz=await driver.setPolling(Number($('polling').value));overview.polling=hz;$('polling-value').textContent=hz+' Hz';},'回报率已回读确认'));
  $('save-device').addEventListener('click',()=>operation('save-status',()=>driver.save(),'键盘已确认保存命令；请重新插拔，检查参数是否保留'));
  document.querySelectorAll('[data-link]').forEach(button=>button.addEventListener('click',async()=>{const url=links[button.dataset.link];try{if(bridge)await bridge.request({openLink:url});else window.open(url,'_blank','noopener,noreferrer');}catch(e){message('global-status',e.message,'error');}}));
  $('export-log').addEventListener('click',()=>{
    const report={plugin:'hhub.rog-falchion-ace-hfx',version:'0.1.0',createdAt:new Date().toISOString(),hardwareVerified:false,connected,device:{vendorId:P.ID.vendorId,productId:P.ID.productId},overview,trace:transport?.trace||[]};
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ace-hfx-diagnostics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  window.addEventListener('beforeunload',()=>{transport?.close().catch(()=>{});});
  window.addEventListener('hhub-theme-change',event=>{const colors=event.detail.colors||{};for(const [native,host] of [['accent','accent'],['bg','bg'],['card','card'],['line','border'],['muted','muted'],['text','text'],['control','control']])if(colors[host])document.documentElement.style.setProperty('--'+native,colors[host]);});
})();
