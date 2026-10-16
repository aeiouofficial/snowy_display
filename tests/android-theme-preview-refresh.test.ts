import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');

test('Android scene selection bypasses the preview frame throttle once', () => {
  assert.match(app, /let lastPreviewTheme=activeTheme\(config\)\.id/);
  assert.match(app, /const nextTheme=activeTheme\(config\)\.id/);
  assert.match(app, /if\(nextTheme!==lastPreviewTheme\)\{/);
  assert.match(app, /lastVisual=0/);
  assert.match(app, /clearTimeout\(previewWakeTimer\)/);
  assert.match(app, /previewWakeTimer=null/);
});

test('regular Android preview updates still obey the power-limited cadence', () => {
  assert.match(app, /const previewFPS=config\.reduceMotion\?2:overlayRunning\?4:8/);
  assert.match(app, /if\(now-lastVisual<interval\)\{schedulePreviewFrame\(\);return;\}/);
  assert.match(app, /if\(previewFramePending \|\| previewIsSuspended\(\)\)return/);
});
