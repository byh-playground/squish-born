const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const html = fs.readFileSync('index.html', 'utf8');
const pin = JSON.parse(fs.readFileSync('docs/gamekit.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('assets/svg/manifest.json', 'utf8'));
const dist = 'https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@' + pin.distCommit + '/';
if (pin.tag !== 'v0.10.4' || pin.sourceCommit !== '0abe586967704e193a5e85b6b0c598e58bbf193b'
    || pin.distCommit !== '95d8676e3eaaa9f80aeed2e3361e258381511c77'
    || pin.officialManifestSha256 !== '64699fdd06eef0f94e874703cbb9f7e87c5f1ef067c68241b7dc17d9b172f625') {
  throw new Error('GameKit 0.10.4 SDK provenance pin mismatch');
}
for (const module of pin.modules.filter(item => item.delivery === 'pinned CDN ESM')) {
  if (!html.includes(dist + module.path)) throw new Error('Pinned CDN SDK module is missing: ' + module.name);
}
const embedded = pin.modules.filter(item => item.delivery === 'pinned embedded ESM');
const dataModules = [...html.matchAll(/import\('data:text\/javascript;base64,([^']+)'\)/g)];
if (dataModules.length !== embedded.length) throw new Error('Embedded SDK module count mismatch');
for (let index = 0; index < embedded.length; index++) {
  const bytes = Buffer.from(dataModules[index][1], 'base64');
  if (hash(bytes) !== embedded[index].sha256 || bytes.byteLength !== embedded[index].bytes) throw new Error('Embedded SDK module pin mismatch: ' + embedded[index].name);
}
if (manifest.schemaVersion !== 1 || manifest.compileMode !== 'browser-startup' || manifest.assets.length !== 19) throw new Error('Authored SVG manifest is incomplete');
for (const item of manifest.assets) {
  const bytes = fs.readFileSync(item.path);
  if (hash(bytes) !== item.sha256) throw new Error('Authored SVG source hash mismatch: ' + item.path);
  const source = bytes.toString('utf8');
  const metadataText = source.match(/<metadata id="vector-asset">([\s\S]*?)<\/metadata>/)?.[1];
  if (!metadataText) throw new Error('Authored SVG metadata missing: ' + item.path);
  const metadata = JSON.parse(metadataText);
  if (metadata.id !== item.id) throw new Error('Authored SVG id mismatch: ' + item.path);
  if ((metadata.styles || []).some(style => (style.kind === 'yarn' || style.kind === 'sketch') && style.backend !== 'shader')) {
    throw new Error('Authored yarn/sketch style must delegate to the shared GameKit shader: ' + item.path);
  }
}
if (fs.existsSync('assets/compiled') || fs.existsSync('assets/gamekit/rendering.js') || fs.existsSync('assets/gamekit/vector-assets.js')) {
  throw new Error('Compiled mesh arrays and local copies of shared SDK modules must not be published');
}
if (!html.includes('createVectorAssetLoader({maxEntries:32})') || !html.includes('expectedSha256:item.sha256')
    || !html.includes('includeSourcePaths:true') || !html.includes("new URL('assets/svg/manifest.json'")) {
  throw new Error('Game must verify and compile authored SVGs once through the pinned browser loader');
}
const appScript = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
if (!appScript) throw new Error('Application ESM script missing');
new vm.SourceTextModule(appScript);
if (/getContext\(["']2d["']\)|<canvas[^>]*data-portrait|<canvas[^>]*id=["']hero/i.test(html)) throw new Error('Canvas2D or raster portrait remains in the product page');
if (/<image\b|data:image\//i.test(html)) throw new Error('Raster image resource found in product page');
execFileSync(process.execPath, ['--test', 'tests/gradient-adapter.test.mjs', 'tests/painter-order-contract.test.mjs'], { stdio: 'inherit' });
console.log('GameKit 0.10.4 provenance, source SVG hashes, startup loader contract, and application ESM verified');
