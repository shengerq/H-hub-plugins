import {createTransport} from './transport.js';
export function mount(driver) {
 const cfg=window.OPENMOUSE_PLUGIN, hid=createTransport(cfg);
 const $=id=>document.getElementById(id);
 let client=null, snapshot=null, busy=false, tab='dpi', interfaces=[];
 const texts={dpi:'DPI 设置',performance:'性能设置',advanced:'高级参数',info:'设备与来源'};
 const say=(message,error=false)=>{$('status').textContent=message;$('status').dataset.error=String(error);};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const val=v=>v===undefined||v===null?'未提供':String(v);
 const card=(title,body)=>`<article class="card"><h2>${title}</h2>${body}</article>`;
 function list(value){try{return Array.from(value||[]).filter(Number.isFinite);}catch{return [];}}
 function options(method,property){try{return typeof client?.[method]==='function'?list(client[method]()):list(client?.[property]);}catch{return [];}}
 function dpiOptions(){const direct=options('getDpiOptions','supportedDpiValues');if(direct.length)return direct;const hint=snapshot?.ui?.dpiStageEditor;if(snapshot?.ui?.family==='mchose'&&hint&&typeof client?.setDpiStageValue==='function'&&Number.isInteger(snapshot.activeDpiStage)){const count=(hint.maxDpi-hint.minDpi)/hint.stepDpi+1;if(Number.isInteger(count)&&count>0&&count<=100000)return Array.from({length:count},(_,i)=>hint.minDpi+i*hint.stepDpi);}return [];}
 function hasDpiWriter(){return typeof client?.setDpi==='function'||(snapshot?.ui?.family==='mchose'&&typeof client?.setDpiStageValue==='function'&&Number.isInteger(snapshot.activeDpiStage));}
 function canWrite(){return !!client&&snapshot?.ui?.settingsReady!==false;}
 function button(label,action){return `<button class="primary" data-action="${action}" ${!canWrite()||busy?'disabled':''}>${label}</button>`;}
 function field(name,content){return `<div class="split setting"><span class="hint">${name}</span><strong class="value">${esc(val(content))}</strong></div>`;}
 function numericOptions(values,current){return values.map(n=>`<option value="${n}" ${n===current?'selected':''}>${n}</option>`).join('');}
 function render(){
   $('title').textContent=snapshot?.name||cfg.name;$('connect').disabled=busy||!!client;$('disconnect').disabled=busy||!client;$('refresh').disabled=busy||!client;
   $('tabs').innerHTML=Object.entries(texts).map(([id,text])=>`<button data-tab="${id}" class="${id===tab?'active':''}" aria-selected="${id===tab}">${text}</button>`).join('');
   const s=snapshot||{};
   $('connection').textContent=client?`${s.connectionType||'HID'} · ${s.name||cfg.name}`:'尚未连接设备';
   $('page').dataset.tab=tab;
   const source=cfg.virtual?'虚拟设备状态 · 软件模拟，不代表实机验证':s.ui?.valuesVerified===false?'驱动缓存或默认值，不能作为硬件回读证据':'来自驱动状态；本插件未实机验证';
   let html='';
   if(tab==='dpi'){
     const values=dpiOptions();
     const allow=canWrite()&&hasDpiWriter()&&values.length;
     const control=values.length>64?`<input id="dpi" type="number" min="${values[0]}" max="${values.at(-1)}" step="1" value="${values.includes(s.dpi)?s.dpi:values[0]}" ${!allow?'disabled':''}><p>有效范围 ${values[0]}–${values.at(-1)} DPI，应用前核对驱动档位。</p>`:`<select id="dpi" ${!allow?'disabled':''}>${numericOptions(values,s.dpi)}</select>`;
     html=card('当前灵敏度',`<div class="large">${esc(snapshot?val(s.dpi):'—')}<small>DPI</small></div><p>${source}</p><div class="range-control"><label for="dpi">选择 DPI</label>${control}</div>${allow?button('应用 DPI','dpi'):'<p>连接后按驱动提供的有效档位开放；未提供档位列表时不开放通用写入。</p>'}`)+card('设备状态',`${field('设备型号',s.name||cfg.name)}${field('电量',Number.isFinite(s.batteryPercent)?s.batteryPercent+'%':'未提供')}${field('当前回报率',snapshot?val(s.pollingRateHz)+' Hz':'—')}${field('验证状态','未实机验证')}<p>调节作用于设备固件。实际效果、断电保存及不同连接方式仍需实机确认。</p>`);
   }else if(tab==='performance'){
     const rates=list(s.supportedPollingRates).length?list(s.supportedPollingRates):options('getSupportedPollingRates','supportedPollingRates');
     const allow=canWrite()&&typeof client?.setPollingRate==='function'&&rates.length&&!s.ui?.pollingReadOnly;
     html=card('回报率',`<div class="large">${esc(snapshot?val(s.pollingRateHz):'—')}<small>Hz</small></div><label for="polling">设备支持的回报率</label><select id="polling" ${!allow?'disabled':''}>${numericOptions(rates,s.pollingRateHz)}</select><p>${esc(s.ui?.pollingNote||'只显示驱动提供的选项。')}</p>${allow?button('应用回报率','polling'):'<p>此连接未提供可写的回报率选项。</p>'}`)+card('传感器处理',toggle('Motion Sync','motionSync','setMotionSync',s)+toggle('角度修正','angleSnapping','setAngleSnapping',s)+toggle('波纹修正','rippleControl','setRippleControl',s)+'<p>未返回状态或未提供写入接口的功能不会开放。</p>');
   }else if(tab==='advanced'){
     html=card('已读取的参数',field('静默高度 LOD',s.liftOffDistance)+field('按键防抖',s.debounceTimeMs)+field('休眠时间',s.sleepTimeoutSeconds)+field('传感器处理',s.ui?.statusNote||'以当前驱动返回值为准'))+card('适配范围','<p>本批通用页面接入 DPI、回报率及三个标准传感器开关。专用改键、宏、RGB、配对、固件更新及校准未接入通用页面。</p><p>此包包含真实协议实现与 H hub HID v2 适配；硬件读写、断线恢复、宿主导入验收均未进行实机验证。</p><p>共享接收器 VID/PID 不能证明其配对的具体型号。实际设备以连接后的协议读取为准。</p>');
   }else{
     html=card('设备与版本',field('插件版本',cfg.version)+field('硬件识别',cfg.hardwareId)+field('设备固件',s.firmware?.join?.(' / ')||'未读取')+field('实机验证','没有')+field('自动匹配固件','未知，未声明'))+card('开源来源',`<p>协议来自 OpenMouse / mouse-protocol，保留 AGPL-3.0-or-later 许可。</p><p class="mono">上游提交：${esc(cfg.commit)}</p><p>页面采用雷柏 VT3S MAX 插件的紧凑卡片、横向标签与浅蓝强调色；鼠标品牌图片未使用。</p><p>完整源码、许可证及构建脚本见随包储备目录。上游支持声明与本插件验收状态分开记录。</p>`);
   }
   $('page').innerHTML=`<div class="grid">${html}</div>`;
   $('page').querySelectorAll('[data-action]').forEach(e=>e.addEventListener('click',()=>perform(e.dataset.action)));
 }
 function toggle(label,key,method,s){const known=typeof s[key]==='boolean';const hidden=s.ui?.hideProcessingCard||s.ui?.['hide'+key[0].toUpperCase()+key.slice(1)];const allow=canWrite()&&known&&!hidden&&typeof client?.[method]==='function';return `<label class="switch">${label}<input type="checkbox" data-action="${key}" ${s[key]?'checked':''} ${!allow||busy?'disabled':''}></label>`;}
 async function task(fn){if(busy)return;busy=true;render();try{await fn();}catch(error){say(error.message||String(error),true);}finally{busy=false;render();}}
 async function read(){snapshot=await client.readStatus();render();}
 async function perform(action){
   // Capture values before rendering replaces the editing elements.
   const value=action==='dpi'?Number($('dpi')?.value):action==='polling'?Number($('polling')?.value):$('page').querySelector(`[data-action="${action}"]`)?.checked;
   await task(async()=>{if(!canWrite())throw Error('当前连接不允许配置。');
     const map={dpi:['setDpi','dpi'],polling:['setPollingRate','pollingRateHz'],motionSync:['setMotionSync','motionSync'],angleSnapping:['setAngleSnapping','angleSnapping'],rippleControl:['setRippleControl','rippleControl']};
     const [method,key]=map[action];if(action==='dpi'?!hasDpiWriter():typeof client[method]!=='function')throw Error('驱动未提供此功能。');
     if(action==='dpi'&&!dpiOptions().includes(value))throw Error('该 DPI 不在驱动提供的有效档位中。');
     say('正在发送配置…');if(action==='dpi'&&typeof client.setDpi!=='function')await client.setDpiStageValue(snapshot.activeDpiStage,value);else await client[method](value);await read();
     if(snapshot.ui?.valuesVerified===false)say('命令已发送；驱动不提供独立硬件回读，尚未验证效果。');
     else if(snapshot[key]!==value)throw Error('读取值与请求值不同，请检查设备状态。');
     else say(cfg.virtual?'虚拟设备回读一致 · 软件模拟':'驱动返回值与请求一致；本插件仍未实机验证。');
   });
 }
 $('tabs').addEventListener('click',event=>{const target=event.target.closest('[data-tab]');if(target){tab=target.dataset.tab;render();}});
 $('connect').addEventListener('click',()=>task(async()=>{
   await hid.reset();interfaces=(await hid.getDevices()).filter(d=>{try{return driver.supports(d);}catch{return false;}});
   if(!interfaces.length)throw Error('未找到此包支持的控制接口。请核对 VID/PID、连接方式及宿主 HID v2 支持。');
   const picker=$('interface');picker.replaceChildren(...interfaces.map((d,i)=>new Option(`接口 ${i+1} · ${d.usagePage.toString(16).toUpperCase()}:${d.usage.toString(16).toUpperCase()}`,i)));
   picker.hidden=interfaces.length<2;
   client=driver.create(interfaces[0]);try{say('正在读取设备…');await client.open?.();await read();say('已连接 · 未实机验证');}catch(error){try{await client?.close?.();}catch{}client=null;snapshot=null;throw error;}
 }));
 $('interface').addEventListener('change',()=>task(async()=>{await client?.close?.();client=driver.create(interfaces[Number($('interface').value)]);snapshot=null;try{await client.open?.();await read();say('已切换接口');}catch(error){await client?.close?.().catch(()=>{});client=null;throw error;}}));
 $('disconnect').addEventListener('click',()=>task(async()=>{try{await client?.close?.();}finally{client=null;snapshot=null;await hid.reset();say('已断开');}}));
 $('refresh').addEventListener('click',()=>task(async()=>{await read();say('读取完成 · 未实机验证');}));
 hid.addEventListener('disconnect',event=>{client=null;snapshot=null;say(event.error?.message||'设备连接已断开',true);render();});
 window.hhubOpenMouse={render,get snapshot(){return snapshot;},get client(){return client;}};
 render();say('就绪 · 未实机验证');
}
