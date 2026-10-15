import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadSettings, DEFAULT_APP_SETTINGS } from '../src/settings.ts';
import { INTERACTION_TOOLS } from '../src/interactions.ts';

test('all seven interaction tools appear in the controls with accessible selection',()=>{
 const ui=readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');
 assert.match(ui,/for \(const tool of INTERACTION_TOOLS\)/);
 assert.match(ui,/button\.dataset\.tool=tool\.id/);
 assert.match(ui,/button\.setAttribute\('aria-pressed',String\(active\)\)/);
 assert.match(ui,/interactionDescription\.textContent=/);
 assert.match(ui,/engine\.applyTool\(mode,x,y,/);
 assert.equal(INTERACTION_TOOLS.length,7);
});
test('desktop tracks the current cursor only on the single coordinator and does not intercept mouse clicks',()=>{
 const overlay=readFileSync(new URL('../src/overlay.ts',import.meta.url),'utf8');
 assert.match(overlay,/if\(isCoordinator\) \{[\s\S]*?listen<\[number,number\]>\('cursor-move'/);
 assert.match(overlay,/engine\.applyTool\(tool,localX,localY/);
 assert.match(overlay,/now-lastToolAt<spec\.intervalMs/);
 const native=readFileSync(new URL('../src-tauri/src/lib.rs',import.meta.url),'utf8');
 assert.match(native,/set_ignore_cursor_events\(true\)/);
});
test('legacy desktop settings default to non-invasive observe mode',()=>{
 assert.equal(DEFAULT_APP_SETTINGS.interactionMode,'none');
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,
  value:{getItem:()=>JSON.stringify({snowfall:.6,enabled:true})}});
 try {
  const data=loadSettings();
  assert.equal(data.interactionMode,'none');
  assert.equal(data.snowfall,.6);
 }finally{
  if(original)Object.defineProperty(globalThis,'localStorage',original);
  else Reflect.deleteProperty(globalThis,'localStorage');
 }
});
test('native persisted schema tolerates old saves without interactionMode',()=>{
 const source=readFileSync(new URL('../src-tauri/src/lib.rs',import.meta.url),'utf8');
 assert.match(source,/\#\[serde\(default = "default_interaction_mode"\)\]/);
 assert.match(source,/fn default_interaction_mode\(\) -> String \{ "none"\.into\(\) \}/);
});
