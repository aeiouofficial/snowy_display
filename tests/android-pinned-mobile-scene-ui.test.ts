import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (name: string): string =>
  readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const app = source('src/app.ts');
const studio = source('src/studio-ui.ts');
const style = source('src/style.css');
const native = source('src-tauri/android-native/SnowOverlayService.kt');

test('Android scene search and filters are structurally outside the scrolling panel', () => {
  assert.match(app, /sceneToolbar\.id='mobile-scene-toolbar'/);
  assert.match(app, /for\(const selector of \['\.panel-heading','#category-filters','\.search-scenes'\]\)/);
  assert.match(app, /sceneToolbar\.appendChild\(element\)/);
  assert.match(app, /shell\.insertBefore\(sceneToolbar,scenesPanel\)/);
  assert.match(studio, /toolbar\.hidden=id!=='scenes'/);
  assert.match(studio, /classList\.toggle\('scenes-selected',id==='scenes'\)/);
  assert.match(style, /html\.android-ui \.app-shell\.scenes-selected\{[\s\S]*grid-template-rows:auto auto auto minmax\(0,1fr\) auto/);
  assert.match(style, /html\.android-ui \.app-shell\.scenes-selected \.studio-panel\{grid-row:4\}/);
  assert.match(style, /html\.android-ui \.mobile-scene-toolbar\[hidden\]\{display:none!important\}/);
  assert.match(style, /html\.android-ui \.mobile-scene-toolbar \.search-scenes\{/);
});

test('compact scene shell preserves an independently scrolling content panel', () => {
  assert.match(style, /html\.android-ui \.studio-panel\{[\s\S]*overflow-y:auto/);
  assert.match(style, /html\.android-ui \.header\{\s*min-height:47px/);
  assert.match(style, /html\.android-ui \.scene-card\{\s*min-height:51px/);
  assert.match(style, /html\.android-ui \.studio-tabs\{\s*min-height:53px/);
});

test('native weather stays hidden over Snowy Display controls and resumes over other apps', () => {
  assert.match(native, /Application\.ActivityLifecycleCallbacks/);
  assert.match(native, /application\.registerActivityLifecycleCallbacks\(activityEvents\)/);
  assert.match(native, /application\.unregisterActivityLifecycleCallbacks\(activityEvents\)/);
  assert.match(native, /override fun onActivityResumed\(activity:Activity\)[\s\S]*?overlay\?\.visibility=View\.INVISIBLE/);
  assert.match(native, /override fun onActivityPaused\(activity:Activity\)[\s\S]*?overlay\?\.visibility=View\.VISIBLE/);
  assert.match(native, /view\.visibility=if\(controlsInForeground\)View\.INVISIBLE else View\.VISIBLE/);
  assert.match(native, /"winter-blizzard"->listOf\("cloud","crystal"\)/);
});
