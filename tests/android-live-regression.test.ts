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

test('Object size affects every native particle family',()=>{
 assert.match(native,/val renderRadius=\(p\.r\*scale\)\.coerceIn\(\.7f,8f\)/);
 for(const mode of ['rain','petals','leaves','bats','fireflies','stars','confetti']){
   assert.match(native,new RegExp('"'+mode+'"->[\\s\\S]{0,190}renderRadius'),mode);
 }
 assert.match(native,/else->disc\(c,p\.x,p\.y,renderRadius,tint,195\)/);
});

test('Android bats and fireflies have distinct high-visibility rendering',()=>{
 assert.match(native,/0xffb5a2d2\.toInt\(\),225/);
 assert.match(native,/"bats"->drawMotif\(c,"bat",p\.x,p\.y,5f\+renderRadius\*4f/);
 assert.match(native,/disc\(c,p\.x,p\.y,renderRadius\*2\.7f,tint,42\)/);
 assert.match(native,/val maxDraw=\(5\*density\)\.toInt\(\)\.coerceIn\(0,5\)/);
});
