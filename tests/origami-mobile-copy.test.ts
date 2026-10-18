import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');

test('Origami Android System describes phone integration without desktop-only copy',()=>{
 assert.ok(source.includes('class="settings-block device-integration"'));
 assert.ok(source.includes("copy('.device-integration h3','Device integration')"));
 assert.ok(source.includes("copy('.device-integration .block-note',"));
 assert.ok(source.includes('Android restricts inspecting other apps'));
});
