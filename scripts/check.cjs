const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const html = fs.readFileSync('index.html', 'utf8');
const source = fs.readFileSync('src/main.js', 'utf8');
const pin = JSON.parse(fs.readFileSync('docs/gamekit.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('assets/svg/manifest.json', 'utf8'));
const dist = 'https://cdn.jsdelivr.net/gh/byh-playground/bloom-gamekit@' + pin.distCommit + '/';
const officialManifestBytes = fs.readFileSync('docs/gamekit-manifest.json');
const officialManifest = JSON.parse(officialManifestBytes.toString('utf8'));
if (hash(officialManifestBytes) !== pin.officialManifestSha256 || officialManifest.schemaVersion !== 2) throw new Error('Official GameKit manifest pin mismatch');
const publishedModules = new Map(officialManifest.modules.map(module => [module.file, module.sha256]));
for (const module of pin.modules) {
  if (publishedModules.get(module.path) !== module.sha256) throw new Error('Pinned GameKit module hash differs from the official manifest: ' + module.name);
}
if (pin.tag !== 'v0.39.0' || pin.sourceCommit !== 'd5c35c3d4fec366e672c9a5889104ea47a300683'
    || pin.distCommit !== '1a3ef3877dea431268c712cbe7b13b2600826119'
    || pin.officialManifestSha256 !== 'ef220fd3801549c88b0044c2bcfa92f4a7de40ce49626e0199ed8e5b1a58f2c0') {
  throw new Error('GameKit 0.39.0 SDK provenance pin mismatch');
}
for (const module of pin.modules.filter(item => item.delivery === 'pinned CDN ESM')) {
  if (!source.includes(dist + module.path)) throw new Error('Pinned CDN SDK module is missing: ' + module.name);
}
const embedded = pin.modules.filter(item => item.delivery === 'pinned embedded ESM');
const dataModules = [...source.matchAll(/import\('data:text\/javascript;base64,([^']+)'\)/g)];
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
if (!source.includes('createVectorAssetLoader({maxEntries:32})') || !source.includes('expectedSha256:item.sha256')
    || !source.includes('includeSourcePaths:true') || !source.includes("new URL('assets/svg/manifest.json'")) {
  throw new Error('Game must verify and compile authored SVGs once through the pinned browser loader');
}
if (!source.includes('Boolean(asset.geometry.materials)!==(authored.length>0)')) throw new Error('Asset validation must match material surfaces to the authored yarn/sketch styles');
if (!source.includes('new VectorContext(device,{initialVertices:8192,maxVertices:262144})')
    || !source.includes('createVectorActor(rig.context,compiled,') || !source.includes('context.drawVectorActor(')
    || !source.includes('system.raw.dispose();system.device.dispose()')) {
  throw new Error('Each canvas must draw through one WebGLDevice + VectorContext and createVectorActor, and dispose both');
}
if (/YarnSurfaceRenderer|MeshRenderer|VectorRenderer|createVectorAsset|createPlayer|surfaceRenderer/.test(source)) {
  throw new Error('Retired GameKit renderer APIs must not be referenced');
}
if (/localStorage(?!Adapter)|indexedDB/.test(source) || !source.includes('createSave({adapter:showcaseDemo?memoryAdapter():localStorageAdapter()')) {
  throw new Error('The profile must be stored only through the pinned GameKit save module, with the intro run on a memory adapter');
}
if (source.includes('multiplyAffine') || !source.includes('{matrix:[width/vw,0,0,height/vh,')) throw new Error('Sprite drawing must pass only the SVG transform; the context composes camera, alpha and color');
const appScript = source;
if (!appScript) throw new Error('Application ESM script missing');
new vm.SourceTextModule(appScript);
if (/getContext\(["']2d["']\)|<canvas[^>]*data-portrait|<canvas[^>]*id=["']hero/i.test(html)) throw new Error('Canvas2D or raster portrait remains in the product page');
if (/<image\b|data:image\//i.test(html)) throw new Error('Raster image resource found in product page');
execFileSync(process.execPath, ['--test', 'tests/gradient-adapter.test.mjs', 'tests/painter-order-contract.test.mjs'], { stdio: 'inherit' });
console.log('GameKit 0.39.0 provenance, source SVG hashes, startup loader contract, and application ESM verified');
