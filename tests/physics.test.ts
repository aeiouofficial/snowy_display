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

test('released snow falls and deposits on a lower surface', () => {
  const e = new SnowEngine(300, 280, 7);
  const upper = { id: 'upper', x: 30, y: 60, width: 130, height: 30, z: 3 };
  const lower = { id: 'lower', x: 0, y: 170, width: 250, height: 40, z: 1 };
  e.configure({ snowfall: 0, wind: 0 });
  e.setSurfaces([upper, lower], 0);
  e.deposit('upper', 80, 20);
  e.setSurfaces([lower], 0.15);
  for (let i = 0; i < 240; i++) e.step(1/60);
  const bottom = e.snapshot().piles.find(p => p.surface.id === 'lower');
  assert.ok(bottom && bottom.bins.some(value => value > 0), 'clumps must settle onto lower exposed window');
});

test('resizing surface remaps its existing accumulated snow', () => {
  const e = new SnowEngine(300, 280);
  e.setSurfaces([surfaces[0]], 0);
  e.deposit('front', 70, 30);
  const before = Math.max(...e.snapshot().piles[0].bins);
  e.setSurfaces([{ ...surfaces[0], width: 210 }], 0.15);
  const after = Math.max(...e.snapshot().piles[0].bins);
  assert.ok(after > 0 && before > 0);
});


test('a foreground window covering a snowy edge releases the hidden pile', () => {
  const e = new SnowEngine(320, 260, 99);
  const rear = { id: 'rear', x: 20, y: 120, width: 180, height: 80, z: 1 };
  e.setSurfaces([rear], 0);
  e.deposit('rear', 80, 35);
  const before = e.snapshot().piles[0].bins.reduce((sum, n) => sum + n, 0);
  const cover = { id: 'cover', x: 45, y: 55, width: 120, height: 105, z: 5 };
  e.setSurfaces([rear, cover], 0.2);
  const after = e.snapshot().piles.find(p => p.surface.id === 'rear')!.bins.reduce((sum, n) => sum + n, 0);
  assert.ok(after < before);
  assert.ok(e.snapshot().clumps.length > 0);
});

test('rapid repeated cover events cannot produce NaN or negative snow depths', () => {
  const e = new SnowEngine(400, 250);
  e.configure({ snowfall: 0 });
  const back = { id: 'rear', x: 0, y: 140, width: 300, height: 65, z: 0 };
  e.setSurfaces([back], 0);
  for (let i = 0; i < 400; i++) {
    e.deposit('rear', (i * 17) % 300, 12);
    e.setSurfaces([back, { id: 'top', x: (i % 2) ? 100 : 0, y: 100, width: 150, height: 80, z: 1 }], i * .15 + .15);
    e.step(1 / 30);
  }
  assert.ok(e.snapshot().piles.every(p => p.bins.every(b => Number.isFinite(b) && b >= 0 && b <= 34)));
});

test('swept continuous collision catches fast particles without tunneling', () => {
  const e = new SnowEngine(300, 300, 42);
  const win = { id: 'win', x: 20, y: 150, width: 260, height: 80, z: 1 };
  e.setSurfaces([win], 0);
  e.configure({ snowfall: 0, wind: 0 });
  e.step(1 / 60);
  (e as any).clumps.push({ x: 100, y: 130, vx: 0, vy: 350, radius: 3, opacity: 0.9, mass: 2 });
  for (let i = 0; i < 5; i++) e.step(1 / 30);
  const pile = e.snapshot().piles.find(p => p.surface.id === 'win');
  assert.ok(pile && pile.bins.some((b: number) => b > 0), 'fast moving particle must not tunnel through window edge');
});

test('clump impact on surface shatters into secondary micro-particles', () => {
  const e = new SnowEngine(300, 300, 88);
  const win = { id: 'target', x: 20, y: 160, width: 260, height: 80, z: 1 };
  e.setSurfaces([win], 0);
  e.configure({ snowfall: 0, wind: 0 });
  (e as any).clumps.push({ x: 120, y: 155, vx: 0, vy: 120, radius: 4, opacity: 0.9, mass: 2.5 });
  assert.equal(e.snapshot().flakes.length, 0);
  for (let i = 0; i < 3; i++) e.step(1 / 30);
  assert.ok(e.snapshot().flakes.length > 0, 'hard clump impact must spawn secondary micro-flakes');
});

test('granular settle algorithm redistributes slopes according to angle of repose', () => {
  const e = new SnowEngine(200, 200, 1);
  const win = { id: 'flat', x: 10, y: 100, width: 140, height: 50, z: 1 };
  e.setSurfaces([win], 0);
  e.configure({ snowfall: 0, cohesion: 0.2 });
  e.deposit('flat', 70, 30);
  const before = [...e.snapshot().piles[0].bins];
  for (let i = 0; i < 60; i++) e.step(1 / 60);
  const after = e.snapshot().piles[0].bins;
  const centerIdx = Math.floor((70 - win.x) / 7);
  assert.ok(after[centerIdx] < before[centerIdx], 'peak must slump downhill');
  assert.ok(after[centerIdx - 1] > before[centerIdx - 1] || after[centerIdx + 1] > before[centerIdx + 1], 'flanks must gain mass from granular flow');
});

