import test from 'node:test';
import assert from 'node:assert/strict';
import { SnowEngine, type Surface } from '../src/physics.ts';

test('cached occlusion intervals exactly match reference z-order even for partially-covered bins',()=>{
  const engine=new SnowEngine(900,700,43);
  const windows:Surface[]=[
    {id:'back',x:17,y:190,width:701,height:350,z:1},
    {id:'partialA',x:112.3,y:65,width:132.7,height:170,z:3},
    {id:'partialB',x:230,y:43,width:190,height:260,z:4},
    {id:'partialC',x:418.2,y:178,width:67.9,height:180,z:2},
    {id:'below',x:40,y:220,width:500,height:390,z:6},
  ];
  engine.setSurfaces(windows,0);
  const reference=(s:Surface,x:number)=>x>=s.x&&x<s.x+s.width&&!windows.some(other=>other.z>s.z&&
    x>=other.x&&x<other.x+other.width&&other.y<=s.y&&other.y+other.height>s.y);
  for(const s of windows) {
    for(let x=s.x-3;x<=s.x+s.width+3;x+=.7)
      assert.equal(engine.isExposed(s,x),reference(s,x),`${s.id}@${x.toFixed(2)}`);
  }
  const revised=windows.map(s=>s.id==='partialA'?{...s,x:520}:s);
  engine.setSurfaces(revised,.23);
  for(const s of revised)for(let x=s.x+1;x<s.x+s.width;x+=1.7) {
    const expected=x>=s.x&&x<s.x+s.width&&!revised.some(other=>other.z>s.z&&
      x>=other.x&&x<other.x+other.width&&other.y<=s.y&&other.y+other.height>s.y);
    assert.equal(engine.isExposed(s,x),expected);
  }
});
test('render snapshots include exact cached per-bin visibility so followers need not repeat window scanning',()=>{
 const e=new SnowEngine(400,300);
 e.setSurfaces([
  {id:'rear',x:0,y:160,width:210,height:80,z:1},
  {id:'cover',x:100,y:60,width:95,height:180,z:3},
 ]);
 const pile=e.snapshot().piles.find(p=>p.surface.id==='rear')!;
 assert.equal(pile.exposed!.length,pile.bins.length);
 assert.equal(pile.exposed![0],true);
 assert.equal(pile.exposed![16],false);
});
