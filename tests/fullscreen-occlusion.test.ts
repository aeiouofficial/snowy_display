import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SnowEngine } from '../src/physics.ts';

test('maximized upper window occludes underlying snow without accumulating at display bezel', () => {
  const e = new SnowEngine(600, 420);
  e.configure({ snowfall: 0 });
  const rear = { id: 'rear', x: 60, y: 160, width: 300, height: 180, z: 1 };
  const maximized = { id: 'maximized', x: 0, y: -8, width: 600, height: 428, z: 8 };
  e.setSurfaces([rear], 0);
  assert.equal(e.deposit('rear', 150, 35), true);
  e.setSurfaces([rear, maximized], .1);
  assert.equal(e.isExposed(rear, 150), false, 'maximized window must occlude rear snow');
  assert.equal(e.deposit('rear', 150, 10), false, 'covered window must not keep accumulating');
  assert.equal(e.snapshot().piles.some(p => p.surface.id === 'maximized'), false,
    'no top-bezel snow buildup on maximized windows');
  assert.ok(e.snapshot().surfaces.some(s => s.id === 'maximized'),
    'maximized windows must REMAIN as occluders in the render snapshot');
});

test('closing or temporarily losing a tracked window cannot shower ghost snow onto underlying windows', () => {
  const e = new SnowEngine(500, 360);
  e.configure({ snowfall: 0 });
  const upper = { id: 'upper', x: 40, y: 80, width: 210, height: 95, z: 3 };
  const lower = { id: 'lower', x: 30, y: 260, width: 280, height: 80, z: 1 };
  e.setSurfaces([upper, lower], 0);
  e.deposit('upper', 130, 50);
  e.setSurfaces([lower], .15);
  assert.equal(e.snapshot().clumps.length, 0, 'disappearing window may not emit new snow');
  for(let n=0; n<160; n++) e.step(1/60);
  assert.ok(e.snapshot().piles.find(p => p.surface.id === 'lower')!.bins.every(v => v === 0),
    'underlying window must remain free of orphan snow');
});

test('overlay driver retains top-bezel / fullscreen windows as occluders', () => {
  const source = readFileSync(new URL('../src/overlay.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /s\.y\s*>\s*6/, 'fullscreen windows must not be filtered out in overlay');
});
