const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
http.createServer((q,r)=>{const name=q.url.split('?')[0];if(name==='/'||name==='/index.html'){r.setHeader('Content-Type','text/html; charset=utf-8');r.end(fs.readFileSync(path.join(root,'index.html')))}else{r.writeHead(404);r.end()}}).listen(8767,'127.0.0.1',()=>console.log('http://127.0.0.1:8767'));
