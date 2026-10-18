import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
test('Android is a four-row fixed shell with a separate always-visible preview',()=>{
 const css=read('../src/style.css');
 const app=read('../src/app.ts');
 assert.match(css,/html\.android-ui \.app-shell\{[\s\S]*?grid-template-rows:auto auto minmax\(0,1fr\) auto/);
 assert.match(css,/html\.android-ui \.studio-panel\{[\s\S]*?grid-row:3;[\s\S]*?overflow-y:auto/);
 assert.match(css,/html\.android-ui \.visual\{[\s\S]*?grid-row:2/);
 assert.match(css,/html\.android-ui \.studio-tabs\{[\s\S]*?grid-row:4/);
 assert.match(app,/shell\.insertBefore\(visual,scenesPanel\)/);
 assert.doesNotMatch(app,/scenesPanel\.prepend\(visual\)/);
 assert.match(css,/html\.android-ui \.fake-window\{display:none!important\}/);
});
test('Android UI exposes native permission, start, status and stop without a fullscreen HTML modal',()=>{
 const app=read('../src/app.ts');
 for(const id of ['android-overlay-quick','android-overlay-controls','android-overlay-status','android-overlay-start','android-overlay-stop'])
  assert.ok(app.includes('id="'+id+'"'));
 for(const action of ['status','permission','start','stop','update'])
  assert.ok(app.includes("'"+action+"'"));
 assert.match(app,/invoke<OverlayStatus>\('control'/);
 assert.doesNotMatch(app,/<dialog\b/);
});
test('Android native service uses transparent, click-through WindowManager and foreground lifecycle',()=>{
 const service=read('../src-tauri/android-native/SnowOverlayService.kt');
 for(const v of ['TYPE_APPLICATION_OVERLAY','FLAG_NOT_TOUCHABLE','FLAG_NOT_FOCUSABLE','PixelFormat.TRANSLUCENT','startForeground','stopSelf','removeView'])
  assert.ok(service.includes(v),v);
 assert.match(service,/Settings\.canDrawOverlays\(this\)/);
 assert.match(service,/WindowManager\.LayoutParams\.MATCH_PARENT/);
 assert.ok(!service.includes('FLAG_NOT_TOUCH_MODAL'));
});
test('Tauri Android plugin is connected through Rust and the CI bootstrap',()=>{
 const plugin=read('../src-tauri/android-native/SnowOverlayPlugin.kt');
 const rust=read('../src-tauri/src/lib.rs');
 const wf=read('../.github/workflows/android-apk.yml');
 const patch=read('../scripts/prepare_android_native.py');
 assert.match(plugin,/@TauriPlugin/);
 assert.match(plugin,/@Command fun start/);
 assert.match(plugin,/@Command fun permission/);
 assert.match(rust,/register_android_plugin/);
 assert.match(rust,/android_weather::control/);
 assert.match(wf,/python3 scripts\/prepare_android_native.py/);
 assert.match(patch,/SYSTEM_ALERT_WINDOW/);
 assert.match(patch,/FOREGROUND_SERVICE_SPECIAL_USE/);
});
