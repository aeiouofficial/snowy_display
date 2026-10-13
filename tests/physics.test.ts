import test from 'node:test';
import assert from 'node:assert/strict';
import { SnowEngine } from '../src/physics.ts';
const surfaces = [
  { id: 'front', x: 40, y: 60, width: 140, height: 80, z: 2 },
  { id: 'back', x: 0, y: 100, width: 220, height: 80, z: 1 },
];
test('exposed edges respect z-order and occlusion', () => {
  const e = new SnowEngine(250, 200);
  e.setSurfaces(surfaces);
  assert.equal(e.isExposed(surfaces[1], 80), false);
  assert.equal(e.isExposed(surfaces[1], 15), true);
  assert.equal(e.isExposed(surfaces[0], 80), true);
  assert.equal(e.deposit('back', 80, 10), false);
  assert.equal(e.deposit('back', 10, 10), true);
});
test('mass accumulates unevenly and is bounded by depth', () => {
  const e = new SnowEngine(250, 200);
  e.setSurfaces([surfaces[0]]);
  e.deposit('front', 70, 20);
  let bins = e.snapshot().piles[0].bins;
  assert.ok(Math.max(...bins) > Math.min(...bins));
  for (let i = 0; i < 1000; i++) e.deposit('front', 70, 100);
  bins = e.snapshot().piles[0].bins;
  assert.ok(bins.every(n => n >= 0 && n <= 34));
});
test('moving windows shed mass, closing windows drops piles', () => {
  const e = new SnowEngine(500, 350);
  e.setSurfaces([surfaces[0]], 0);
  e.deposit('front', 70, 25);
  const oldTotal = e.snapshot().piles[0].bins.reduce((a,b) => a+b,0);
  e.setSurfaces([{ ...surfaces[0], x: 120 }], 0.1);
  const newTotal = e.snapshot().piles[0].bins.reduce((a,b) => a+b,0);
  assert.ok(newTotal < oldTotal);
  assert.ok(e.snapshot().clumps.length > 0);
  e.setSurfaces([], 0.2);
  assert.equal(e.snapshot().piles.length, 0);
});
test('no snowmen, no NaNs, bounded particle count, deterministic seed', () => {
  const a = new SnowEngine(480, 320, 123);
  const b = new SnowEngine(480, 320, 123);
  for (let i=0;i<200;i++) { a.step(1/60); b.step(1/60); }
  assert.deepEqual(a.snapshot(), b.snapshot());
  assert.ok(a.snapshot().flakes.length <= 1250);
  assert.ok(a.snapshot().flakes.every(p => Number.isFinite(p.x+p.y+p.vx+p.vy)));
});
test('settings validation and limits', () => {
  const e = new SnowEngine(100,100);
  assert.throws(() => e.configure({ wind: Number.NaN }), RangeError);
  e.configure({ maxDepth: 999, wind: -9, snowfall: 0 });
  assert.equal(e.settings.maxDepth, 120);
  assert.equal(e.settings.wind, -1);
  e.step(1 / 60);
  assert.equal(e.snapshot().flakes.length, 0);
});
