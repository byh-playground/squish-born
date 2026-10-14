'use strict';
// Runs the real production simulation without a DOM, browser, or rewritten combat logic.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = source.indexOf('const BUILD =');
const end = source.indexOf('// Presentation-only geometry.', start);
assert.ok(start >= 0 && end > start, 'Production simulation extraction boundaries exist');
const context = vm.createContext({structuredClone, console});
vm.runInContext(source.slice(start, end) + '\nthis.testing = {Config, Simulation, Unit};', context, {timeout: 10000});
const {Config, Simulation, Unit} = context.testing;
const tests = [];
function test(name, fn) { tests.push([name, fn]); }
function fixture(seed = 713912) {
  const sim = new Simulation(seed);
  sim.start();
  sim.nest.attack.left = 1e9;
  const events = [];
  sim.events.on(e => events.push(e));
  return {sim, events};
}
function enemy(sim, x, y = 300, marked = false) {
  const e = new Unit(++sim.entityId, 'enemy', {...Config.enemies[0], health: 1000, damage: 0, speed: 0}, {x, y});
  e.attack.left = 1e9;
  if (marked) e.knot = {tiedAt: sim.time, reserved: null};
  sim.enemies.push(e);
  return e;
}
function ally(sim, type = 0, x = 270, y = 300) {
  const a = new Unit(++sim.entityId, 'ally', Config.units[type], {x, y});
  a.home.leash = 999;
  a.movement.speed = 0;
  a.attack.left = 0;
  sim.allies.push(a);
  return a;
}
const count = (events, kind) => events.filter(e => e.kind === kind).length;
const plain = value => JSON.parse(JSON.stringify(value));
function tickChains(sim, steps = 300) { for (let i = 0; i < steps && sim.knotChains.length; i++) sim.updateKnotChains(Config.clock.step); }

