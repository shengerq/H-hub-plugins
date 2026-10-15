// H hub native HID v2 adapter. No hardware communication starts until Connect is pressed.
export function createTransport(config) {
  let sequence=0, queue=Promise.resolve(), cached=null;
  const pending=new Map();
  const bridge=globalThis.chrome?.webview;
  function transact(request) {
    if(!bridge) return Promise.reject(Error('请在支持 HID v2 的 H hub 中打开此插件。'));
    const run=()=>new Promise((resolve,reject)=>{
      const token='om-'+(++sequence);
      const timer=setTimeout(()=>{pending.delete(token);reject(Error('H hub HID 通信超时'));},15000);
      pending.set(token,{resolve,reject,timer});
      bridge.postMessage({type:'hhub.hid',token,body:{request:{...request,transportVersion:2}}});
    });
    const result=queue.then(run,run); queue=result.catch(()=>{}); return result;
  }
  bridge?.addEventListener('message',({data:m})=>{
    if(m?.type!=='hhub.hid.result')return;
    const item=pending.get(m.token);if(!item)return;
    pending.delete(m.token);clearTimeout(item.timer);
    if(m.error)item.reject(Error(m.error));else item.resolve(m.result);
  });
  const bytes=data=>new Uint8Array(data.buffer??data,data.byteOffset??0,data.byteLength);
  const hex=data=>Array.from(bytes(data),n=>n.toString(16).padStart(2,'0')).join(' ');
  const unhex=s=>new Uint8Array((s?.trim()?s.trim().split(/\s+/):[]).map(v=>parseInt(v,16)));
  class NativeDevice extends EventTarget {
    constructor(info){super();Object.assign(this,info);this.opened=false;this.timer=null;this.listeners=new Set();
      this.collections=info.collections.map(c=>({...c,...Object.fromEntries(['input','output','feature'].map(kind=>[kind+'Reports',(c[kind+'Reports']||[]).map(r=>({...r,items:[{reportSize:8,reportCount:Math.max(0,info[kind+'Length']-1)}]}))]))}));
    }
    async open(){if(this.opened)return;const result=await transact({operation:'open',key:this.key});this.inputAvailable=result.inputAvailable;this.opened=true;this.startPoll();}
    async close(){this.opened=false;clearTimeout(this.timer);this.timer=null;await transact({operation:'close',key:this.key});}
    async sendReport(reportId,data){await transact({operation:'sendOutput',key:this.key,reportId,data:hex(data)});}
    async sendFeatureReport(reportId,data){await transact({operation:'sendFeature',key:this.key,reportId,data:hex(data)});}
    async receiveFeatureReport(reportId){const r=await transact({operation:'receiveFeature',key:this.key,reportId});let b=unhex(r.data);
      // H hub returns the Windows report-ID byte even for unnumbered reports.
      // Chromium removes the synthetic zero. VAXEE's codec consumes payload only.
      if((reportId===0||config.stripNumberedFeatureId)&&b[0]===reportId)b=b.slice(1);
      return new DataView(b.buffer,b.byteOffset,b.byteLength);
    }
    addEventListener(type,listener,options){super.addEventListener(type,listener,options);if(type==='inputreport'){this.listeners.add(listener);this.startPoll();}}
    removeEventListener(type,listener,options){super.removeEventListener(type,listener,options);if(type==='inputreport')this.listeners.delete(listener);}
    startPoll(){if(this.timer!==null||!this.opened||!this.inputAvailable||!this.listeners.size)return;
      this.timer=setTimeout(async()=>{try{
        if(!this.opened)return;
        const result=await transact({operation:'poll',key:this.key});
        for(const r of result.events||[]){const b=unhex(r.data);const event=new Event('inputreport');Object.assign(event,{device:this,reportId:r.reportId,data:new DataView(b.buffer)});this.dispatchEvent(event);}
      }catch(error){this.opened=false;hid.dispatchEvent(Object.assign(new Event('disconnect'),{device:this,error}));}
      finally{this.timer=null;this.startPoll();}},20);
    }
  }
  const hid=new EventTarget();
  hid.getDevices=async()=>{
    if(cached)return cached;
    const result=await transact({operation:'enumerate'});
    if(result.transportVersion!==2)throw Error('宿主未提供 HID v2，请更新 H hub。');
    cached=(result.devices||[]).filter(d=>d.vendorId===config.vendorId&&d.productId===config.productId).map(d=>new NativeDevice(d));return cached;
  };
  hid.requestDevice=async({filters=[]}={})=>(await hid.getDevices()).filter(d=>!filters.length||filters.some(f=>(f.vendorId===undefined||f.vendorId===d.vendorId)&&(f.productId===undefined||f.productId===d.productId)&&d.collections.some(c=>(f.usagePage===undefined||f.usagePage===c.usagePage)&&(f.usage===undefined||f.usage===c.usage))));
  hid.reset=async()=>{for(const device of cached||[]){device.opened=false;clearTimeout(device.timer);}cached=null;await transact({operation:'closeAll'});};
  Object.defineProperty(navigator,'hid',{value:hid,configurable:true});
  globalThis.addEventListener?.('pagehide',()=>{void hid.reset().catch(()=>{});});
  return hid;
}
