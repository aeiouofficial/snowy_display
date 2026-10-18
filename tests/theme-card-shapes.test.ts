import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {THEMES} from '../src/themes.ts';
import {THEME_EFFECTS} from '../src/theme-effects.ts';
const studio=readFileSync(new URL('../src/studio-ui.ts',import.meta.url),'utf8');
const web=readFileSync(new URL('../src/theme-effects.ts',import.meta.url),'utf8');
const android=readFileSync(new URL('../src-tauri/android-native/SnowOverlayService.kt',import.meta.url),'utf8');
test('each of 38 catalog tiles paints its actual effect geometry, not its category glyph',()=>{
 assert.equal(THEMES.length,38);
 assert.equal(Object.keys(THEME_EFFECTS).length,38);
 assert.match(studio,/paintThemeThumbnail\(thumbnail,theme\)/);
 assert.doesNotMatch(studio,/symbol\.textContent=symbols\[theme\.category\]/);
 assert.match(web,/paintThemeParticle\(ctx,particle\(34,34,6\.7\),theme,0,72,64,1\.3,glyph,true\)/);
});
test('native silhouettes have legible nonzero physical-pixel floors independent of glow',()=>{
 assert.match(android,/val s0=s\.coerceIn\(1\.25f,30f\)/);
 for(const token of ['petal','maple','butterfly','bee','bird','bat','heart','egg','lantern','flame','star','crescent']){
  assert.ok(android.includes('"'+token+'"'),token);
 }
 assert.match(android,/"petal","maple"->\(10f\+renderRadius\*2\.6f\)\.coerceIn\(12f,29f\)/);
 assert.match(android,/"bat"->\(11f\+renderRadius\*1\.9f\)\.coerceIn\(13f,28f\)/);
 assert.match(android,/"star"->\{\s*val star=Path\(\)/);
 assert.match(android,/outer\.op\(cutout,Path\.Op\.DIFFERENCE\)/);
});
test('fireflies use a real luminous point, while larger petal and bat objects retain contours',()=>{
 assert.match(web,/const minimum=fine\.has\(glyph\)\?2\.2:silhouettes\.has\(glyph\)\?9:5/);
 assert.match(android,/"firefly","sun-dust"->\(2\.5f\+renderRadius\*\.8f\)/);
 assert.match(web,/case 'petal':petal\(c,r\)/);
 assert.match(web,/case 'bat':bat\(c,r,phase\)/);
});
