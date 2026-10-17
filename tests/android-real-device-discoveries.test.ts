import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(file:string)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const studio=source('src/studio-ui.ts');
const native=source('src-tauri/android-native/SnowOverlayService.kt');

test('category and query changes reset only the Scenes inner scroll position',()=>{
  assert.match(studio,/category=label;[\s\S]*?drawCards\(\);\s*byId\('panel-scenes'\)\.scrollTop=0;/);
  assert.match(studio,/search\.addEventListener\('input',[\s\S]*?drawCards\(\);\s*byId\('panel-scenes'\)\.scrollTop=0;/);
  assert.equal((studio.match(/byId\('panel-scenes'\)\.scrollTop=0;/g)||[]).length,2);
  assert.doesNotMatch(studio,/window\.scrollTo\(0,0\)/);
});

test('native organic shapes use legible device-scale silhouettes with real flutter rotation',()=>{
  assert.match(native,/"petal","maple"->\(renderRadius\*2\.6f\)\.coerceIn\(1f,13f\)/);
  assert.match(native,/"butterfly","bee","bird"->\(renderRadius\*2\.2f\)\.coerceIn\(1f,12f\)/);
  assert.match(native,/"firefly","sun-dust","flame","wisp"->\(renderRadius\*1\.7f\)/);
  assert.match(native,/"petal"->sin\(elapsed\*1\.6f\+p\.phase\)\*62f/);
  assert.match(native,/"maple","needle"->sin\(elapsed\*1\.2f\+p\.phase\)\*83f/);
  assert.match(native,/c\.rotate\(rotation,p\.x,p\.y\)/);
  assert.match(native,/uniqueGlyph\(c,glyph,p\.x,p\.y,formSize,tint,p\.phase\)/);
});

test('legibility improvements keep native battery and compositing safeguards',()=>{
  assert.match(native,/val limit=when\(quality\)\{"eco"->12;"high"->40;else->24\}/);
  assert.match(native,/val baselineFps=when\(quality\)\{"eco"->8;"high"->20;else->12\}/);
  assert.match(native,/val fps=if\(powerConstrained\)min\(4,baselineFps\) else baselineFps/);
  assert.match(native,/val renderRadius=\(p\.r\*scale\)\.coerceIn\(\.7f,8f\)/);
});
