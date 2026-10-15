import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');
const studio=readFileSync(new URL('../src/studio-ui.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
const template=app.match(/target\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1];
test('all required control-root DOM IDs exist at boot; never dereference deleted theme-description',()=>{
 assert.ok(template,'static UI markup');
 const ids=new Set([...template!.matchAll(/\bid="([\w-]+)"/g)].map(match=>match[1]));
 const dynamicIds=new Set([...studio.matchAll(/slider\('[^']+','([\w-]+)'/g)].map(match=>match[1]));
 const knownIds=new Set([...ids,...dynamicIds,'app']);
 const selectors=[
  ...app.matchAll(/querySelector(?:<[^>]+>)?\(['"]#([a-z][\w-]*)['"]\)/g),
  ...studio.matchAll(/byId\(['"]([a-z][\w-]*)['"]\)/g),
 ];
 const unresolved=[...new Set([...selectors].map(match=>match[1]))].filter(id=>!knownIds.has(id));
 assert.deepEqual(unresolved,[],`startup would throw on deleted IDs: ${unresolved}`);
 assert.ok(!app.includes("themeDescription.textContent"));
});
test('scene browser, model update, calendar, and actor modes are bound to visible or deliberately hidden settings controls',()=>{
 for(const id of ['theme-gallery','category-filters','theme-search','auto-theme',
    'auto-plows','plow-interval','scene-animations','scene-objects','scenery-sliders',
    'visual-scale','decoration-density','reduced-motion','quality','enabled',
    'clear','reset','interaction-tools','interaction-description','theme','scene']){
  assert.ok(template!.includes('id="'+id+'"') ||
    studio.includes("slider('"+ (id==='plow-interval'?'plow-sliders':id==='decoration-density'||id==='visual-scale'?'scenery-sliders':'')+"','"+id+"'"),
    'setting missing: '+id);
 }
 assert.match(app,/installStudioUI\(/);
 assert.match(app,/engine\.configureActors\(/);
 assert.match(app,/drawSnow\(ctx,engine,false,activeTheme\(config\)\.id,config\)/);
});
test('dark UI remains compact, native dropdowns are inline and hidden panels do not overlay the workspace',()=>{
 assert.match(css,/\[hidden\]\{display:none!important\}/);
 assert.match(css,/\.studio-tabs\{/);
 assert.match(css,/\.studio-panel\{/);
 assert.doesNotMatch(template!,/<dialog\b/);
 for(const id of ['scenes','physics','activity','system']){
  assert.ok(template!.includes('id="panel-'+id+'"'));
  assert.ok(template!.includes('id="tab-'+id+'"'));
 }
});
