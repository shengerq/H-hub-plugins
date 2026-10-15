// Explicit software-only peripheral. No OS device is created and no native HID call is made.
import {MCHOSE_COMMAND, MCHOSE_SHORT_REPORT_ID, MCHOSE_LONG_REPORT_ID} from '@openmouse/protocol/mchose';
export function installVirtualDevice(kind) {
 const defaults=()=>({dpi:800,rateCode:2,connected:true,ignoreWrites:false,latency:15,battery:65,config:[0,0x30,0x20,0,0x40,6,0x20,3,0x40,6,0x80,12,0,25,0x10,0xa4,1,0x80,0,0,0,0,0,0,0x10,0,0,0,0x20,0,0,0,0x32,0,0x42,0,0x42,0,0x43,0,0x50,0,0,0]});
 let state=defaults();const storageKey='hhub-virtual-mouse-v1-'+kind;
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved)state={...state,...saved,connected:true,ignoreWrites:false};}catch{}
 let pending=null,pendingShort=MCHOSE_COMMAND.identity,pendingLong=MCHOSE_COMMAND.config,pendingLongTokens=[];
 const listeners=[],history=[];
 const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}};
 const toHex=b=>Array.from(b,v=>v.toString(16).padStart(2,'0')).join(' ');
 const fromHex=s=>s.trim().split(/\s+/).map(v=>parseInt(v,16));
 const event=()=>window.dispatchEvent(new CustomEvent('hhub-virtual-state',{detail:{kind,connected:state.connected,battery:state.battery,calls:history.length,ignoreWrites:state.ignoreWrites}}));
 function info(){const vaxee=kind==='vaxee';return {key:'virtual-'+kind,vendorId:vaxee?0x3057:0x3837,productId:vaxee?0x2002:0x100b,productName:vaxee?'虚拟 VAXEE 接收器':'虚拟 MCHOSE A7 V2 Ultra+',usagePage:vaxee?0xff05:0xff01,usage:1,inputLength:0,outputLength:0,featureLength:vaxee?64:66,collections:[{usagePage:vaxee?0xff05:0xff01,usage:1,children:[],inputReports:[],outputReports:[],featureReports:(vaxee?[14]:[MCHOSE_SHORT_REPORT_ID,MCHOSE_LONG_REPORT_ID]).map(reportId=>({reportId,items:[]}))}]};}
 function mchoseSend(r){const tokens=fromHex(r.data).map(v=>v^255),cmd=tokens[0];
  if(r.reportId===MCHOSE_SHORT_REPORT_ID){
   if(!state.ignoreWrites&&cmd===MCHOSE_COMMAND.setPerformance){let sensor=(state.config[17]&~3)|(tokens[1]&3);for(const [offset,bit]of [[2,4],[3,8],[4,16]]){if(tokens[offset]===1)sensor|=bit;if(tokens[offset]===2)sensor&=~bit;}state.config[17]=sensor&255;}
   pendingShort=cmd;
  }else{if(!state.ignoreWrites&&cmd===MCHOSE_COMMAND.writeConfig)state.config=tokens.slice(1,45);pendingLong=cmd;pendingLongTokens=tokens;}
  save();return {};
 }
 function mchoseReceive(id){const command=id===MCHOSE_SHORT_REPORT_ID?pendingShort:pendingLong;
  const payload=id===MCHOSE_SHORT_REPORT_ID?(command===MCHOSE_COMMAND.identity?[1,0x37,0x38,0x0b,0x10,1,0]:command===MCHOSE_COMMAND.version?[8,0x56,0x49,0x52,0x54,0x55,0x41,0x4c,0x31]:command===MCHOSE_COMMAND.battery?[0x37,0x38,0x21,0x40,5,0x2e,2,4,9,0x29,0,0x2c]:[]):command===MCHOSE_COMMAND.config?state.config:command===MCHOSE_COMMAND.readProfileName?[pendingLongTokens[1],...new TextEncoder().encode('Virtual '+(pendingLongTokens[1]+1)),0]:[];
  const buf=new Uint8Array(66);buf[0]=id;buf[1]=command^255;payload.forEach((b,i)=>buf[i+2]=b^255);return {data:toHex(buf)};
 }
 function perform(r){
  if(r.operation==='enumerate')return {transportVersion:2,devices:state.connected?[info()]:[]};
  if(['closeAll','close'].includes(r.operation))return {transportVersion:2};
  if(!state.connected)throw Error('虚拟设备已拔出，请先重新插入。');
  if(r.operation==='open')return {transportVersion:2,inputAvailable:false};
  if(r.operation==='poll')return {events:[]};
  if(r.operation==='sendFeature'){
   if(kind==='mchose')return mchoseSend(r);
   pending=fromHex(r.data);if(pending[2]===2&&!state.ignoreWrites){if(pending[1]===4)state.dpi=pending[5]|pending[6]<<8;if(pending[1]===7)state.rateCode=pending[4];save();}return {};
  }
  if(r.operation==='receiveFeature'){
   if(kind==='mchose')return mchoseReceive(r.reportId);
   if(!pending)throw Error('虚拟设备尚未收到请求。');
   const cmd=pending[1],data=cmd===10?[0x11,0x10]:cmd===2?[1]:cmd===4?[1,state.dpi&255,state.dpi>>8]:cmd===7?[state.rateCode]:cmd===8?[1]:cmd===9?[1]:cmd===11?[Math.round(state.battery/5)]:cmd===16?[0]:cmd===1?[1,2]:[1];
   const buf=new Uint8Array(64);buf.set([14,0xa5,cmd,3,1,data.length,...data]);return {data:toHex(buf)};
  }
  throw Error('虚拟设备未实现该操作：'+r.operation);
 }
 window.hhubVirtualBridge={addEventListener(type,fn){if(type==='message')listeners.push(fn);},postMessage(message){
   const request=message.body.request;history.push({time:Date.now(),operation:request.operation,reportId:request.reportId,data:request.data});if(history.length>200)history.shift();
   setTimeout(()=>{let result,error;try{result=perform(request);}catch(e){error=e.message;}for(const fn of listeners)fn({data:{type:'hhub.hid.result',token:message.token,result,error}});event();},state.latency);
 }};
 window.hhubVirtualDevice={get state(){return {...state};},get history(){return history;},setIgnored(value){state.ignoreWrites=!!value;event();},setConnected(value){state.connected=!!value;if(!state.connected)navigator.hid?.dispatchEvent(Object.assign(new Event('disconnect'),{error:Error('虚拟设备已拔出')}));event();},reset(){state=defaults();save();event();}};
 event();return window.hhubVirtualDevice;
}
