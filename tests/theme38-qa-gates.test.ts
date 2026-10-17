import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name:string)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const install=read('scripts/android_theme38_update.py');
const motion=read('scripts/qa_theme38_motion.py');
const still=read('scripts/qa_theme38_still.py');

test('Android updater verifies the exact signed artifact before any physical device operation',()=>{
 assert.match(install,/EXPECTED_SHA256 = "c71a4a9f2371d6b388b594c0088a80606642ab6c90c9639c465dd81224afdd13"/);
 assert.match(install,/if digest != EXPECTED_SHA256:/);
 assert.match(install,/if not args\.install:/);
 assert.match(install,/\["-s", SERIAL\]/);
 assert.match(install,/\["-s", SERIAL\]/);
 assert.match(install,/\[\*prefix, "install", "--no-incremental", "-r", str\(APK\)\]/);
 assert.match(install,/if installed_sha != digest:/);
 assert.doesNotMatch(install,/\["uninstall"|\["clear"|\["wipe"/);
});

test('Headless QA insists that every scene moves and no two scenes are visually near-duplicates',()=>{
 assert.match(motion,/assert len\(found\)==38/);
 assert.match(motion,/for category in \("Winter","Spring","Summer","Autumn","Weather","Events","Atmosphere"\):/);
 assert.match(motion,/if x\["pixel_delta"\]<0\.15/);
 assert.match(motion,/assert not report\["no_observable_change"\]/);
 assert.match(still,/assert len\(report\["themes"\]\)==38/);
 assert.match(still,/assert not report\["potential_near_duplicates"\]/);
});

test('QA and install tooling stays within the workspace without disruptive foreground sessions',()=>{
 for(const source of [install,motion,still]){
   assert.match(source,/\.tmp/);
   assert.doesNotMatch(source,/subprocess\.Popen\(\["powershell"/);
 }
 assert.match(install,/CREATE_NO_WINDOW/);
 assert.match(install,/--install/);
});
