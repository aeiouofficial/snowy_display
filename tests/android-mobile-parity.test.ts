import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {THEMES} from '../src/themes.ts';
const path=(p:string)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=path('src/app.ts'),ui=path('src/studio-ui.ts'),css=path('src/style.css');
const kotlin=path('src-tauri/android-native/SnowOverlayService.kt');
const plugin=path('src-tauri/android-native/SnowOverlayPlugin.kt');
const rust=path('src-tauri/src/lib.rs');
test('Android bottom navigation follows panels; no panel or whole page owns header and tabs',()=>{
 assert.match(app,/shell\.insertBefore\(tabs,shell\.querySelector\('footer'\)\)/);
 assert.match(app,/scenesPanel\.prepend\(document\.querySelector<HTMLElement>\('\.visual'\)!\)/);
 assert.match(css,/\.android-ui \.studio-tabs\{[\s\S]*?order:2/);
 assert.match(css,/\.android-ui \.studio-panel\{[\s\S]*?order:1;flex:1 1 0/);
 assert.match(css,/\.android-ui \.studio-panel\{[\s\S]*?overflow-y:auto;overflow-x:hidden/);
 assert.match(css,/\.android-ui \.app-shell\{[\s\S]*?height:100dvh/);
 assert.match(css,/\.android-ui \.header\{[\s\S]*?padding-top:max\(10px,env\(safe-area-inset-top/);
});
test('Android navigation uses crisp equivalent SVG icons and never Unicode fallbacks',()=>{
 assert.match(ui,/createElementNS\('http:\/\/www\.w3\.org\/2000\/svg','svg'\)/);
 for(const name of ['scenes','physics','activity','system'])assert.match(ui,new RegExp(name+":'M"));
 assert.match(css,/\.android-ui \.tab-symbol svg\{display:block;width:21px;height:21px\}/);
});
test('all 38 themes select native overlay particle type directly, no heuristic "contains spring/summer" fallback',()=>{
 assert.equal(THEMES.length,38);
 assert.match(app,/particleType:active\.particle,primaryColor:active\.color,secondaryColor:active\.secondary/);
 assert.match(app,/themeIntensity:active\.intensity,accumulating:active\.accumulating/);
 assert.match(plugin,/i\.putExtra\("particleType",s\.particleType\.take\(24\)\)/);
 assert.match(kotlin,/mode=nextMode\.takeIf\{it in setOf/);
 assert.doesNotMatch(kotlin,/theme\.contains\("summer"\)/);
 for(const theme of THEMES){
   assert.ok(kotlin.includes('"'+theme.id+'"')||theme.id.startsWith('advent-'),
    'Scene '+theme.id+' missing native motif mapping');
 }
 for(const type of [...new Set(THEMES.map(t=>t.particle))]){
   assert.match(kotlin,new RegExp('"'+type+'"'));
 }
});
test('native Settings schema reaches all mobile rendering options, including clear snow',()=>{
 for(const value of ['gravity','cohesion','maxDepth','plowInterval','autoPlows','animationsEnabled',
  'decorationDensity','visualScale','reduceMotion','showSceneObjects','accumulating']){
  assert.ok(plugin.includes('i.putExtra("'+value+'"'),value);
  assert.ok(kotlin.includes('i.get')&&kotlin.includes('"'+value+'"'),value+' native read');
 }
 assert.match(plugin,/@Command fun clear\(invoke:Invoke\)/);
 assert.match(kotlin,/const val CLEAR=/);
 assert.match(rust,/"update" \| "clear"/);
 assert.match(app,/androidOverlayAction\('clear'\)/);
 assert.match(app,/scheduleOverlayUpdate\(\)/);
});
test('snowplow moves snow from a finite bin into adjacent bins (not merely draws a truck)',()=>{
 assert.match(kotlin,/val moved=\(depth\[bin\]\*\.67f\)/);
 assert.match(kotlin,/val free=\(maxDepth-depth\[j\]\)/);
 assert.match(kotlin,/depth\[j\]\+=add;depth\[bin\]-=add/);
 assert.match(kotlin,/if\(!accumulating\)\{depth\.fill\(0f\)/);
});
test('mobile overlay requests exactly one app permission, never one for each target app',()=>{
 assert.match(plugin,/Settings\.canDrawOverlays\(host\)/);
 assert.match(plugin,/Intent\(Settings\.ACTION_MANAGE_OVERLAY_PERMISSION\)/);
 assert.doesNotMatch(plugin,/forEach.+ACTION_MANAGE_OVERLAY_PERMISSION/);
});
