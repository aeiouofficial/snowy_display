import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fetchSettings, type AppSettings } from '../src/settings.ts';

test('loading native settings returns them without writing browser storage prematurely', async () => {
  const local = '{"snowfall":0.12,"wind":0,"gravity":1,"cohesion":0.5,"maxDepth":20,"enabled":true}';
  const writes: string[] = [];
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => local,
      setItem: (key: string, value: string) => writes.push(key + ':' + value),
    },
  });
  try {
    const native: AppSettings = { snowfall: 0.87, wind: -0.33, gravity: 1.4, cohesion: .6, maxDepth: 45, enabled: true,
      themeId: 'winter-snow', automaticTheme: false, performanceMode: 'balanced' };
    const loaded = await (fetchSettings as (read: () => Promise<AppSettings>) => Promise<AppSettings>)(async () => native);
    assert.deepEqual(loaded, native, 'native settings must have priority over stale browser storage');
    assert.deepEqual(writes, [], 'fetch must not mutate local storage before startup hydration guard accepts values');
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('control panel never persists defaults before loading native state or overwrites intervening edits', () => {
  const source = readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
  assert.match(source, /function update\(persist = true\)/, 'UI update must separate rendering from persistence');
  assert.match(source, /update\(false\);\s*const hydrationRevision = editRevision;/,
    'initial display must not commit local defaults to native persistence');
  assert.match(source, /if \(editRevision !== hydrationRevision\) return;/,
    'delayed native settings must not overwrite user edits made during startup');
  assert.match(source, /saveSettings\(loaded\);/, 'accepted native settings should update browser fallback');
});
