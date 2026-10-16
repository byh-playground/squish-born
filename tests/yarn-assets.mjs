import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const directory = resolve(root, 'assets/compiled');
const files = (await readdir(directory)).filter(file => file.endsWith('.js')).sort();
let yarnSurfaceCount = 0;
for (const file of files) {
  const { compiledAsset: asset } = await import(pathToFileURL(resolve(directory, file)));
  const styles = (asset.metadata.styles ?? []).filter(style => style.kind === 'yarn');
  if (!styles.length) continue;
  assert.ok(Array.isArray(asset.yarnSurfaces), `${file} retains shader surfaces`);
  assert.ok(Array.isArray(asset.paintOrder), `${file} retains SVG painter order`);
  assert.equal(asset.yarnSurfaces.length, styles.length, `${file} has one retained shader surface per authored yarn target`);
  const targets = new Set(styles.map(style => style.target));
  for (const surface of asset.yarnSurfaces) {
    assert.ok(targets.has(surface.target), `${file}:${surface.target} is authored in the SVG metadata`);
    assert.ok(surface.fillVertices instanceof Float32Array && surface.fillVertices.length >= 18 && surface.fillVertices.length % 18 === 0,
      `${file}:${surface.target} retains filled triangles only`);
    assert.ok(surface.outline instanceof Float32Array && surface.outline.length >= 6 && surface.outline.length % 2 === 0,
      `${file}:${surface.target} retains one closed contour`);
    assert.ok(Number.isSafeInteger(surface.partIndex) && surface.partIndex >= 0 && surface.partIndex < asset.metadata.parts.length,
      `${file}:${surface.target} maps to an animated SVG part`);
    assert.equal(surface.style.target, surface.target);
  }
  const yarnLayers = asset.paintOrder.filter(layer => layer.kind === 'yarn');
  assert.equal(yarnLayers.length, asset.yarnSurfaces.length, `${file} painter order visits each surface once`);
  assert.deepEqual(yarnLayers.map(layer => layer.surface).sort((a, b) => a - b), asset.yarnSurfaces.map((_, index) => index),
    `${file} painter order references valid surfaces`);
  const variants = asset.geometry.expressionIndices;
  let coveredIndices = 0;
  for (const layer of asset.paintOrder) {
    if (layer.kind === 'yarn') continue;
    assert.equal(layer.kind, 'mesh');
    const indices = variants[layer.indexVariant];
    assert.ok(indices instanceof Uint16Array && indices.length > 0 && indices.length % 3 === 0,
      `${file} ${layer.indexVariant} is a retained mesh painter-order range`);
    assert.ok(indices.every(index => index < asset.geometry.vertices.length / asset.geometry.strideFloats),
      `${file} ${layer.indexVariant} indices remain within the mesh`);
    coveredIndices += indices.length;
  }
  if (asset.paintOrder.some(layer => layer.kind === 'mesh')) {
    assert.equal(coveredIndices, asset.geometry.indices.length,
      `${file} mesh ranges contain every non-yarn triangle and no baked yarn effects`);
  } else {
    assert.equal(coveredIndices, 0, `${file} has no ordinary mesh painter-order ranges`);
    assert.equal(asset.geometry.indices, undefined, `${file} shader-only assets do not retain an unused mesh index buffer`);
    assert.ok(asset.geometry.vertices.every((value, index) => index % 11 !== 5 || value === 0),
      `${file} shader-only placeholder mesh is fully transparent`);
  }
  yarnSurfaceCount += asset.yarnSurfaces.length;
}
assert.ok(yarnSurfaceCount >= 24, `Expected all authored character/egg yarn targets, got ${yarnSurfaceCount}`);
console.log(`Verified ${yarnSurfaceCount} retained yarn surfaces across ${files.length} compiled SVG assets; yarn effects are not in static mesh indices.`);
