import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=source('src/app.ts');
const plugin=source('src-tauri/android-native/SnowOverlayPlugin.kt');
const native=source('src-tauri/android-native/SnowOverlayService.kt');

test('mobile settings update is never blocked by an asynchronously stale overlayRunning flag',()=>{
 assert.match(app,/function scheduleOverlayUpdate\(\):void\{[\s\S]*?if\(!isAndroid\)return/);
 assert.doesNotMatch(app,/function scheduleOverlayUpdate\(\):void\{\s*if\(!isAndroid\|\|!overlayRunning\)return/);
 assert.doesNotMatch(app,/if\s*\(isAndroid\s*&&\s*overlayRunning\)\s*scheduleOverlayUpdate\(\)/);
 assert.match(app,/const result=await androidOverlayAction\('update'\)/);
 assert.match(plugin,/if\(SnowOverlayService\.running\)\{/);
});

test('startup asynchronous Android service state is retried after startForegroundService',()=>{
 assert.match(app,/window\.setTimeout\(\(\)=>\{void refreshOverlayStatus\(\)\},1100\)/);
 assert.match(app,/window\.setTimeout\(\(\)=>\{void refreshOverlayStatus\(\)\},350\)/);
});

test('non-snow atmosphere scenes do not depend on the snow precipitation slider',()=>{
 assert.match(native,/val activityRate=when\(mode\)\{/);
 assert.match(native,/"snow","rain"->snowRate/);
 assert.match(native,/else->\(\.45f\+\.55f\*density\)/);
 assert.match(native,/limit\*intensity\*activityRate/);
});

test('default decoration density gives more than one season motif while snow remains pure',()=>{
 assert.match(native,/val maxDraw=\(5\*density\)\.toInt\(\)\.coerceIn\(0,5\)/);
 assert.match(native,/"candles","star","lantern","pumpkin"/);
 assert.match(native,/Log\.i\("SnowyOverlaySettings"/);
 assert.match(native,/if\(features\.isEmpty\(\)\)return/);
});
