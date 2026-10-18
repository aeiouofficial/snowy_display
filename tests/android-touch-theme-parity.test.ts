import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');
const physics=readFileSync(new URL('../src/physics.ts',import.meta.url),'utf8');

test('Android sliders own horizontal touch gestures inside vertically scrolling settings panels',()=>{
 assert.match(css,/html\.android-ui \.studio-panel input\[type=range\]\s*\{[^}]*touch-action:none/s);
 assert.match(css,/html\.android-ui \.studio-panel\{[^}]*touch-action:pan-y/s);
});
test('preview effect rate of non-snow scenes does not depend on snow slider',()=>{
 assert.match(app,/const previewPhysics=theme\.particle==='snow'\|\|theme\.particle==='rain'/);
 assert.match(app,/snowfall:Math\.max\(\.35,theme\.intensity\*\(\.45\+\.55\*config\.decorationDensity\)\)/);
 assert.match(app,/engine\.configure\(previewPhysics\)/);
});
test('mobile preview particle budget does not get silently inflated from 64 to 100',()=>{
 assert.match(physics,/this\.particleLimit=clamp\(Math\.floor\(count\),16,MAX_FLAKES\)/);
});
