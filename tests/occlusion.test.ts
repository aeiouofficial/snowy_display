import test from 'node:test';
import assert from 'node:assert/strict';
import { SnowEngine } from '../src/physics.ts';
import { drawSnow } from '../src/render.ts';

const rear = { id: 'rear', x: 0, y: 140, width: 140, height: 90, z: 1 };
const occluder = { id: 'front', x: 22, y: 90, width: 95, height: 150, z: 2 };

test('depositing on a visible edge cannot spill sideways into a hidden neighbor bin', () => {
  const engine = new SnowEngine(300, 250);
  engine.configure({ snowfall: 0 });
  engine.setSurfaces([rear, occluder], 0);
  assert.equal(engine.isExposed(rear, 20), true);
  assert.equal(engine.isExposed(rear, 24.5), false);
  assert.equal(engine.deposit('rear', 20, 20), true);
  assert.equal(engine.snapshot().piles.find(p => p.surface.id === 'rear')!.bins[3], 0,
    'snow must never leak into a bin with an occluded top edge');
});

test('occluding an existing pile cannot generate falling ghost snow on the foreground window', () => {
  const engine = new SnowEngine(300, 250);
  engine.configure({ snowfall: 0 });
  engine.setSurfaces([rear], 0);
  engine.deposit('rear', 60, 24);
  const mass = engine.snapshot().piles[0].bins.reduce((n, x) => n + x, 0);
  engine.setSurfaces([rear, occluder], .2);
  assert.equal(engine.snapshot().clumps.length, 0, 'covering a pile must not shed it as new particles');
  const covered = engine.snapshot().piles.find(p => p.surface.id === 'rear')!;
  assert.ok(covered.bins.reduce((n,x)=>n+x,0) >= mass - 0.001, 'hidden snow remains associated with its own window');
  assert.equal(engine.deposit('rear', 60, 10), false);
  engine.setSurfaces([rear], .4);
  assert.ok(engine.snapshot().piles[0].bins.some(n => n > 0), 'original pile can reappear when its window is uncovered');
});

test('minimizing a tracked window clears its pile without transferring ghost clumps to underlying windows', () => {
  const engine = new SnowEngine(300, 280);
  const underneath = { ...rear, id: 'underneath', y: 220, z: 0 };
  engine.setSurfaces([rear, underneath], 0);
  engine.deposit('rear', 60, 30);
  engine.setSurfaces([{...rear, hidden: true}, underneath], .2);
  assert.equal(engine.snapshot().piles.some(p=>p.surface.id==='rear'), false);
  assert.equal(engine.snapshot().surfaces.some(s=>s.id==='rear'), false);
  assert.equal(engine.snapshot().clumps.length, 0);
  for (let i=0;i<180;i++) engine.step(1/60);
  assert.ok(engine.snapshot().piles.find(p=>p.surface.id==='underneath')!.bins.every(b=>b===0),
    'minimizing must not rain snow onto another app');
});

test('renderer clips underlying snow crests against a foreground window even above its exposed edge', () => {
  const engine = new SnowEngine(300, 260);
  engine.configure({ snowfall: 0 });
  const front = { id: 'nearby-front', x: 30, y: 95, width: 90, height: 43, z: 2 };
  engine.setSurfaces([rear, front], 0);
  assert.equal(engine.isExposed(rear, 60), true, 'rear edge is only 2px below the front bottom');
  engine.deposit('rear', 60, 50);
  const records: Array<{name:string; args:unknown[]}> = [];
  const record = (name:string) => (...args:unknown[]) => { records.push({name, args}); };
  const gradient = {addColorStop:()=>{}};
  const ctx = {
    clearRect: record('clearRect'), rect: record('rect'), clip: record('clip'),
    beginPath:record('beginPath'),save:record('save'),restore:record('restore'),
    createLinearGradient:()=>gradient, createRadialGradient:()=>gradient,
    fill:record('fill'),stroke:record('stroke'),arc:record('arc'),translate:record('translate'),
  } as unknown as CanvasRenderingContext2D;
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'Path2D');
  class MockPath {moveTo(){} lineTo(){} quadraticCurveTo(){} closePath(){}}
  Object.defineProperty(globalThis,'Path2D',{configurable:true,value:MockPath});
  try { drawSnow(ctx, engine, false, 'winter-snow', {showSceneObjects:false}); }
  finally { if(previous) Object.defineProperty(globalThis,'Path2D',previous); else Reflect.deleteProperty(globalThis,'Path2D'); }
  assert.ok(records.some(r => r.name === 'rect' && r.args[0] === front.x && r.args[1] === front.y),
    'foreground bounds must be registered as a snow-pile clipping hole');
  assert.ok(records.some(r => r.name === 'clip' && r.args[0] === 'evenodd'),
    'snow piles (not falling flakes) must be clipped out of the foreground area');
});

test('intersecting foreground windows cannot toggle the rear snow mask back on', () => {
  const e = new SnowEngine(300, 260);
  e.configure({ snowfall: 0 });
  const frontA = { id: 'frontA', x: 30, y: 95, width: 90, height: 43, z: 2 };
  const frontB = { id: 'frontB', x: 50, y: 96, width: 90, height: 42, z: 3 };
  e.setSurfaces([rear, frontA, frontB], 0);
  e.deposit('rear', 60, 50);
  const clipRectCounts: number[] = [];
  let rectCount = 0;
  const noop = () => {};
  const gradient = { addColorStop: noop };
  const ctx = {
    clearRect: noop, save: noop, restore: noop, fill: noop, stroke: noop,
    beginPath: () => { rectCount = 0; },
    rect: () => { rectCount++; },
    clip: () => { clipRectCounts.push(rectCount); },
    arc: noop, translate: noop,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  } as unknown as CanvasRenderingContext2D;
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Path2D');
  class MockPath { moveTo(){} lineTo(){} quadraticCurveTo(){} closePath(){} }
  Object.defineProperty(globalThis, 'Path2D', { configurable: true, value: MockPath });
  try { drawSnow(ctx, e, false, 'winter-snow', {showSceneObjects:false}); }
  finally {
    if (original) Object.defineProperty(globalThis, 'Path2D', original);
    else Reflect.deleteProperty(globalThis, 'Path2D');
  }
  assert.ok(clipRectCounts.length >= 2, 'both overlapping foreground exclusions must be applied');
  assert.ok(clipRectCounts.every(n => n === 2),
    'each even-odd clip must have one outer rectangle and ONE exclusion, or intersections toggle back on');
});
