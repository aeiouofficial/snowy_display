import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const kotlin = readFileSync(
  new URL('../src-tauri/android-native/SnowOverlayService.kt', import.meta.url),
  'utf8',
);

test('native snow accumulates only on one downward edge collision', () => {
  assert.match(kotlin, /val beforeY=p\.y/);
  assert.match(kotlin, /mode=="snow" && accumulating && beforeY<h-3f && p\.y>=h-3f/);
  assert.match(kotlin, /depositSnow\(p\.x,p\.r\)/);
  assert.doesNotMatch(kotlin, /if\(p\.y>=h-8f\)/);
});

test('native accumulation spreads impact across normalized adjacent bins', () => {
  assert.match(kotlin, /private fun depositSnow\(x:Float,r:Float\)/);
  assert.match(kotlin, /x\*depth\.size\/width\.toFloat\(\)/);
  assert.match(kotlin, /weights=floatArrayOf\(\.23f,\.54f,\.23f\)/);
  assert.match(kotlin, /totalWeight\+=weights\[offset\+1\]/);
});

test('native snow relaxation limits slopes without deleting source mass', () => {
  assert.match(kotlin, /private fun relaxSnow\(dt:Float\)/);
  assert.match(kotlin, /if\(kotlin\.math\.abs\(gradient\)<=slope\)continue/);
  assert.match(kotlin, /depth\[i\]-=moved;depth\[i\+1\]=\(depth\[i\+1\]\+moved\)/);
  assert.match(kotlin, /depth\[i\+1\]-=moved;depth\[i\]=\(depth\[i\]\+moved\)/);
});

test('snow surface is a smooth continuous path rather than rectangles', () => {
  assert.match(kotlin, /val contour=Path\(\)/);
  assert.match(kotlin, /contour\.quadTo/);
  assert.match(kotlin, /c\.drawPath\(contour,brush\)/);
  assert.doesNotMatch(kotlin, /rectangle\(c,i\*14f,h-amount/);
});

test('distinct particle types use appropriate native movement', () => {
  assert.match(kotlin, /"bats"->\(48f\+p\.speed\*\.33f\)/);
  assert.match(kotlin, /"fireflies"->sin\(elapsed\*1\.4f\+p\.phase\)\*17f/);
  assert.match(kotlin, /"rain"->p\.speed\*3\.7f\*gravity/);
  assert.match(kotlin, /"stars"->0f/);
  assert.match(kotlin, /"embers"->-p\.speed\*\.65f/);
});
