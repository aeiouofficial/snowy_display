import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p:string)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const native=read('src-tauri/android-native/SnowOverlayService.kt');
const plugin=read('src-tauri/android-native/SnowOverlayPlugin.kt');
const app=read('src/app.ts');
test('native overlay pauses when screen is off or battery critically hot',()=>{
 assert.match(native,/Intent\.ACTION_SCREEN_OFF/);
 assert.match(native,/Intent\.ACTION_SCREEN_ON/);
 assert.match(native,/PowerManager\.ACTION_POWER_SAVE_MODE_CHANGED/);
 assert.match(native,/Intent\.ACTION_BATTERY_CHANGED/);
 assert.match(native,/if\(temperature>=43f\)thermallyPaused=true/);
 assert.match(native,/else if\(temperature<=41f\)thermallyPaused=false/);
 assert.match(native,/!power\.isInteractive \|\| thermallyPaused \|\| pct<=7/);
 assert.match(native,/powerReceiver\?\.let\{try\{unregisterReceiver\(it\)\}/);
 assert.match(native,/if\(!active\|\|powerPaused\|\|!enabled\)return/);
});
test('battery-saver and low charge throttle real fullscreen frame and particle budgets',()=>{
 assert.match(native,/power\.isPowerSaveMode \|\| pct<=20/);
 assert.match(native,/val baselineFps=when\(quality\)\{"eco"->8;"high"->20;else->12\}/);
 assert.match(native,/if\(powerConstrained\)min\(4,baselineFps\)/);
 assert.match(native,/val limit=when\(quality\)\{"eco"->12;"high"->40;else->24\}/);
 assert.match(plugin,/o\.put\("powerSuspended", SnowOverlayService\.powerSuspended\)/);
 assert.match(app,/value\.running && value\.powerSuspended/);
});
test('Android preview uses a timer and suspends when hidden, collapsed or disabled',()=>{
 assert.match(app,/function previewIsSuspended\(\):boolean/);
 assert.match(app,/document\.hidden \|\| !config\.enabled/);
 assert.match(app,/previewWakeTimer=setTimeout/);
 assert.match(app,/overlayRunning\?4:8/);
 assert.match(app,/document\.addEventListener\('visibilitychange'/);
 assert.match(app,/window\.addEventListener\('snowy:preview-refresh'/);
 assert.doesNotMatch(app,/function animate\(now: number\): void \{\s*requestAnimationFrame\(animate\)/);
});
