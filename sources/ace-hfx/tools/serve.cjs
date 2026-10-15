const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../dist/index.html');
if(!fs.existsSync(file)){console.error('请先执行 node tools/build.cjs');process.exit(1);}
const server=http.createServer((req,res)=>{
  if(req.url!=='/'&&req.url!=='/index.html'){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);
});
server.on('error',e=>{console.error(e.message);process.exit(1);});
server.listen(47831,'127.0.0.1',()=>console.log('ACE HFX: http://127.0.0.1:47831'));
