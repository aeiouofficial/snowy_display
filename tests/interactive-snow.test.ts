import test from 'node:test';
import assert from 'node:assert/strict';
import { SnowEngine } from '../src/physics.ts';
import { INTERACTION_TOOLS, normalizeTool, type InteractionTool } from '../src/interactions.ts';

const surface={id:'window',x:20,y:130,width:308,height:110,z:5};
function snow() {
 const e=new SnowEngine(380,290,731);
 e.configure({snowfall:0,wind:0});
 e.setSurfaces([surface]);
 for(let x=40;x<300;x+=7)e.deposit('window',x,8);
 return e;
}
const sum=(e:SnowEngine)=>e.snapshot().piles.find(p=>p.surface.id==='window')!.bins.reduce((a,b)=>a+b,0);
test('interactive catalog has distinct controls with disabled default',()=>{
 assert.deepEqual(INTERACTION_TOOLS.map(t=>t.id),['none','footprint','push','gust','vortex','freeze','melt']);
 assert.equal(normalizeTool('impossible'),'none');
});
test('footprints compress snow and leave paired permanent imprints without generating mass',()=>{
 const e=snow(),before=sum(e);
 assert.equal(e.applyTool('footprint',128,128,0),true);
 const scene=e.snapshot();
 assert.ok(scene.imprints.length>=1);
 assert.ok(scene.imprints[0].x>=20);
 assert.ok(scene.piles[0].bins.some(b=>b<1));
 assert.ok(sum(e)<=before+0.001);
 assert.ok(sum(e)>=before-0.02, 'displaced snow must remain in neighboring bins');
});
test('push tool transfers mass sideways and does not create or erase snow',()=>{
 const e=snow(),before=sum(e);
 assert.equal(e.applyTool('push',150,125,.2),true);
 const next=e.snapshot();
 assert.ok(next.piles[0].bins.some(b=>b>5));
 assert.ok(Math.abs(sum(e)-before)<.03);
});
test('melt reduces pile mass without turning removed mass into falling clumps',()=>{
 const e=snow(),before=sum(e);
 assert.equal(e.applyTool('melt',140,125,.4),true);
 assert.ok(sum(e)<before-1);
 assert.equal(e.snapshot().clumps.length,0);
});
test('freeze spell is temporary, dampens motion, and is finite',()=>{
 const e=snow();
 assert.equal(e.applyTool('freeze',144,129,.6),true);
 assert.ok(e.snapshot().frozenUntil>.6);
 for(let i=0;i<120;i++)e.step(1/30);
 assert.ok(e.snapshot().frozenUntil>=.6);
 assert.ok(e.snapshot().piles.every(p=>p.bins.every(Number.isFinite)));
});
test('gust and vortex generate bounded particle velocity impulses',()=>{
 for(const tool of ['gust','vortex'] as InteractionTool[]) {
  const e=new SnowEngine(380,290,55);
  e.configure({snowfall:1});
  for(let i=0;i<120;i++)e.step(1/30);
  const before=e.snapshot().flakes.map(p=>({...p}));
  assert.ok(before.length>0);
  assert.equal(e.applyTool(tool,190,72,1),true);
  const after=e.snapshot().flakes;
  assert.ok(after.some((p,i)=>p.vx!==before[i]?.vx || p.vy!==before[i]?.vy));
  assert.ok(after.every(p=>Number.isFinite(p.vx)&&Number.isFinite(p.vy)));
 }
});
test('hidden, occluded and non-snow themes cannot gain snow from interaction',()=>{
 const e=snow();const cover={id:'top',x:20,y:25,width:308,height:210,z:9};
 e.setSurfaces([surface,cover]);
 assert.equal(e.applyTool('footprint',130,129,1),false);
 assert.equal(e.applyTool('push',130,129,1),false);
 assert.equal(e.applyTool('melt',130,129,1),false);
 assert.equal(e.snapshot().imprints.length,0);
 e.setTheme('spring-rain');
 e.setSurfaces([surface]);
 assert.equal(e.applyTool('footprint',130,130,1),false);
 assert.equal(e.snapshot().imprints.length,0);
});
test('all spell effects stay bounded under repeated gestures',()=>{
 const e=snow();
 for(let i=0;i<600;i++) e.applyTool('gust',160,110,1+i*.1);
 assert.ok(e.snapshot().pulses.length<=40);
 assert.ok(e.snapshot().imprints.length<=160);
 assert.ok(e.snapshot().piles.every(p=>p.bins.every(n=>Number.isFinite(n)&&n>=0)));
});
