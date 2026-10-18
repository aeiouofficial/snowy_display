import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');

test('Android scroller stays independent without a distracting WebView scrollbar',()=>{
 assert.match(css,/html\.android-ui \.studio-panel\{\s*scrollbar-width:none;/);
 assert.match(css,/html\.android-ui \.studio-panel::-webkit-scrollbar\{\s*display:none;width:0;height:0;/);
 assert.match(css,/html\.android-ui \.studio-panel\{[\s\S]*?overflow-y:auto/);
});

test('Overlay action buttons and explanatory note have separate vertical space on Android',()=>{
 assert.match(css,/html\.android-ui \.android-overlay-controls \.actions\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/html\.android-ui \.android-overlay-controls \.actions \+ \.block-note\{[\s\S]*?margin:0;padding-top:3px/);
 assert.match(css,/html\.android-ui \.android-overlay-controls \.actions \.secondary\{[\s\S]*?min-height:38px/);
});

test('Compact Android range settings preserve the existing 34-pixel touch region',()=>{
 assert.match(css,/html\.android-ui \.studio-panel \.fine-row,\s*html\.android-ui \.studio-panel \.control-row\{\s*padding:8px 0/);
 assert.match(css,/html\.android-ui \.studio-panel input\[type=range\]\{\s*touch-action:none;min-height:34px/);
});
