const fs = require('node:fs');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const html = fs.readFileSync('index.html', 'utf8');
const pin = JSON.parse(fs.readFileSync('docs/gamekit.json', 'utf8'));
const manifestBytes = fs.readFileSync('assets/compiled/manifest.json');
const manifest = JSON.parse(manifestBytes);
if (hash(fs.readFileSync(pin.distManifestPath)) !== pin.manifestSha256) throw Error('Pinned GameKit distribution manifest hash mismatch');
if (hash(manifestBytes) !== pin.compiledAssetManifestSha256) throw Error('Compiled SVG manifest hash mismatch');
if (manifest.compilerVersion !== pin.compiler.version) throw Error('Compiled SVG manifest compiler version mismatch');
if (!html.includes(`const GAMEKIT_DIST='${pin.distCommit}'`) || !html.includes(`GameKit ${pin.tag} pinned ESM files`)) throw Error('Application GameKit distribution pin mismatch');
const embedded = pin.modules.filter(module => module.delivery === 'embedded data URL ESM');
const local = pin.modules.filter(module => module.delivery === 'local ESM');
const urls = [...html.matchAll(/import\('data:text\/javascript;base64,([^']+)'\)/g)];
if (urls.length !== embedded.length) throw Error('Embedded SDK module count');
for (let i = 0; i < urls.length; i++) {
  const bytes = Buffer.from(urls[i][1], 'base64');
  if (hash(bytes) !== embedded[i].sha256 || bytes.byteLength !== embedded[i].bytes) throw Error('Embedded SDK hash mismatch: ' + embedded[i].name);
}
for (const module of local) {
  const bytes = fs.readFileSync(module.path);
  if (hash(bytes) !== module.sha256 || bytes.byteLength !== module.bytes) throw Error('Local SDK hash mismatch: ' + module.name);
}
for (const [path, expected] of [
  ['scripts/vector-compiler/compiler.js', pin.compiler.compilerSha256],
  ['scripts/vector-compiler/schema.js', pin.compiler.schemaSha256],
]) if (hash(fs.readFileSync(path)) !== expected) throw Error('GameKit compiler pin mismatch: ' + path);

const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
if (!script) throw Error('Application ESM script missing');
new vm.SourceTextModule(script);
if (/getContext\(["']2d["']\)|<canvas[^>]*data-portrait|<canvas[^>]*id=["']hero/i.test(html)) throw Error('Canvas2D or raster portrait remains in the product page');
if (/<image\b|data:image\//i.test(html)) throw Error('Raster image resource found in product page');
execFileSync(process.execPath, ['scripts/compile-vectors.mjs', '--check'], { stdio: 'inherit' });
execFileSync(process.execPath, ['tests/yarn-assets.mjs'], { stdio: 'inherit' });
console.log('GameKit ' + pin.tag + ' module pins, ESM syntax, and authored SVG compilations verified');
