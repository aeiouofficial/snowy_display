import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sceneFeatures} from '../src/seasonal-content.ts';
const app=readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
const native=readFileSync(new URL('../src-tauri/android-native/SnowOverlayService.kt',import.meta.url),'utf8');
test('natural snow and blizzard have no pine tree decorations',()=>{
 for(const theme of ['winter-snow','winter-blizzard','winter-northernlights','christmas-snow'])
  assert.ok(!sceneFeatures(theme).includes('pine'),theme);
 assert.ok(sceneFeatures('winter-forest').includes('pine'),'forest scene remains explicit');
});
test('native full-screen Android overlay limits props to subtle weather accents',()=>{
 assert.match(native,/features=motifs\(\)\.filter\{it in setOf\(/);
 // A handful of themed accents are permitted, but default snow must remain clear.
 assert.match(native,/maxDraw=\(5\*density\)\.toInt\(\)\.coerceIn\(0,5\)/);
 assert.doesNotMatch(native,/"winter-snow"->listOf\("pine"\)/);
 assert.match(native,/"winter-snow"->listOf\("crystal"\)/);
 assert.doesNotMatch(native,/val features=motifs\(\)\n  if\(features\.isEmpty\(\)\)/);
});
test('Android rendering budgets protect CPU and battery',()=>{
 assert.match(native,/val limit=when\(quality\)\{"eco"->12;"high"->40;else->24\}/);
 assert.match(native,/val baselineFps=when\(quality\)\{"eco"->8;"high"->20;else->12\}/);
 assert.match(native,/if\(powerConstrained\)min\(4,baselineFps\)/);
 assert.match(native,/if\(!active\|\|powerPaused\|\|!enabled\)return/);
 assert.match(native,/intent\?\.action==UPDATE && overlay!=null/);
 assert.match(app,/const previewFPS=isAndroid/);
 assert.match(app,/Math\.min\(64,selectedBudget\)/);
 assert.match(app,/now-lastSurfaceSync>=350/);
 assert.match(app,/nativeUpdateTimer=setTimeout/);
 assert.match(app,/document\.hidden \|\| !config\.enabled/);
});
test('preview remains outside each independently scrolling Android settings section',()=>{
 assert.match(app,/shell\.insertBefore\(visual,scenesPanel\)/);
 assert.doesNotMatch(app,/scenesPanel\.prepend\(visual\)/);
 assert.match(css,/grid-template-rows:auto auto minmax\(0,1fr\) auto/);
 assert.match(css,/html\.android-ui \.studio-panel\{[\s\S]*?overflow-y:auto/);
});
test('scene changes show particles immediately instead of spawning invisible offscreen for minutes',()=>{
 assert.match(native,/if\(mode=="embers"\)h\+rng\.nextFloat\(\)\*9f else rng\.nextFloat\(\)\*h/);
 assert.match(native,/"butterfly"/);
 assert.match(native,/"bee"/);
 assert.match(native,/"aurora"/);
});
