import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const file=(name:string)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const app=file('src/app.ts');
const studio=file('src/studio-ui.ts');
const native=file('src-tauri/android-native/SnowOverlayService.kt');

test('Android descriptions do not claim unsupported window-edge physics',()=>{
 assert.match(app,/Android snow settles at the bottom of the display/);
 assert.match(app,/Android cannot inspect other apps’ window edges/);
 assert.match(app,/ANDROID SCREEN/);
 assert.match(app,/system overlay never intercepts taps|weather over other apps remains click-through/);
 assert.match(app,/On Android the snowplow works on bottom-edge accumulated snow/);
});

test('Performance labels match the actual Android rendering frame caps',()=>{
 assert.match(studio,/Up to 8 FPS · low power/);
 assert.match(studio,/Up to 12 FPS · stable/);
 assert.match(studio,/Up to 20 FPS · capped/);
 assert.match(native,/val baselineFps=when\(quality\)\{"eco"->8;"high"->20;else->12\}/);
 assert.match(native,/val fps=if\(powerConstrained\)min\(4,baselineFps\) else baselineFps/);
});

test('Object size affects every native visual glyph, without inflating the particle budget',()=>{
 assert.match(native,/val renderRadius=\(p\.r\*scale\)\.coerceIn\(\.7f,8f\)/);
 assert.match(native,/drawThemeParticle\(c,p,tint,renderRadius,glyphs\)/);
 assert.match(native,/uniqueGlyph\(c,glyph,p\.x,p\.y,formSize,tint,p\.phase\)/);
 assert.match(native,/val limit=when\(quality\)\{"eco"->12;"high"->40;else->24\}/);
});


test('Android bats and fireflies have distinct high-visibility rendering',()=>{
 assert.match(native,/0xffb5a2d2\.toInt\(\),225/);
 assert.match(native,/"bat"->drawMotif\(c,"bat",x,y,s0\*1\.3f/);
 assert.match(native,/"firefly","sun-dust"->\{/);
 assert.match(native,/if\(kind=="firefly"\)\{/);
 assert.match(native,/oval\(c,x-s0\*\.45f,y-s0\*\.35f/);
 assert.doesNotMatch(native,/disc\(c,x,y,s0\*3\.4f,tint,35\)/);
 assert.match(native,/val maxDraw=\(5\*density\)\.toInt\(\)\.coerceIn\(0,5\)/);
});