test('preparation projectiles mark targets but never detonate, including repeated preparation', () => {
  for (const type of [1, 2]) {
    const {sim, events} = fixture(), a = ally(sim, type), e = enemy(sim, 290);
    for (let i = 0; i < 5; i++) { sim.fire(a, e); sim.updateProjectiles(1); assert.ok(e.knot); }
    assert.equal(count(events, 'knotTied'), 1);
    assert.equal(count(events, 'knotCompress'), 0);
    assert.equal(sim.knotChains.length, 0);
  }
});
test('ordinary melee, piercing shots, spore splash, and nest projectiles preserve existing knots', () => {
  const {sim, events} = fixture(), e = enemy(sim, 290, 300, true), nearby = enemy(sim, 310, 300, true);
  const knot = e.knot, nearbyKnot = nearby.knot;
  for (const type of [0, 3, 2]) { sim.fire(ally(sim, type), e); sim.updateProjectiles(1); }
  sim.fireNest(); sim.updateProjectiles(1);
  assert.equal(e.knot, knot); assert.equal(nearby.knot, nearbyKnot);
  assert.ok(e.health.current < e.health.max && nearby.health.current < nearby.health.max);
  assert.equal(count(events, 'knotCompress'), 0);
});
test('preparation targeting prefers unmarked and avoids another in-flight preparation shot', () => {
  const {sim} = fixture(), a = ally(sim, 1), b = ally(sim, 2, 272);
  const marked = enemy(sim, 280, 300, true), first = enemy(sim, 310), second = enemy(sim, 340);
  sim.updateCombat(0);
  assert.equal(a.target, first.id); assert.equal(b.target, second.id);
  assert.equal(sim.projectiles.length, 2);
  assert.ok(!sim.projectiles.some(p => p.target === marked.id));
});
test('first two successful hatch roles are preparation then detonator; bonus units consume one role draw', () => {
  for (const seed of [1, 2, 42, 713912, 999999]) {
    const {sim} = fixture(seed);
    const hatch = () => { const event = {kind: 'hatch', egg: 0, unitCount: 3, grade: 'good', perfect: false, material: 'crack', reward: 10}; sim.handleEgg(event); return event; };
    const first = hatch(), second = hatch();
    assert.equal(first.type, 1); assert.equal(second.type, 0);
    assert.deepEqual(plain(sim.allies.map(a => a.definition.id)), ['sprout', 'sprout', 'sprout', 'mushroom', 'mushroom', 'mushroom']);
    assert.equal(sim.unitBag.length, 3);
  }
});
test('three normal hits preserve knot, fourth attack waits visible windup before heavy detonation', () => {
  const {sim, events} = fixture(), a = ally(sim), e = enemy(sim, 300, 300, true);
  for (let i = 1; i <= 3; i++) { a.attack.left = 0; sim.updateCombat(0); assert.equal(a.attack.normalHits, i); assert.ok(e.knot); assert.equal(count(events, 'knotCompress'), 0); }
  a.attack.left = 0; sim.updateCombat(0);
  assert.equal(a.state, 'winding'); assert.equal(a.attack.windup.left, Config.knot.windup);
  assert.equal(count(events, 'knotWindup'), 1);
  const health = e.health.current;
  sim.updateCombat(Config.knot.windup - .01); assert.equal(e.health.current, health); assert.ok(e.knot);
  sim.updateCombat(.011); assert.equal(a.attack.normalHits, 0); assert.equal(a.attack.windup, null);
  assert.equal(e.knot, null); assert.equal(count(events, 'knotCompress'), 1);
  assert.ok(Math.abs(health - e.health.current - a.attack.damage * Config.knot.heavyScale) < 1e-8);
});
test('heavy target lost during windup cancels safely without consuming the heavy attack', () => {
  const {sim, events} = fixture(), a = ally(sim), e = enemy(sim, 300, 300, true);
  a.attack.normalHits = Config.knot.normalHits; sim.updateCombat(0);
  e.applyDamage({damage: 10000}); sim.updateCombat(Config.knot.windup + .01);
  assert.equal(a.attack.windup, null); assert.equal(a.attack.normalHits, Config.knot.normalHits);
  assert.equal(count(events, 'knotCompress'), 0);
});
test('chain advances one node per phase, stops at five, and leaves remaining knots', () => {
  const {sim, events} = fixture(), a = ally(sim);
  const nodes = Array.from({length: 7}, (_, i) => enemy(sim, 30 + i * 70, 100, true));
  assert.equal(sim.startKnotChain(nodes[0], a), true);
  assert.equal(count(events, 'knotCompress'), 1); assert.equal(count(events, 'knotUnwind'), 0);
  sim.updateKnotChains(Config.knot.compress / 2); assert.equal(count(events, 'knotUnwind'), 0);
  sim.updateKnotChains(Config.knot.compress / 2); assert.equal(count(events, 'knotUnwind'), 1);
  assert.ok(nodes[1].knot.reserved); assert.equal(count(events, 'knotCompress'), 1);
  sim.updateKnotChains(Config.knot.flight); assert.equal(count(events, 'knotCompress'), 2); assert.equal(count(events, 'knotUnwind'), 1);
  tickChains(sim);
  const compressed = events.filter(e => e.kind === 'knotCompress').map(e => e.target);
  assert.equal(compressed.length, 5); assert.equal(new Set(compressed).size, 5);
  assert.equal(count(events, 'knotUnwind'), 5); assert.equal(sim.knotChains.length, 0);
  assert.ok(nodes[5].knot && nodes[6].knot);
});
test('selection uses distance, stable ID tie-break, inclusive range, and excludes used nodes', () => {
  const {sim} = fixture(), a = ally(sim), first = enemy(sim, 250, 200, true);
  const lower = enemy(sim, 200, 200, true), higher = enemy(sim, 300, 200, true);
  sim.enemies.reverse(); sim.startKnotChain(first, a); const chain = sim.knotChains[0];
  assert.equal(sim.nextKnot(chain), lower);
  lower.knot = null; higher.knot = null;
  const boundary = enemy(sim, 360, 200, true), outside = enemy(sim, 360.001, 200, true);
  assert.equal(sim.nextKnot(chain), boundary); boundary.knot = null;
  assert.equal(sim.nextKnot(chain), undefined);
  sim.tieKnot(first, {previous: {x: 0, y: 0}}); assert.equal(sim.nextKnot(chain), undefined);
  assert.ok(outside.knot);
});
test('nearby unmarked enemies receive local splash but do not propagate the chain', () => {
  const {sim, events} = fixture(), a = ally(sim), first = enemy(sim, 100, 100, true);
  const nearby = enemy(sim, 130, 100), beyond = enemy(sim, 220, 100, true);
  sim.startKnotChain(first, a); tickChains(sim);
  assert.equal(first.health.current, 1000 - Config.knot.damage);
  assert.equal(nearby.health.current, 1000 - Config.knot.damage * Config.knot.splashScale);
  assert.equal(nearby.knot, null); assert.ok(beyond.knot); assert.equal(beyond.health.current, 1000);
  assert.equal(count(events, 'knotUnwind'), 1);
});
test('reservations prevent concurrent chains consuming one target and release on target death', () => {
  const {sim, events} = fixture(), a = ally(sim), first = enemy(sim, 100, 100, true), target = enemy(sim, 180, 100, true), other = enemy(sim, 260, 100, true);
  sim.startKnotChain(first, a); sim.updateKnotChains(Config.knot.compress);
  const id = target.knot.reserved; assert.ok(id);
  assert.equal(sim.startKnotChain(target, a), false);
  assert.equal(sim.startKnotChain(other, a), true);
  sim.updateKnotChains(Config.knot.compress);
  assert.equal(target.knot.reserved, id);
  target.applyDamage({damage: 10000}); sim.updateKnotChains(Config.knot.flight);
  assert.equal(target.knot.reserved, null); assert.equal(sim.knotChains.length, 0);
  assert.equal(count(events, 'knotCompress'), 2);
});
test('paused update freezes combat and snapshot reads are detached and side-effect free', () => {
  const {sim, events} = fixture(), a = ally(sim), first = enemy(sim, 100, 100, true), next = enemy(sim, 180, 100, true);
  sim.startKnotChain(first, a); sim.updateKnotChains(Config.knot.compress); sim.pause();
  const before = JSON.stringify(sim.snapshot()), eventCount = events.length, rng = sim.rng.state;
  for (let i = 0; i < 100; i++) { sim.update(Config.clock.step); sim.snapshot(); }
  assert.equal(JSON.stringify(sim.snapshot()), before); assert.equal(events.length, eventCount); assert.equal(sim.rng.state, rng);
  const copy = sim.snapshot(); copy.knotChains[0].used.push(123456); copy.knots[0].position.x = -999; copy.allies[0].position.x = -888;
  assert.equal(JSON.stringify(sim.snapshot()), before); assert.ok(next.knot.reserved);
  sim.resume(); sim.update(Config.clock.step); assert.ok(sim.time > 0);
});
test('seeded runs produce identical combat, chain events, role draws, and RNG states', () => {
  function run(seed) {
    const {sim, events} = fixture(seed);
    for (const type of [1, 0, 2, 3]) { sim.addAlly({type}); const unit = sim.allies.at(-1); unit.position = {x: 270 + sim.rng.range(-20, 20), y: 300}; unit.home = {...unit.position, leash: 999}; }
    for (let i = 0; i < 9; i++) enemy(sim, 240 + (i % 3) * 35, 250 + Math.floor(i / 3) * 30, true);
    for (let i = 0; i < 1200; i++) sim.update(Config.clock.step);
    return JSON.stringify({snapshot: sim.snapshot(), enemies: sim.enemies.map(e => ({id: e.id, health: e.health, knot: e.knot, position: e.position})), rng: sim.rng.state, events});
  }
  const first = run(12345); assert.equal(run(12345), first); assert.notEqual(run(54321), first);
});

let failed = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log('PASS', name); }
  catch (error) { failed++; console.error('FAIL', name, '\n', error.stack); }
}
console.log(`${tests.length - failed}/${tests.length} production knot simulation tests passed`);
if (failed) process.exitCode = 1;
