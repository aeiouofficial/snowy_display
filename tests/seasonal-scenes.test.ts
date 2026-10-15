import test from 'node:test';
import assert from 'node:assert/strict';
import { SnowEngine } from '../src/physics.ts';
import { THEMES, resolveTheme } from '../src/themes.ts';
import { sceneFeatures, sceneMotifs } from '../src/seasonal-content.ts';
import { DEFAULT_APP_SETTINGS, loadSettings } from '../src/settings.ts';

const windowSurface = {id:'road',x:30,y:185,width:430,height:75,z:2};
function stocked() {
 const e=new SnowEngine(520,280,102);
 e.configure({snowfall:0,wind:0});
 e.setSurfaces([windowSurface]);
 for(let x=70;x<418;x+=7)e.deposit('road',x,5);
 return e;
}
const sum=(e:SnowEngine)=>e.snapshot().piles.reduce((a,p)=>a+p.bins.reduce((b,n)=>b+n,0),0);

test('all four seasons and weather/event content packs expose nonparticle animated motifs',()=>{
 for(const category of ['Winter','Spring','Summer','Autumn','Events','Atmosphere','Weather']){
  const themes=THEMES.filter(t=>t.category===category);
  assert.ok(themes.length>=2,category);
  for(const t of themes) {
   const features=sceneFeatures(t.id);
   assert.ok(features.length>0,`${t.id} has no scenery beyond weather particles`);
  }
 }
 for(const name of ['winter-snow','spring-petals','summer-fireflies','autumn-leaves']){
  assert.ok(sceneMotifs(name,640,400,20,1).length>0,name);
 }
});
test('four Advent scenes animate exactly 1, 2, 3, 4 candles',()=>{
 for(let week=1;week<=4;week++){
  const m=sceneMotifs('advent-'+week,1080,650,3.2,1);
  assert.equal(m.filter(o=>o.kind==='candle').length,week);
 }
});
test('scene objects are deterministic, bounded and honor reduced decoration density',()=>{
 const a=sceneMotifs('halloween-bats',2560,1080,43,1);
 const b=sceneMotifs('halloween-bats',2560,1080,43,1);
 assert.deepEqual(a,b);
 assert.ok(a.some(x=>x.kind==='bat'||x.kind==='pumpkin'));
 assert.ok(a.every(x=>Number.isFinite(x.x)&&Number.isFinite(x.y)&&x.x>=-64&&x.x<=2624));
 assert.ok(sceneMotifs('halloween-bats',2560,1080,43,0).length===0);
 assert.ok(sceneMotifs('halloween-bats',2560,1080,43,.3).length<a.length);
});
test('automatic snowplow moves along exposed snowy ledge and redistributes snow mass',()=>{
 const e=stocked(); const before=sum(e);
 e.configureActors({autoPlows:true,plowInterval:7});
 for(let i=0;i<12*30;i++)e.step(1/30);
 assert.ok(e.snapshot().vehicles.length>0,'expected moving plow on a snowy surface');
 const a=e.snapshot().vehicles[0];
 assert.equal(a.surfaceId,'road');
 assert.ok(a.x>=windowSurface.x-50&&a.x<=windowSurface.x+windowSurface.width+50);
 assert.ok(Math.abs(sum(e)-before)<.06,'plowing may not manufacture or delete snow');
 const initialX=a.x;for(let i=0;i<25;i++)e.step(1/30);
 assert.notEqual(e.snapshot().vehicles[0].x,initialX);
});
test('auto plows are winter-only, optional, and cleared on window disappearance',()=>{
 const e=stocked();
 e.configureActors({autoPlows:false,plowInterval:7});
 for(let i=0;i<400;i++)e.step(1/30);
 assert.equal(e.snapshot().vehicles.length,0);
 e.configureActors({autoPlows:true,plowInterval:7});
 for(let i=0;i<240;i++)e.step(1/30);
 assert.ok(e.snapshot().vehicles.length>0);
 e.setSurfaces([]);
 assert.equal(e.snapshot().vehicles.length,0);
 e.setTheme('spring-rain');
 e.setSurfaces([windowSurface]);
 for(let i=0;i<400;i++)e.step(1/30);
 assert.equal(e.snapshot().vehicles.length,0);
});
test('new settings default to minimal animation load and preserve legacy saved values',()=>{
 assert.equal(DEFAULT_APP_SETTINGS.autoPlows,false);
 assert.ok(DEFAULT_APP_SETTINGS.decorationDensity>0);
 assert.ok(DEFAULT_APP_SETTINGS.plowInterval>=7);
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>JSON.stringify({wind:.71,performanceMode:'eco'})}});
 try{
  const loaded=loadSettings();
  assert.equal(loaded.wind,.71);
  assert.equal(loaded.performanceMode,'eco');
  assert.equal(loaded.autoPlows,false);
  assert.ok(loaded.animationsEnabled);
 }finally{
  if(original)Object.defineProperty(globalThis,'localStorage',original);
  else Reflect.deleteProperty(globalThis,'localStorage');
 }
});
