import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {THEMES} from '../src/themes.ts';
import {sceneMotifs} from '../src/seasonal-content.ts';
import {drawSnowplow,paintMotif,renderSeasonalScenery} from '../src/seasonal-render.ts';
import {DEFAULT_APP_SETTINGS} from '../src/settings.ts';

test('redesigned studio has four native inline panels without a full-screen modal',()=>{
 const source=readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');
 for(const tab of ['scenes','physics','activity','system']){
  assert.ok(source.includes('id="panel-'+tab+'"'));
  assert.ok(source.includes('data-tab="'+tab+'"'));
 }
 assert.ok(source.includes('id="theme-gallery"'));
 assert.ok(source.includes('id="auto-plows"'));
 assert.ok(source.includes('id="scene-animations"'));
 assert.ok(source.includes('id="reduced-motion"'));
 assert.doesNotMatch(source,/<dialog\b|class="modal-overlay"/);
 const studio=readFileSync(new URL('../src/studio-ui.ts',import.meta.url),'utf8');
 assert.match(studio,/setTab\(tabs\[indexNext\]/);
 assert.match(studio,/card\.setAttribute\('aria-pressed'/);
 assert.match(studio,/theme\.category!==category/);
});
test('native app settings schema preserves animation preferences and plow defaults across updates',()=>{
 const rust=readFileSync(new URL('../src-tauri/src/lib.rs',import.meta.url),'utf8');
 for(const s of ['animations_enabled','decoration_density','visual_scale','reduce_motion','show_scene_objects','auto_plows','plow_interval'])
  assert.ok(rust.includes(s),s);
 assert.ok(DEFAULT_APP_SETTINGS.animationsEnabled);
 assert.ok(DEFAULT_APP_SETTINGS.showSceneObjects);
 assert.equal(DEFAULT_APP_SETTINGS.autoPlows,false);
});
test('every content motif is Canvas2D-renderable and does not require external sprites',()=>{
 const calls:string[]=[];
 const noop=(name:string)=>(..._:unknown[])=>{calls.push(name);};
 const methods=['save','restore','translate','scale','rotate','beginPath','arc','fill',
   'stroke','moveTo','lineTo','ellipse','quadraticCurveTo','bezierCurveTo','fillRect',
   'rect','roundRect','closePath'];
 const proxy:Record<string,unknown>={};
 for(const method of methods)proxy[method]=noop(method);
 proxy.createLinearGradient=()=>({addColorStop:()=>{}});
 const ctx=proxy as unknown as CanvasRenderingContext2D;
 const kinds=new Set<string>();
 for(const t of THEMES)for(const m of sceneMotifs(t.id,1920,1080,13,1)){
  kinds.add(m.kind);paintMotif(ctx,m,t.accent,true);
 }
 assert.ok(kinds.size>=17,'distinct illustrated motifs should go beyond recolored particles');
 assert.ok(calls.includes('ellipse'));
 assert.ok(calls.includes('rotate'));
 renderSeasonalScenery(ctx,'halloween-bats',1920,1080,12,{animationsEnabled:false,decorationDensity:.7});
 drawSnowplow(ctx,{surfaceId:'floor',x:340,y:800,direction:1,phase:13,size:26});
});
test('disabled scenery is a zero-draw operation suitable for eco/accessible profiles',()=>{
 let calls=0;
 const c=new Proxy({}, {get(){return()=>{calls++;};}}) as CanvasRenderingContext2D;
 renderSeasonalScenery(c,'spring-petals',1920,1080,5,{showSceneObjects:false});
 assert.equal(calls,0);
});
