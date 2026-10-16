import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createLinearGradient, createRadialGradient } from '../assets/gradient-adapter.js';

test('gradient adapters preserve native gradient endpoints and receiver', () => {
  const calls = [];
  const linear = {};
  const radial = {};
  const target = {
    createLinearGradient(...args) {
      calls.push({ name: 'linear', receiver: this, args });
      return linear;
    },
    createRadialGradient(...args) {
      calls.push({ name: 'radial', receiver: this, args });
      return radial;
    },
  };

  assert.equal(createLinearGradient(target, -4, 7, 22, 35), linear);
  assert.equal(createRadialGradient(target, 3, 7, 2, 19, 31, 11), radial);
  assert.deepEqual(calls, [
    { name: 'linear', receiver: target, args: [-4, 7, 22, 35] },
    { name: 'radial', receiver: target, args: [3, 7, 2, 19, 31, 11] },
  ]);

  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /import\s+\{\s*createLinearGradient,\s*createRadialGradient\s*\}\s+from\s+['"]\.\/assets\/gradient-adapter\.js['"]/);
  assert.match(html, /createLinearGradient\(target,x0,y0,x1,y1\)/);
  assert.match(html, /createRadialGradient\(target,x0,y0,r0,x1,y1,r1\)/);
  assert.doesNotMatch(html, /LinearGradientApprox|fitCurrentClipToGameKit|resampleClipContour/);
  assert.match(html, /return target\.clip\(rule\)/);
});
