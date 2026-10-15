import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('desktop claims OS single-instance lock BEFORE initializing Tauri or any UI', () => {
  const main = readFileSync(new URL('../src-tauri/src/main.rs', import.meta.url), 'utf8');
  const guard = readFileSync(new URL('../src-tauri/src/single_instance.rs', import.meta.url), 'utf8');
  assert.match(main, /single_instance::acquire\(\)/);
  assert.ok(main.indexOf('single_instance::acquire()') < main.indexOf('snowy_display_lib::run()'),
    'no second process may open a WebView before locking');
  assert.match(guard, /CreateMutexW/, 'Windows needs a named kernel mutex');
  assert.match(guard, /ERROR_ALREADY_EXISTS|183/, 'existing lock must block the duplicate');
  assert.match(guard, /flock/, 'Linux and macOS must use a process-lifetime lock');
});
