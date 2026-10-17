import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
const plugin=readFileSync(new URL('../src-tauri/android-native/SnowOverlayPlugin.kt',import.meta.url),'utf8');

test('single package-wide Android overlay permission gate is requested once and resumes pending start',()=>{
 assert.match(plugin,/Settings\.canDrawOverlays\(host\)/);
 assert.match(plugin,/Settings\.ACTION_MANAGE_OVERLAY_PERMISSION/);
 assert.match(plugin,/Uri\.parse\("package:" \+ host\.packageName\)/);
 assert.match(app,/pendingOverlayStart/);
 assert.match(app,/sessionStorage/);
 assert.match(app,/if\s*\(.*granted.*pendingOverlayStart/);
 assert.match(app,/await androidOverlayAction\('start'\)/);
 assert.match(app,/visibilitychange/);
 assert.match(app,/addEventListener\('focus'/);
});
test('Android mobile shell pins header and tabs while all scene content scrolls only in the panel',()=>{
 assert.match(app,/android-ui/);
 assert.match(app,/insertBefore\(.*studio-tabs|studioTabs.*before|insertBefore\(tabs/);
 assert.match(app,/shell\.insertBefore\(visual,scenesPanel\)/);
 assert.doesNotMatch(app,/scenesPanel\.prepend\(visual\)/);
 assert.match(css,/\.android-ui\s+\.app-shell/);
 assert.match(css,/padding:max\(28px,env\(safe-area-inset-top,0px\)\) 0 max\(17px,env\(safe-area-inset-bottom,0px\)\)/);
 assert.match(css,/\.studio-panel[\s\S]*overflow-y:auto/);
});
test('permission wording never promises Android can bulk-grant other applications',()=>{
 assert.match(app,/one permission|one approval|all scenes/i);
 assert.doesNotMatch(app,/grant all other apps|give every app permission/i);
});
