import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SnowEngine } from '../src/physics.ts';
import { normalizeDesktop,localViewport,viewportIntersects,PERFORMANCE } from '../src/desktop-world.ts';

test('one global particle has continuous coordinates at the physical seam',()=>{
 const monitors=[
  {id:'primary',x:0,y:0,width:2560,height:1080,scaleFactor:1},
  {id:'secondary',x:2560,y:0,width:1536,height:864,scaleFactor:1.25},
 ];
 const world=normalizeDesktop(monitors);
 const left=localViewport(world,monitors[0]), right=localViewport(world,monitors[1]);
 for(const x of [2550,2559,2560,2561,2570]) {
  const onLeft=viewportIntersects(left,x,240,0,0);
  const onRight=viewportIntersects(right,x,240,0,0);
  assert.equal(onLeft||onRight,true);
 }
 assert.equal(left.x+left.width,right.x);
});

test('eco mode reduces both flake budget and monitor paint frequency',()=>{
 assert.ok(PERFORMANCE.eco.particles<PERFORMANCE.balanced.particles);
 assert.ok(PERFORMANCE.balanced.particles<PERFORMANCE.high.particles);
 assert.ok(PERFORMANCE.eco.fps<PERFORMANCE.balanced.fps);
 assert.ok(PERFORMANCE.balanced.fps<PERFORMANCE.high.fps);
 const e=new SnowEngine(512,300);
 e.setParticleLimit(PERFORMANCE.eco.particles);
 for(let i=0;i<800;i++)e.step(1/30);
 assert.ok(e.snapshot().flakes.length<=PERFORMANCE.eco.particles);
});

test('airborne seasonal effects never accumulate on title bars',()=>{
 for(const themeId of ['spring-petals','spring-rain','autumn-leaves','halloween-bats','newyear-confetti']) {
  const e=new SnowEngine(320,240,55);
  e.setTheme(themeId);
  e.setSurfaces([{id:'window',x:10,y:130,width:300,height:85,z:3}]);
  for(let i=0;i<240;i++)e.step(1/60);
  assert.equal(e.snapshot().clumps.length,0,themeId);
  assert.ok(e.snapshot().piles.every(p=>p.bins.every(b=>b===0)),themeId);
 }
});

test('only the overlay coordinator polls native geometry while followers render snapshots',()=>{
 const source=readFileSync(new URL('../src/overlay.ts',import.meta.url),'utf8');
 assert.match(source,/isCoordinator=ownWindow\.label==='snow-overlay-0'/);
 assert.match(source,/new BroadcastChannel/);
 assert.match(source,/type:'scene'/);
 assert.match(source,/if\(isCoordinator&&channel&&now-lastSend/);
 assert.match(source,/sharedScene=packet\.scene/);
 assert.match(source,/drawScene\(ctx,lastScene,sourceWorld\.width,sourceWorld\.height/);
 assert.match(source,/if\(now-lastPoll>=profile\.pollMs\)/);
});
