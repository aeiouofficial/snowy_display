import test from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, resolveTheme, calendarTheme, adventWeek } from '../src/themes.ts';
import { normalizeDesktop, localViewport, worldSurfaces, type Display } from '../src/desktop-world.ts';

const screens: Display[] = [
 {id:'a',x:0,y:0,width:2560,height:1080,scaleFactor:1},
 {id:'b',x:2560,y:0,width:1536,height:864,scaleFactor:1.25},
];

test('virtual desktop keeps physically adjacent monitor edges identical, even at mixed DPI', () => {
 const world = normalizeDesktop(screens);
 assert.deepEqual({x:world.x,y:world.y,width:world.width,height:world.height},{x:0,y:0,width:4096,height:1080});
 const left=localViewport(world,screens[0]);
 const right=localViewport(world,screens[1]);
 assert.equal(left.x+left.width,right.x,'particle coordinate at shared edge is identical');
 assert.equal(right.scaleFactor,1.25);
});

test('negative monitor origins, vertical stacking and monitor layout reorder stay continuous', () => {
 const displays:Display[]=[
  {id:'right',x:800,y:-120,width:1920,height:1080,scaleFactor:1},
  {id:'left',x:-640,y:80,width:1440,height:900,scaleFactor:1.5},
 ];
 const world=normalizeDesktop(displays);
 assert.deepEqual({x:world.x,y:world.y,width:world.width,height:world.height},{x:-640,y:-120,width:3360,height:1100});
 const points=[localViewport(world,displays[0]),localViewport(world,displays[1])];
 assert.equal(points[1].x+points[1].width,points[0].x);
 assert.deepEqual(normalizeDesktop([...displays].reverse()),world);
});

test('window crossing monitor boundary is represented once in physical virtual coordinates', () => {
 const world=normalizeDesktop(screens);
 const surfaces=worldSurfaces([{id:'cross',x:2500,y:130,width:220,height:90,z:4}],world,screens);
 assert.equal(surfaces.length,1);
 assert.equal(surfaces[0].x,2500);
 assert.equal(surfaces[0].width,220);
 assert.equal(surfaces[0].noAccumulation,false);
});

test('maximized second-monitor window occludes others but never piles snow at monitor bezel', () => {
 const world=normalizeDesktop(screens);
 const surface=worldSurfaces([{id:'max',x:2560,y:0,width:1536,height:864,z:5}],world,screens)[0];
 assert.equal(surface.noAccumulation,true);
});

test('theme catalog has unique ids, all four advent editions, and nonsnow effects never accumulate', () => {
 assert.ok(THEMES.length>=38,'all seasons and supplemental weather/events must be present');
 assert.equal(new Set(THEMES.map(t=>t.id)).size,THEMES.length);
 for (const theme of THEMES) {
  assert.ok(theme.name && theme.description && theme.category);
  assert.equal(theme.accumulating,theme.particle==='snow',theme.id);
 }
 for(let i=1;i<=4;i++) assert.equal(resolveTheme('advent-'+i).name.includes('Advent'),true);
 assert.equal(resolveTheme('invalid').id,'winter-snow');
});

test('automatic calendar themes prioritize advent, christmas, halloween and new year', () => {
 assert.equal(calendarTheme(new Date(2026,9,31)),'halloween-bats');
 assert.equal(adventWeek(new Date(2026,10,29)),1);
 assert.equal(calendarTheme(new Date(2026,10,29)),'advent-1');
 assert.equal(calendarTheme(new Date(2026,11,20)),'advent-4');
 assert.equal(calendarTheme(new Date(2026,11,24)),'christmas-snow');
 assert.equal(calendarTheme(new Date(2026,11,31)),'newyear-confetti');
 assert.equal(calendarTheme(new Date(2026,3,13)),'spring-petals');
});
