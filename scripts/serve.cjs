const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { res.writeHead(400).end(); return; }
  const candidate = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (candidate !== root && !candidate.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(candidate,(error,bytes)=>{
    if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500).end(); return; }
    res.setHeader('Content-Type', mime[path.extname(candidate)] || 'application/octet-stream');
    res.end(bytes);
  });
}).listen(8767, '127.0.0.1', () => console.log('http://127.0.0.1:8767'));
