import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

test('compiled SVG painter-order ranges use GameKit named index variants', async () => {
  const files = readdirSync(join(root, 'assets/compiled')).filter(file => file.endsWith('.js'));
  assert.equal(files.length, 19);
  let orderedLayers = 0;

  for (const file of files) {
    const { compiledAsset } = await import(pathToFileURL(join(root, 'assets/compiled', file)).href);
    const variants = compiledAsset.geometry.indexVariants ?? {};
    const expressions = compiledAsset.geometry.expressionIndices ?? {};
    for (const layer of compiledAsset.paintOrder ?? []) {
      orderedLayers++;
      if (layer.kind === 'mesh') {
        assert.equal(typeof layer.indexVariant, 'string', `${file}: mesh layer needs an index variant`);
        assert.ok(variants[layer.indexVariant] instanceof Uint16Array, `${file}: missing named index variant ${layer.indexVariant}`);
        assert.equal(expressions[layer.indexVariant], undefined, `${file}: painter range must not masquerade as an expression`);
      } else if (layer.kind === 'yarn') {
        assert.ok(Number.isInteger(layer.surface) && layer.surface >= 0 && layer.surface < compiledAsset.yarnSurfaces.length,
          `${file}: invalid yarn surface ${layer.surface}`);
      } else {
        assert.fail(`${file}: unknown paint layer kind ${layer.kind}`);
      }
    }
  }

  assert.ok(orderedLayers > 0, 'compiled SVGs must preserve authored paint order');
  const compiler = readFileSync(join(root, 'scripts/vector-compiler/compiler.js'), 'utf8');
  assert.match(compiler, /indexVariants\[name\]\s*=\s*retainedIndices\.slice/);
  assert.match(compiler, /indexVariants,\s*morphCount,\s*yarnSurfaces,\s*paintOrder/);
  assert.doesNotMatch(compiler, /expressionIndices\[name\]\s*=\s*retainedIndices\.slice/);
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  assert.match(html, /indexVariant:layer\.indexVariant/);
  assert.match(html, /stencilRef:context\.vector\.stencilDepth\|\|null/);
  assert.match(html, /drawSurface\(entry\.handle,\{[^}]*stencilRef:context\.vector\.stencilDepth\|\|null/);
});
