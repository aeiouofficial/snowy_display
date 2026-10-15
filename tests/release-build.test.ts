import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Windows production build uses Tauri CLI (embedding dist), never bare cargo release', () => {
  const script = readFileSync(new URL('../scripts/build-release.py', import.meta.url), 'utf8');
  assert.match(script, /\['npm\.cmd', 'run', 'build', '--', '--no-bundle', '--', '--offline'\]/,
    'native release must use Tauri CLI with bundled frontend instead of bare cargo');
  assert.doesNotMatch(script, /\[\s*'cargo(?:\.exe)?'\s*,\s*'build'/,
    'bare cargo build omits Tauri custom-protocol and opens localhost devUrl');
  assert.match(script, /CREATE_NO_WINDOW/, 'release builder may not foreground a shell');
});

test('Tauri production embeds local frontend, while localhost is development-only', () => {
  const config = JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'));
  assert.equal(config.build.frontendDist, '../dist');
  assert.match(config.build.devUrl, /^https?:\/\/localhost:1420$/);
  assert.equal(config.build.beforeBuildCommand, 'npm run build:web');
});

test('GitHub Windows desktop CI compiles the bundled Tauri release, not just cargo check', () => {
  const workflow = readFileSync(new URL('../.github/workflows/check.yml', import.meta.url), 'utf8');
  assert.match(workflow, /if: runner\.os == 'Windows'[\s\S]*?run: npm run build -- --no-bundle/,
    'release-mode assets must be checked by Windows CI, not only bare cargo check');
});
