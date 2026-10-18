import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {THEMES} from '../src/themes.ts';
import {THEME_EFFECTS,effectFor} from '../src/theme-effects.ts';

const native=readFileSync(new URL('../src-tauri/android-native/SnowOverlayService.kt',import.meta.url),'utf8');
const web=readFileSync(new URL('../src/render.ts',import.meta.url),'utf8');

test('exactly 38 catalog themes have an explicit visual grammar',()=>{
 assert.equal(THEMES.length,38);
 assert.equal(Object.keys(THEME_EFFECTS).length,38);
 assert.deepEqual(Object.keys(THEME_EFFECTS).sort(),THEMES.map(x=>x.id).sort());
 const identities=new Set<string>();
 for(const t of THEMES){
   const profile=effectFor(t.id);
   assert.ok(profile.glyph&&profile.companion&&profile.atmosphere&&profile.drift,t.id);
   const signature=[profile.glyph,profile.companion,profile.atmosphere,profile.drift,profile.frequency,profile.speed].join(':');
   assert.ok(!identities.has(signature),t.id+' duplicates a complete visual signature');
   identities.add(signature);
 }
 assert.throws(()=>effectFor('not-a-real-theme'),/Missing independent theme visual/);
});

test('each of the 38 theme IDs is explicitly represented in Android native glyph mapping',()=>{
 const mapping=native.slice(native.indexOf('private fun themeGlyphs()'),native.indexOf('private fun particleMotion('));
 for(const theme of THEMES){
   assert.ok(mapping.includes('"'+theme.id+'"->'),theme.id+' missing from Android visual glyph mapping');
 }
 assert.match(native,/private fun particleMotion\(p:Particle/);
 assert.match(native,/private fun drawThemeParticle\(c:Canvas/);
 assert.match(native,/private fun drawAtmosphere\(c:Canvas/);
 assert.match(native,/drawThemeParticle\(c,p,tint,renderRadius,glyphs\)/);
});

test('different visual families are actual primitives, not snow or colored circles',()=>{
 for(const glyph of ['petal','butterfly','bee','maple','lightning','fog','gust','bat','wisp',
  'galaxy','crescent','egg','heart','flame','confetti','gift','lantern','snow-streak','meteor']){
   assert.ok(native.includes('"'+glyph+'"'),glyph+' missing Android renderer');
 }
 assert.match(web,/paintThemeParticle\(ctx,p,theme,scene\.time,width,height,visuals\.visualScale\?\?1\)/);
 assert.match(web,/paintThemeAtmosphere\(ctx,theme\.id,width,height,visuals\.reduceMotion/);
});

test('snow accumulation is isolated from non-snow scene families',()=>{
 for(const t of THEMES){
   if(t.particle!=='snow') assert.equal(t.accumulating,false,t.id);
 }
 assert.match(native,/if\(mode=="snow" && accumulating && beforeY<h-3f && p\.y>=h-3f\)/);
});

test('particle scene identities include distinct motion for representative themes',()=>{
 assert.notEqual(effectFor('spring-petals').glyph,effectFor('summer-fireflies').glyph);
 assert.notEqual(effectFor('weather-drizzle').glyph,effectFor('weather-thunder').glyph);
 assert.notEqual(effectFor('ambient-embers').glyph,effectFor('halloween-embers').glyph);
 assert.notEqual(effectFor('advent-1').glyph,effectFor('advent-2').glyph);
 assert.notEqual(effectFor('winter-snow').drift,effectFor('winter-blizzard').drift);
 assert.notEqual(effectFor('weather-fog').atmosphere,effectFor('autumn-mist').atmosphere);
});
