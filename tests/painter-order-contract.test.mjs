import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const html = [
  '../index.html',
  '../src/main.js',
  '../src/presentation/vector-path.js',
].map(file => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');
const manifest = JSON.parse(readFileSync(new URL('../assets/svg/manifest.json', import.meta.url), 'utf8'));

test('original SVGs are the only shipped vector assets', () => {
  assert.equal(manifest.compileMode, 'browser-startup');
  assert.equal(manifest.assets.length, 19);
  assert.equal(readdirSync(new URL('../assets/svg/', import.meta.url)).filter(file => file.endsWith('.svg')).length, 19);
  assert.ok(manifest.assets.every(asset => asset.path.startsWith('assets/svg/') && asset.path.endsWith('.svg')));
  assert.equal(statSync(new URL('../assets/svg/manifest.json', import.meta.url)).isFile(), true);
  assert.throws(() => statSync(new URL('../assets/compiled/', import.meta.url)), { code: 'ENOENT' });
});

test('the pinned shared browser loader compiles once at startup and verifies each source', () => {
  assert.match(html, /vector-assets-loader\.js/);
  assert.match(html, /createVectorAssetLoader\(\{maxEntries:32\}\)/);
  assert.match(html, /expectedSha256:item\.sha256/);
  assert.match(html, /sourcePath:item\.path/);
  assert.match(html, /includeSourcePaths:true/);
  assert.equal((html.match(/createVectorAssetLoader\(/g) || []).length, 1);
  assert.doesNotMatch(html, /compileVectorAssetFile|compiledAssetModuleSource|assets\/compiled/);
});

test('shader surfaces and authored SVG layer order stay with the GameKit vector actor', () => {
  for (const item of manifest.assets) {
    const source = readFileSync(new URL('../' + item.path, import.meta.url), 'utf8');
    const encoded = source.match(/<metadata id="vector-asset">([\s\S]*?)<\/metadata>/)?.[1];
    assert.ok(encoded, `${item.path}: vector metadata is required`);
    const metadata = JSON.parse(encoded);
    assert.equal(metadata.id, item.id);
    for (const style of metadata.styles || []) {
      if (style.kind === 'yarn' || style.kind === 'sketch') assert.equal(style.backend, 'shader', `${item.path}: shader backend must be authored in the SVG`);
    }
  }
  assert.match(html, /new VectorContext\(device,\{initialVertices:8192,maxVertices:262144\}\)/);
  assert.match(html, /createVectorActor\(rig\.context,compiled,/);
  assert.match(html, /context\.drawVectorActor\(record\.actor\.seek\(timeMs\),\{matrix/);
  assert.match(html, /system\.raw\.dispose\(\);system\.device\.dispose\(\)/);
  assert.doesNotMatch(html, /YarnSurfaceRenderer|MeshRenderer|VectorRenderer|createVectorAsset|createPlayer|surfaceRenderer|\.drawSurface\(/);
  assert.doesNotMatch(html, /multiplyAffine/);
  assert.match(html, /drawVectorActor\(record\.actor\.seek\(timeMs\),\{matrix:\[width\/vw/);
  assert.ok(readdirSync(new URL('../assets/', import.meta.url)).every(file => file !== 'compiled' && file !== 'gamekit'));
});


test('concave runtime clips use bounded retained GameKit ClipPaths after frame completion', () => {
  assert.ok(html.includes('function flattenTransformedClip(context)'));
  assert.ok(html.includes('inverseAffineTransform(context.getTransform())'));
  assert.ok(html.includes('target.createClipPath(item.points,{rule:item.rule})'));
  assert.ok(html.includes('target.clipPath(handle)'));
  assert.ok(html.includes('ctx.flushPendingClipPaths?.()'));
  assert.ok(html.includes('maxRetainedClipPaths=32'));
  assert.ok(html.includes('disposeClipPaths'));
});
