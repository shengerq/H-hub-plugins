/* Original adapter. Protocol constants researched from ASUS Gear Link M605 1.00.28.
 * See docs/PROTOCOL.md for the model-specific legacy encoding and source offsets. */
(function (root) {
  'use strict';
  const ID = Object.freeze({ vendorId: 0x0b05, productId: 0x1b7e, usagePage: 0xff00, usage: 1, reportId: 0, payloadLength: 64 });
  // ASUS firmware matrix positions; these are NOT USB keyboard usage IDs.
  const KEYS = Object.freeze({
    Escape:110, Backquote:1, Digit1:2, Digit2:3, Digit3:4, Digit4:5, Digit5:6, Digit6:7, Digit7:8, Digit8:9, Digit9:10, Digit0:11,
    Minus:12, Equal:13, Backspace:15, Tab:16, KeyQ:17, KeyW:18, KeyE:19, KeyR:20, KeyT:21, KeyY:22, KeyU:23, KeyI:24, KeyO:25, KeyP:26,
    BracketLeft:27, BracketRight:28, Backslash:29, CapsLock:30, KeyA:31, KeyS:32, KeyD:33, KeyF:34, KeyG:35, KeyH:36, KeyJ:37, KeyK:38, KeyL:39,
    Semicolon:40, Quote:41, Enter:43, ShiftLeft:44, KeyZ:46, KeyX:47, KeyC:48, KeyV:49, KeyB:50, KeyN:51, KeyM:52, Comma:53, Period:54, Slash:55,
    ShiftRight:57, ControlLeft:58, MetaLeft:59, AltLeft:60, Space:61, AltRight:62, ControlRight:64, FN:159,
    Insert:75, Delete:76, Home:80, End:81, PageUp:85, PageDown:86, ArrowLeft:79, ArrowUp:83, ArrowDown:84, ArrowRight:89,
    F1:112, F2:113, F3:114, F4:115, F5:116, F6:117, F7:118, F8:119, F9:120, F10:121, F11:122, F12:123,
    AV_PlayPause:183, AV_Mute:184, AV_VolUp:187, AV_VolDown:188, Disabled:0
  });
  const PHYSICAL = Object.freeze([
    ['Escape','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Minus','Equal','Backspace','Delete'],
    ['Tab','KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP','BracketLeft','BracketRight','Backslash','PageUp'],
    ['CapsLock','KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Semicolon','Quote','Enter','PageDown'],
    ['ShiftLeft','KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','Comma','Period','Slash','ShiftRight','ArrowUp','End'],
    ['ControlLeft','MetaLeft','AltLeft','Space','AltRight','FN','ControlRight','ArrowLeft','ArrowDown','ArrowRight']
  ]);
  const MAGNETIC = new Set(PHYSICAL.flat().filter(k => k !== 'FN'));
  function integer(value, min, max, label) {
    if (!Number.isInteger(value) || value < min || value > max) throw new RangeError(`${label}超出范围 ${min}–${max}`);
    return value;
  }
  function boolean(value) { if (typeof value !== 'boolean') throw new TypeError('开关值必须是布尔值'); return value ? 1 : 0; }
  function unit(mm, min = 0.1, max = 4) {
    if (typeof mm !== 'number' || !Number.isFinite(mm) || mm < min || mm > max || Math.abs(mm * 10 - Math.round(mm * 10)) > 1e-7)
      throw new RangeError(`行程须为 ${min}–${max} mm，步进 0.1 mm`);
    return Math.round(mm * 10);
  }
  const le = n => [n & 255, n >>> 8 & 255];
  function keyCode(key, physical = false) {
    if (!Object.hasOwn(KEYS, key) || physical && !MAGNETIC.has(key)) throw new RangeError(`不支持的按键：${key}`);
    return KEYS[key];
  }
  const readPairs = new Set(['18:0','18:2','18:18','18:21','37:0','37:1','37:2','37:4','37:5','37:6','37:8','37:9','37:10','37:13','37:14']);
  const writePairs = new Set(['81:32','81:44','81:49','81:79','81:80','81:84','81:85','81:87','81:88','81:89','81:92','80:85']);
  function validateFrame(data) {
    if (!(data instanceof Uint8Array) || data.length !== 64 || !(readPairs.has(`${data[0]}:${data[1]}`) || writePairs.has(`${data[0]}:${data[1]}`)))
      throw new Error('报文不在 ACE HFX 已实现命令范围内');
    return data;
  }
  function frame(command, subcommand, index = 0, data = []) {
    integer(index, 0, 65535, '索引');
    if (data.length > 60 || data.some(n => !Number.isInteger(n) || n < 0 || n > 255)) throw new RangeError('报文数据无效');
    const bytes = new Uint8Array(64);
    bytes.set([command, subcommand, ...le(index), ...data]);
    return validateFrame(bytes);
  }
  const commands = Object.freeze({
    info: () => frame(0x12, 0), layout: () => frame(0x12, 0x12),
    polling: () => frame(0x12, 0x15),
    setPolling(hz) { const index = ({1000:0, 8000:3})[hz]; if (index === undefined) throw new RangeError('ACE HFX 此版仅提供官方页面中的 1000 / 8000 Hz'); return frame(0x51, 0x31, 0, [index]); },
    actuation: key => frame(0x25, key == null ? 5 : 4, 0, key == null ? [] : le(keyCode(key, true))),
    setActuation: (mm, key) => frame(0x51, key == null ? 0x50 : 0x4f, 0, [...key == null ? [] : le(keyCode(key, true)), ...le(unit(mm))]),
    deadZone: key => frame(0x25, key == null ? 10 : 9, 0, key == null ? [] : le(keyCode(key, true))),
    setDeadZone: (top, bottom, key) => frame(0x51, key == null ? 0x58 : 0x59, 0, [...key == null ? [] : le(keyCode(key, true)), unit(bottom, 0, 0.5), unit(top, 0, 0.5)]),
    rapidState: () => frame(0x25, 0), setRapidState: enabled => frame(0x51, 0x5c, 0, [boolean(enabled)]),
    rapidKey: key => frame(0x25, 6, 0, le(keyCode(key, true))),
    // M605 inherits tr -> xn: 8-bit sensitivity, then continuous and enabled.
    // Newer ROG keyboards use a different layout here. Never substitute that layout.
    setRapidKey(key, {enabled, sensitivity, continuous = false}) {
      return frame(0x51, 0x54, 0, [...le(keyCode(key, true)), unit(sensitivity, 0.1, 2.5), boolean(continuous), boolean(enabled)]);
    },
    speedState: () => frame(0x25, 1), setSpeedState: enabled => frame(0x51, 0x57, 0, [boolean(enabled)]),
    speedPairs: page => frame(0x25, 8, integer(page, 0, 1, 'Speed Tap 页')),
    setSpeedPair(a, b, enabled) { if (a === b) throw new RangeError('Speed Tap 需要两个不同按键'); return frame(0x51, 0x55, 0, [...le(keyCode(a, true)), ...le(keyCode(b, true)), boolean(enabled)]); },
    binding: key => frame(0x25, 0x0d, 0, le(keyCode(key, true))),
    setBinding: (source, target) => frame(0x51, 0x20, keyCode(source, true), le(keyCode(target))),
    light: type => frame(0x25, 0x0e, integer(type, 0, 2, '灯效')),
    rgbMode: () => frame(0x12, 2),
    setLight({type, brightness, color, speed = 1}) {
      integer(type, 0, 2, '灯效'); integer(brightness, 0, 100, '亮度'); integer(speed, 0, 2, '速度');
      if (!/^#[\da-f]{6}$/i.test(color)) throw new RangeError('颜色无效');
      const rgb = [1,3,5].map(at => parseInt(color.slice(at, at + 2), 16));
      const speeds = [[255,255,255], [42,30,15], [62,31,18]];
      return frame(0x51, 0x2c, type, [speeds[type][speed],brightness,0,255,255,...rgb,...rgb,0,0,0]);
    },
    save: () => frame(0x50, 0x55)
  });
  function response(bytes, request, minLength = 6) {
    if (!(bytes instanceof Uint8Array) || bytes.length < minLength) throw new Error('设备回复长度不足');
    if (bytes[0] === 0xff && bytes[1] === 0xaa) throw new Error('设备拒绝命令');
    if (bytes[0] !== request[0] || bytes[1] !== request[1]) throw new Error('设备回复与请求不匹配');
    return bytes;
  }
  const word = (b, at) => b[at] | b[at + 1] << 8;
  function fromUnit(raw, min, max) { const mm = raw / 10; unit(mm, min, max); return mm; }
  const parse = Object.freeze({
    info(b) { if (b.length < 11) throw new Error('设备信息不完整'); return {firmware:`${word(b,6).toString(16)}.${b[5].toString(16).padStart(2,'0')}.${b[4].toString(16).padStart(2,'0')}`, profileCount:b[8], profile:b[10]}; },
    actuation: b => fromUnit(word(b,4), 0.1, 4),
    deadZone: b => ({bottom:fromUnit(b[4],0,0.5), top:fromUnit(b[5],0,0.5)}),
    polling(b) { const hz = [1000,2000,4000,8000][b[4]]; if (!hz) throw new Error('未知回报率'); return hz; },
    state(b) { if (b[4] !== 0 && b[4] !== 1) throw new Error('无效开关回复'); return b[4] === 1; },
    rapid(b) { if (b.length < 10) throw new Error('RT 回复不完整'); const independent = word(b,2) === 1; return {enabled:b[9]===1, independent, sensitivity:fromUnit(word(b,4),0.1,2.5), release:independent?fromUnit(word(b,6),0.1,2.5):undefined}; },
    binding: b => Object.keys(KEYS).find(k => KEYS[k] === word(b,4)) || `未知键码 ${word(b,4)}`,
    pairs(b, page) { const result=[]; const count = page === 0 ? 3 : 2; if (b.length < 4 + count*4) throw new Error('Speed Tap 配对回复不完整'); for (let i=0;i<count;i++) { const a=word(b,4+i*4), c=word(b,6+i*4); if (![0,65535].includes(a) && ![0,65535].includes(c)) result.push([a,c]); } return result; },
    light(b, type) { if (b.length < 12) throw new Error('灯效回复不完整'); integer(b[5],0,100,'设备亮度'); return {type,brightness:b[5],rawSpeed:b[4],color:'#'+Array.from(b.slice(9,12),n=>n.toString(16).padStart(2,'0')).join('')}; }
  });
  function match(actual, expected, label) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}回读不一致，设备当前值：${JSON.stringify(actual)}`); }
  class Driver {
    constructor(transport) { this.transport=transport; this.queue=Promise.resolve(); }
    run(fn) { const result=this.queue.then(fn); this.queue=result.catch(()=>{}); return result; }
    async ask(request, minimum=6) { return response(await this.transport.exchange(validateFrame(request)),request,minimum); }
    async identify() { const request=commands.info(); return parse.info(await this.ask(request,11)); }
    async overview() {
      return this.run(async()=>({info:await this.identify(), polling:parse.polling(await this.ask(commands.polling())), actuation:parse.actuation(await this.ask(commands.actuation())),
        deadZone:parse.deadZone(await this.ask(commands.deadZone())), rapid:parse.state(await this.ask(commands.rapidState())), speedTap:parse.state(await this.ask(commands.speedState()))}));
    }
    async readKey(key) { keyCode(key,true); return this.run(async()=>({key,actuation:parse.actuation(await this.ask(commands.actuation(key))),deadZone:parse.deadZone(await this.ask(commands.deadZone(key))),binding:parse.binding(await this.ask(commands.binding(key)))})); }
    setActuation(mm,key) { const cmd=commands.setActuation(mm,key); return this.run(async()=>{await this.ask(cmd,4); const value=parse.actuation(await this.ask(commands.actuation(key))); match(value,mm,'触发行程'); return value;}); }
    setDeadZone(top,bottom,key) {const cmd=commands.setDeadZone(top,bottom,key); return this.run(async()=>{await this.ask(cmd,4); const value=parse.deadZone(await this.ask(commands.deadZone(key)));match(value,{bottom,top},'死区');return value;});}
    setPolling(hz) {const cmd=commands.setPolling(hz);return this.run(async()=>{await this.ask(cmd,4);const value=parse.polling(await this.ask(commands.polling()));match(value,hz,'回报率');return value;});}
    setRapidState(enabled) {const cmd=commands.setRapidState(enabled);return this.run(async()=>{await this.ask(cmd,4);const value=parse.state(await this.ask(commands.rapidState()));match(value,enabled,'RT 开关');return value;});}
    setRapidKeys(keys,options) {
      if (!Array.isArray(keys) || !keys.length || keys.length>68) throw new RangeError('按键列表无效');
      const packets=[...new Set(keys)].map(key=>[key,commands.setRapidKey(key,options)]);
      return this.run(async()=>{for(const [key,cmd] of packets){await this.ask(cmd,4);const value=parse.rapid(await this.ask(commands.rapidKey(key),10));if(value.independent)throw new Error(`${key} 仍为独立 RT 灵敏度，回读未确认`);match(value.enabled,options.enabled,`${key} RT 开关`);match(value.sensitivity,options.sensitivity,`${key} RT 灵敏度`);} return packets.length;});
    }
    setSpeedState(enabled) {const cmd=commands.setSpeedState(enabled);return this.run(async()=>{await this.ask(cmd,4);const value=parse.state(await this.ask(commands.speedState()));match(value,enabled,'Speed Tap');return value;});}
    readSpeedPairs() {return this.run(async()=>[...parse.pairs(await this.ask(commands.speedPairs(0),16),0),...parse.pairs(await this.ask(commands.speedPairs(1),12),1)]);}
    setSpeedPair(a,b,enabled) {const cmd=commands.setSpeedPair(a,b,enabled);return this.run(async()=>{await this.ask(cmd,4);const pairs=[...parse.pairs(await this.ask(commands.speedPairs(0),16),0),...parse.pairs(await this.ask(commands.speedPairs(1),12),1)];const wanted=[keyCode(a),keyCode(b)];match(pairs.some(p=>p[0]===wanted[0]&&p[1]===wanted[1]||p[0]===wanted[1]&&p[1]===wanted[0]),enabled,'Speed Tap 配对');return pairs;});}
    setBinding(source,target) {const cmd=commands.setBinding(source,target);return this.run(async()=>{await this.ask(cmd,4);const value=parse.binding(await this.ask(commands.binding(source)));match(value,target,'改键');return value;});}
    readLight(type) {const cmd=commands.light(type);return this.run(async()=>parse.light(await this.ask(cmd,12),type));}
    setLight(options) {const cmd=commands.setLight(options);return this.run(async()=>{await this.ask(cmd,4);const value=parse.light(await this.ask(commands.light(options.type),12),options.type);match(value.brightness,options.brightness,'灯光亮度');match(value.rawSpeed,cmd[4],'灯效速度');if(options.type!==2)match(value.color.toLowerCase(),options.color.toLowerCase(),'灯光颜色');return value;});}
    save() {return this.run(async()=>{await this.ask(commands.save(),4);return {acknowledged:true,persistenceVerified:false};});}
  }
  const api={ID,KEYS,PHYSICAL,MAGNETIC,commands,parse,response,validateFrame,unit,keyCode,Driver};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.AceHfx=api;
})(globalThis);
