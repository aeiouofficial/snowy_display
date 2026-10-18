import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const get=(path:string)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=get('src/app.ts');
const base=get('src/style.css');
const css=get('src/origami-surface.css');
const controller=get('src/origami-appearance.ts');

test('Origami appearance starts in dark, offers accessible light switching and persists locally',()=>{
 assert.match(ui,/bootstrapOrigamiAppearance\(\)/);
 assert.match(ui,/bindOrigamiAppearance\(\)/);
 assert.match(ui,/import '\.\/origami-surface\.css'/);
 assert.match(ui,/data-origami-mode-option="dark" aria-pressed="true"/);
 assert.match(ui,/data-origami-mode-option="light" aria-pressed="false"/);
 assert.match(ui,/role="group" aria-label="Choose color appearance"/);
 assert.match(controller,/snowy-display:origami-mode/);
 assert.match(controller,/let mode:AppearanceMode='dark'/);
 assert.match(controller,/localStorage\.setItem\(APPEARANCE_STORAGE_KEY,requested\)/);
 assert.match(controller,/root\.dataset\.origamiMode=mode/);
 assert.match(controller,/catch \{ \/\* Restricted browser storage/);
});

test('Origami-inspired CSS covers essential components in both dark and light modes',()=>{
 for(const selector of [':root[data-origami-mode="dark"]',':root[data-origami-mode="light"]',
  '.header','.brandmark','.visual','.studio-tabs','.scene-card','.scene-art',
  '.category-chip','.search-scenes','.settings-block','.switch-track',
  '.preset-chip','.quality-card','.interaction-button','.secondary',
  '.android-overlay-quick','.appearance-mode-control','.mobile-scene-toolbar']){
   assert.ok(css.includes(selector),'missing selector '+selector);
 }
 assert.match(css,/--o-card-rad:20px/);
 assert.match(css,/--o-brand-wash:/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

test('Android fixed header/pinned search and bottom nav remain driven by base layout',()=>{
 assert.match(base,/html\.android-ui \.app-shell\.scenes-selected\{/);
 assert.match(base,/html\.android-ui \.mobile-scene-toolbar\{/);
 assert.match(base,/html\.android-ui \.studio-tabs\{/);
 assert.match(base,/html\.android-ui \.studio-panel\{/);
 // The independent skin must not alter fixed positioning, display grid flow or scrolling mechanics.
 assert.doesNotMatch(css,/position\s*:/);
 assert.doesNotMatch(css,/overflow\s*:/);
 assert.doesNotMatch(css,/pointer-events\s*:/);
 assert.doesNotMatch(css,/grid-template-rows\s*:/);
});

test('Origami-inspired adaptation does not embed AGPL Home Assistant modules',()=>{
 for(const fragment of ['bubble-card','hass.states','lovelace','ha-card','.bubble-pop-up']){
  assert.ok(!css.includes(fragment),fragment+' should not be a copied Home Assistant dependency');
 }
});
