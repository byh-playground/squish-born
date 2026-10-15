import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileVectorAssetFile, compiledAssetModuleSource } from './vector-compiler/compiler.js';
import { VECTOR_ASSET_COMPILER_VERSION } from './vector-compiler/schema.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceDirectory = resolve(root, 'assets/svg');
const outputDirectory = resolve(root, 'assets/compiled');
await mkdir(outputDirectory, { recursive: true });
const checkOnly = process.argv.includes('--check');
const sources = (await readdir(sourceDirectory)).filter(name => name.endsWith('.svg')).sort();
if (!sources.length) throw new Error('No authored SVG vector assets found');

const manifest = { schemaVersion: 1, compilerVersion: VECTOR_ASSET_COMPILER_VERSION, assets: [] };
for (const file of sources) {
  const sourcePath = `assets/svg/${file}`;
  const asset = await compileVectorAssetFile(resolve(sourceDirectory, file), sourcePath);
  const { sourcePaths, ...compiled } = asset;
  const filename = file.replace(/\.svg$/, '.js');
  const moduleSource = compiledAssetModuleSource(compiled);
  const path = resolve(outputDirectory, filename);
  manifest.assets.push({ id: compiled.metadata.id, source: file, sourceSha256: compiled.sourceSha256, module: filename });
  if (checkOnly) {
    let current;
    try { current = await readFile(path, 'utf8'); } catch {}
    if (current !== moduleSource) throw new Error(`${filename} is stale; run npm run vectors:compile`);
  } else {
    await writeFile(path, moduleSource, 'utf8');
  }
}

const manifestPath = resolve(outputDirectory, 'manifest.json');
const manifestSource = `${JSON.stringify(manifest, null, 2)}\n`;
if (checkOnly) {
  let current;
  try { current = await readFile(manifestPath, 'utf8'); } catch {}
  if (current !== manifestSource) throw new Error('assets/compiled/manifest.json is stale; run npm run vectors:compile');
} else {
  await writeFile(manifestPath, manifestSource, 'utf8');
}
console.log(`${checkOnly ? 'Verified' : 'Compiled'} ${sources.length} authored SVG assets with GameKit compiler ${manifest.compilerVersion}`);
