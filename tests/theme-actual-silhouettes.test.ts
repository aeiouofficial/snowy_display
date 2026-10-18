import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {THEMES} from '../src/themes.ts';
import {THEME_EFFECTS} from '../src/theme-effects.ts';

const painter=readFileSync(new URL('../src/theme-effects.ts',import.meta.url),'utf8');
const preview=readFileSync(new URL('../src/render.ts',import.meta.url),'utf8');
const native=readFileSync(new URL('../src-tauri/android-native/SnowOverlayService.kt',import.meta.url),'utf8');

test('every one of the 38 themes has its own shape signature, not a color-only fallback',()=>{
 assert.equal(THEMES.length,38);
 assert.deepEqual(Object.keys(THEME_EFFECTS).sort(),THEMES.map(t=>t.id).sort());
 const signatures=new Set<string>();
 for(const theme of THEMES){
  const effect=THEME_EFFECTS[theme.id];
  assert.ok(effect,theme.id);
  assert.ok(effect.glyph && effect.companion && effect.drift && effect.atmosphere,theme.id);
  const signature=[effect.glyph,effect.companion,effect.drift,effect.atmosphere].join('|');
  assert.ok(!signatures.has(signature),'duplicate effect composition: '+theme.id);
  signatures.add(signature);
 }
 assert.equal(signatures.size,38);
});

test('live scene really paints animated and legible effect silhouettes rather than only small particles',()=>{
 assert.match(preview,/paintThemeFeaturedEffects\(ctx,theme,/);
 assert.match(painter,/export function paintThemeFeaturedEffects\(/);
 assert.match(painter,/paintThemeParticle\(c,particle,theme,t,width,height,visualScale,glyph,true\)/);
 assert.match(painter,/const count=fine\?7:5/);
 assert.match(painter,/const glyph=isCompanion\?fx\.companion:fx\.glyph/);
 assert.match(painter,/const minimum=fine\.has\(glyph\)\?2\.2:silhouettes\.has\(glyph\)\?9:5/);
 assert.match(painter,/VISIBLE_SILHOUETTES\.has\(glyph\)\?\.82/);
});

test('glow does not replace the required physical shape in either renderer',()=>{
 assert.match(painter,/case 'firefly':\{/);
 assert.match(painter,/c\.ellipse\(-r\*\.43,-r\*\.35/);
 assert.match(native,/"firefly","sun-dust"->\{/);
 assert.match(native,/if\(kind=="firefly"\)\{/);
 assert.match(native,/val flap=\(\.45f\+\.55f\*kotlin\.math\.abs\(sin\(t\*5\)\)\)/);
 for(const shape of ['pollen','petal','maple','butterfly','bat','bee','bird','lightning','heart','candle','gift','lantern','galaxy','crescent']){
  assert.ok(painter.includes('case \x27'+shape+'\x27')||painter.includes('\x27'+shape+'\x27:'),shape);
  assert.ok(native.includes('"'+shape+'"'),shape);
 }
 assert.match(painter,/case 'fog':c\.globalAlpha\*=\.45/);
 assert.match(native,/"leaf-fog","fog"->\{[\s\S]*?path\.cubicTo/);
 assert.doesNotMatch(native,/"firefly","sun-dust"->\{\s*disc\(c,x,y,s0\*3\.4f/);
});

test('native performance limits and Android overlay power safeguards are unaffected',()=>{
 assert.match(native,/val limit=when\(quality\)\{"eco"->12;"high"->40;else->24\}/);
 assert.match(native,/val baselineFps=when\(quality\)\{"eco"->8;"high"->20;else->12\}/);
 assert.match(native,/val fps=if\(powerConstrained\)min\(4,baselineFps\) else baselineFps/);
});
