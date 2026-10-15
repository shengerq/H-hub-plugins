(function(root){
  'use strict';
  const P=root.AceHfx || (typeof require==='function'?require('./protocol.js'):null);
  const hex=bytes=>Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join(' ');
  function unhex(text){if(typeof text!=='string'||!/^(?:[\da-f]{2}(?:\s+|$))*$/i.test(text))throw new Error('宿主返回了无效的 HID 数据');return Uint8Array.from(text.trim()?text.trim().split(/\s+/).map(s=>parseInt(s,16)):[]);}
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  class HostBridge {
    constructor(webview){
      if(!webview?.postMessage)throw new Error('H-hub 通信桥不可用');
      this.webview=webview;this.pending=new Map();this.serial=0;
      this.listener=event=>{const m=event.data;if(m?.type!=='hhub.hid.result')return;const job=this.pending.get(m.token);if(!job)return;clearTimeout(job.timer);this.pending.delete(m.token);m.error?job.reject(new Error(m.error)):job.resolve(m.result);};
      webview.addEventListener('message',this.listener);
    }
    request(request){return new Promise((resolve,reject)=>{
      const token=`ace-${Date.now()}-${++this.serial}`;
      const timer=setTimeout(()=>{this.pending.delete(token);reject(new Error('H-hub 通信超时，请重新连接'));},5000);
      this.pending.set(token,{resolve,reject,timer});
      try{this.webview.postMessage({type:'hhub.hid',token,body:{request:{transportVersion:2,...request}}});}
      catch(error){clearTimeout(timer);this.pending.delete(token);reject(error);}
    });}
    dispose(){this.webview.removeEventListener('message',this.listener);for(const job of this.pending.values()){clearTimeout(job.timer);job.reject(new Error('页面已关闭'));}this.pending.clear();}
  }
  function matchesIdentity(device){return device.vendorId===P.ID.vendorId&&device.productId===P.ID.productId;}
  function nativeCandidates(list){return list.filter(d=>matchesIdentity(d)&&d.usagePage===P.ID.usagePage&&d.usage===1&&d.outputIds?.includes(0)&&d.inputIds?.includes(0)&&d.outputLength>=65&&d.inputLength>=65);}
  function browserCollection(device){if(!matchesIdentity(device))return;return device.collections?.find(c=>c.usagePage===P.ID.usagePage&&c.usage===1&&c.outputReports?.some(r=>r.reportId===0)&&c.inputReports?.some(r=>r.reportId===0));}
  class NativeTransport {
    constructor(bridge,device){this.bridge=bridge;this.device=device;this.closed=true;this.busy=false;this.trace=[];}
    static async discover(bridge){const result=await bridge.request({operation:'enumerate'});if(result?.transportVersion!==2)throw new Error('此插件需要支持 HID V2 的 H-hub；也可以使用独立网页版');return nativeCandidates(result.devices||[]);}
    request(operation,extra={}){return this.bridge.request({operation,key:this.device.key,...extra});}
    async open(){const r=await this.request('open');if(!r.inputAvailable){await this.request('close');throw new Error('设备输入通道不可用，请关闭奥创或 Gear Link 后重新连接');}this.closed=false;}
    async close(){this.closed=true;await this.request('close');}
    log(direction,data){this.trace.push({at:new Date().toISOString(),direction,data:hex(data)});if(this.trace.length>150)this.trace.shift();}
    async exchange(packet){
      P.validateFrame(packet);if(this.closed)throw new Error('请先连接键盘');if(this.busy)throw new Error('HID 命令必须串行执行');this.busy=true;
      try{
        // Flush pending reports before sending. A timed-out session is never reused.
        await this.request('poll');
        await this.request('sendOutput',{reportId:0,data:hex(packet)});this.log('OUT',packet);
        const deadline=Date.now()+1800;
        while(!this.closed&&Date.now()<deadline){
          const result=await this.request('poll');
          for(const event of result.events||[]){if(event.reportId!==0)continue;const bytes=unhex(event.data);this.log('IN',bytes);
            if(bytes[0]===0xff&&bytes[1]===0xaa)throw new Error('键盘拒绝命令，请重新连接');
            if(bytes[0]===packet[0]&&bytes[1]===packet[1])return bytes;
          }
          await sleep(18);
        }
        throw new Error('键盘没有回复，写入结果未确认；请重新连接后回读');
      }catch(error){this.closed=true;await this.request('close').catch(()=>{});throw error;}finally{this.busy=false;}
    }
  }
  class BrowserTransport {
    constructor(hid,device){this.hid=hid;this.device=device;this.closed=true;this.waiter=null;this.trace=[];this.failed=false;this.onLost=null;
      this.input=event=>{if(event.reportId!==0)return;const bytes=new Uint8Array(event.data.buffer,event.data.byteOffset,event.data.byteLength).slice();this.log('IN',bytes);const w=this.waiter;if(!w)return;
        if(bytes[0]===0xff&&bytes[1]===0xaa){this.finish(new Error('键盘拒绝命令，请重新连接'));return;}
        if(bytes[0]===w.packet[0]&&bytes[1]===w.packet[1])this.finish(null,bytes);
      };
      this.disconnect=event=>{if(event.device===this.device){this.closed=true;this.finish(new Error('键盘已断开'));this.onLost?.();}};
    }
    static async discover(hid){if(!hid?.requestDevice)throw new Error('请使用桌面 Chrome / Edge，或在 H-hub 中导入插件');const devices=await hid.requestDevice({filters:[{vendorId:P.ID.vendorId,productId:P.ID.productId,usagePage:P.ID.usagePage,usage:1}]});return devices.filter(browserCollection);}
    async open(){if(!browserCollection(this.device))throw new Error('设备型号或控制接口不匹配');if(!this.device.opened)await this.device.open();this.closed=false;this.failed=false;this.device.addEventListener('inputreport',this.input);this.hid.addEventListener('disconnect',this.disconnect);}
    async close(){this.closed=true;this.finish(new Error('连接已关闭'));this.device.removeEventListener('inputreport',this.input);this.hid.removeEventListener('disconnect',this.disconnect);if(this.device.opened)await this.device.close();}
    log(direction,data){this.trace.push({at:new Date().toISOString(),direction,data:hex(data)});if(this.trace.length>150)this.trace.shift();}
    finish(error,data){const w=this.waiter;if(!w)return;this.waiter=null;clearTimeout(w.timer);if(error){this.failed=true;this.close().catch(()=>{});w.reject(error);}else w.resolve(data);}
    async exchange(packet){
      P.validateFrame(packet);if(this.closed||this.failed)throw new Error('请重新连接键盘');if(this.waiter)throw new Error('HID 命令必须串行执行');
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>this.finish(new Error('键盘没有回复，写入结果未确认；请重新连接后回读')),1800);
        this.waiter={packet,timer,resolve,reject};this.log('OUT',packet);
        Promise.resolve().then(()=>this.device.sendReport(0,packet)).catch(error=>this.finish(error));
      });
    }
  }
  const api={HostBridge,NativeTransport,BrowserTransport,nativeCandidates,browserCollection,hex,unhex};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.AceHfxTransport=api;
})(globalThis);
