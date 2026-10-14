import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rust = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8');
const overlay = readFileSync(new URL('../src/overlay.ts', import.meta.url), 'utf8');
const permissions = JSON.parse(
  readFileSync(new URL('../src-tauri/capabilities/default.json', import.meta.url), 'utf8'),
) as { permissions: string[] };

test('native overlay stays hidden until the renderer paints its first valid frame', () => {
  const start = rust.indexOf('fn create_overlays(');
  const end = rust.indexOf('#[tauri::command]\nfn get_cursor_position()', start);
  assert.ok(start >= 0 && end > start, 'native overlay initialization must exist');
  const nativeCreation = rust.slice(start, end).split('\n')
    .filter(line => !line.trimStart().startsWith('//')).join('\n');
  assert.match(nativeCreation, /\.visible\(false\)/, 'native overlay must start hidden');
  assert.doesNotMatch(nativeCreation, /\bw\.show\s*\(/,
    'showing native overlay before the JS canvas renders causes an empty visible overlay');
  const frame = overlay.slice(overlay.indexOf('function frame('));
  const draw = frame.indexOf('drawSnow(ctx, engine, false)');
  const show = frame.indexOf('ownWindow.show()');
  assert.ok(draw >= 0 && show > draw, 'renderer must show only after successful drawSnow()');
});

test('overlay webviews have the explicit Tauri permissions needed to show themselves', () => {
  assert.ok(permissions.windows.includes('snow-overlay-*'));
  assert.ok(permissions.permissions.includes('core:window:allow-show'));
});
