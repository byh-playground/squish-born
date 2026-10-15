const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const CONTENT_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.woff2', 'font/woff2'],
]);

module.exports = function createStaticServer({ root, html } = {}) {
  const rootPath = path.resolve(root || path.resolve(__dirname, '..'));
  const indexPath = path.resolve(rootPath, 'index.html');
  return http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end('Invalid request path');
      return;
    }
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(rootPath, relative);
    if (filePath !== indexPath && !filePath.startsWith(rootPath + path.sep)) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      response.writeHead(404).end('Not found');
      return;
    }
    const content = filePath === indexPath && html !== undefined ? Buffer.from(html) : fs.readFileSync(filePath);
    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
      'Content-Length': content.byteLength,
      'Cache-Control': 'no-store',
    });
    response.end(content);
  });
};