test('wind compensation spawns flakes upwind and maintains full screen coverage', () => {
  const e = new SnowEngine(400, 300, 77);
  e.configure({ wind: 0.8, snowfall: 1.0 });
  for (let i = 0; i < 60; i++) e.step(1 / 60);
  const flakes = e.snapshot().flakes;
  assert.ok(flakes.some(p => p.x < 0), 'flakes must spawn upwind to prevent windward coverage void');
  assert.ok(flakes.some(p => p.x >= 0 && p.x <= 100), 'windward screen region must not be bare');
});

test('downwind flakes that left the screen are discarded and do not consume the flake budget', () => {
  for (const wind of [0.8, -0.8]) {
    const e = new SnowEngine(400, 300, 5);
    e.configure({ wind, snowfall: 1.0 });
    for (let i = 0; i < 900; i++) e.step(1 / 60);
    const flakes = e.snapshot().flakes;
    const downwindLeak = flakes.filter(p => (wind > 0 ? p.x > 400 + 45 : p.x < -45));
    assert.equal(downwindLeak.length, 0, `wind ${wind}: no flake may survive past the downwind edge`);
  }
});

test('mouse movement deflects nearby flakes', () => {
  const e = new SnowEngine(400, 300, 10);
  e.configure({ snowfall: 1.0 });
  for (let i = 0; i < 30; i++) e.step(1 / 60);
  const flakes = e.snapshot().flakes;
  assert.ok(flakes.length > 5);
  const target = flakes[0];
  const initialVx = target.vx;
  // Move mouse rapidly toward the flake
  e.interactMouse(target.x - 10, target.y - 10, 0.5);
  e.interactMouse(target.x - 2, target.y - 2, 0.516);
  assert.notEqual(target.vx, initialVx, 'mouse swipe must alter flake velocity');
});

test('mouse sweeping across a snow pile reduces depth and drops clumps', () => {
  const e = new SnowEngine(400, 300, 11);
  const surface = { id: 'test-win', x: 50, y: 120, width: 200, height: 60, z: 1 };
  e.setSurfaces([surface], 0);
  e.deposit('test-win', 100, 30);
  const pileBefore = e.snapshot().piles[0].bins.reduce((a, b) => a + b, 0);
  assert.ok(pileBefore > 0);
  // Sweep mouse over the pile
  e.interactMouse(90, 118, 0.1);
  e.interactMouse(110, 118, 0.13);
  const pileAfter = e.snapshot().piles[0].bins.reduce((a, b) => a + b, 0);
  assert.ok(pileAfter < pileBefore, 'mouse sweep must reduce pile depth');
  assert.ok(e.snapshot().clumps.length > 0, 'mouse sweep must spawn falling clumps');
});

test('surfaces at or above top screen bezel (y <= 6) are filtered from accumulating snow', () => {
  const e = new SnowEngine(400, 300, 12);
  const topBezel = { id: 'top-frame', x: 0, y: 0, width: 400, height: 30, z: 1 };
  const validWin = { id: 'mid-win', x: 50, y: 80, width: 200, height: 100, z: 2 };
  e.setSurfaces([topBezel, validWin], 0);
  const piles = e.snapshot().piles;
  assert.equal(piles.length, 1);
  assert.equal(piles[0].surface.id, 'mid-win', 'top bezel surface must be ignored');
});

test('high-speed swept mouse stroke deflects particles along entire trajectory without tunneling', () => {
  const e = new SnowEngine(500, 400, 33);
  e.configure({ snowfall: 0, wind: 0 });
  // Manually insert three flakes: one near start, one at midpoint, one near end
  (e as any).flakes.push(
    { x: 100, y: 150, vx: 0, vy: 20, radius: 2, opacity: 0.9, mass: 1 },
    { x: 250, y: 150, vx: 0, vy: 20, radius: 2, opacity: 0.9, mass: 1 },
    { x: 400, y: 150, vx: 0, vy: 20, radius: 2, opacity: 0.9, mass: 1 }
  );

  // Fast mouse flick from x=50 to x=450 crossing y=150 in one step
  e.interactMouse(50, 150, 0.1);
  e.interactMouse(450, 150, 0.116);

  const flakes = e.snapshot().flakes;
  assert.equal(flakes.length, 3);
  // All three flakes, especially the midpoint at x=250, must have been deflected by the swept segment!
  assert.ok(Math.abs(flakes[0].vx) > 5 || Math.abs(flakes[0].vy - 20) > 5, 'start flake must be deflected');
  assert.ok(Math.abs(flakes[1].vx) > 10 || Math.abs(flakes[1].vy - 20) > 10, 'midpoint flake must be deflected without tunneling');
  assert.ok(Math.abs(flakes[2].vx) > 5 || Math.abs(flakes[2].vy - 20) > 5, 'end flake must be deflected');
});

test('stationary mouse continuously deflects falling flakes in step()', () => {
  const e = new SnowEngine(400, 400, 44);
  e.configure({ snowfall: 0, wind: 0 });
  // Place a flake directly above the stationary mouse
  (e as any).flakes.push({ x: 200, y: 180, vx: 0, vy: 30, radius: 2, opacity: 0.9, mass: 1 });
  // Place mouse at (200, 205)
  e.interactMouse(200, 205, 0.1);

  // Step the simulation while mouse is stationary
  e.step(1 / 60);
  e.step(1 / 60);

  const flake = e.snapshot().flakes[0];
  assert.ok(flake, 'flake must remain alive');
  // Flake directly above mouse must be deflected laterally by aerodynamic bow wave (vx != 0)
  assert.ok(Math.abs(flake.vx) > 1.0, `stationary cursor must deflect falling flakes laterally (vx: ${flake.vx})`);
});

