import { SnowEngine, type Surface } from './physics.ts';
import { drawSnow, fitCanvas } from './render.ts';
import { loadSettings, saveSettings, fetchSettings, broadcastSettings, broadcastClearSnow, type AppSettings } from './settings.ts';
import { THEMES } from './themes.ts';
import { PERFORMANCE, resolvePerformance } from './desktop-world.ts';
import { activeTheme, DEFAULT_APP_SETTINGS } from './settings.ts';
import { INTERACTION_TOOLS, normalizeTool } from './interactions.ts';
import { installStudioUI } from './studio-ui.ts';
import './style.css';
if (/Android/i.test(navigator.userAgent)) document.documentElement.classList.add('android-ui');

const target = document.querySelector<HTMLDivElement>('#app');
if (!target) throw new Error('App root missing');
target.innerHTML = `<main class="app-shell">
<header class="header">
 <div class="brandmark" aria-hidden="true">✳</div>
 <div class="brandcopy"><h1>Snowy Display</h1><p>ATMOSPHERE STUDIO</p></div>
 <button type="button" id="android-overlay-quick" class="android-overlay-quick" hidden>Start overlay</button>
 <div class="live-status"><span class="live-dot"></span><span id="runtime-status">LIVE</span></div>
</header>
<section class="visual" aria-label="Animated weather preview">
 <div class="preview-head"><span>LIVE ENVIRONMENT</span><span class="preview-hint">Drag windows · interact with snow</span></div>
 <div id="scene" class="scene"><div class="sky-glow"></div>
  <div class="fake-window one" data-window="front"><div class="win-head"><b>Explorer</b><span>− □ ×</span></div>
   <div class="win-inner"><span class="fake-line wide"></span><span class="fake-line"></span><span class="fake-line small"></span></div></div>
  <div class="fake-window two" data-window="back"><div class="win-head"><b>Notes</b><span>− □ ×</span></div>
   <div class="win-inner"><span class="fake-line"></span><span class="fake-line wide"></span></div></div>
  <canvas id="preview" aria-label="Live animated seasonal scene"></canvas>
 </div>
 <div class="scene-caption"><div><span id="scene-category">WINTER COLLECTION</span>
  <h2 id="scene-name">Natural Snow</h2><p id="scene-description">Live seasonal scenery and weather physics</p></div>
  <span id="scene-running" class="scene-running">ACTIVE</span></div>
</section>
<nav id="studio-tabs" class="studio-tabs" role="tablist" aria-label="Studio sections">
 <button type="button" data-tab="scenes" id="tab-scenes" role="tab" aria-controls="panel-scenes" aria-selected="true"><span class="tab-symbol">◈</span>Scenes</button>
 <button type="button" data-tab="physics" id="tab-physics" role="tab" aria-controls="panel-physics" aria-selected="false"><span class="tab-symbol">❄</span>Physics</button>
 <button type="button" data-tab="activity" id="tab-activity" role="tab" aria-controls="panel-activity" aria-selected="false"><span class="tab-symbol">✦</span>Activity</button>
 <button type="button" data-tab="system" id="tab-system" role="tab" aria-controls="panel-system" aria-selected="false"><span class="tab-symbol">⚙</span>System</button>
</nav>
<section id="panel-scenes" class="studio-panel" role="tabpanel" aria-labelledby="tab-scenes">
 <div class="panel-heading"><span class="eyebrow">CURATED CONTENT</span>
  <div class="heading-row"><h2>Seasons & weather</h2><span id="theme-count" class="content-count">Scenes</span></div>
  <p>Seasonal animations, weather moods and special events — not just recolored snowfall.</p></div>
 <div id="category-filters" class="category-filters" role="group" aria-label="Filter scene categories"></div>
 <label class="search-scenes"><span aria-hidden="true">⌕</span><input type="search" id="theme-search" placeholder="Search the library…" aria-label="Search the theme library"></label>
 <div id="theme-gallery" class="theme-gallery" aria-label="Available environments"></div>
 <div class="settings-block">
  <h3>Seasonal automation</h3>
  <label class="switch-line"><span><strong>Follow the calendar</strong><small>Automatically switch to the right season, Halloween, Advent, Christmas and New Year</small></span>
   <input id="auto-theme" type="checkbox" role="switch"><span class="switch-track"></span></label>
  <label class="hidden-select"><span>All environments</span><select id="theme"></select></label>
 </div>
 <div class="settings-block"><h3>Scene illustrations</h3>
  <label class="switch-line"><span><strong>Seasonal objects</strong><small>Flowers, animals, clouds, lights, stars and holiday decoration</small></span>
   <input id="scene-objects" type="checkbox" role="switch"><span class="switch-track"></span></label>
  <label class="switch-line"><span><strong>Animate the scenery</strong><small>Wingbeats, travelling clouds, auroras, flames and lanterns</small></span>
   <input id="scene-animations" type="checkbox" role="switch"><span class="switch-track"></span></label>
  <div id="scenery-sliders" class="extra-sliders"></div>
 </div>
</section>
<section id="panel-physics" class="studio-panel" role="tabpanel" aria-labelledby="tab-physics" hidden>
 <div class="panel-heading"><span class="eyebrow">PHYSICAL ACCUMULATION</span>
  <div class="heading-row"><h2>Snow dynamics</h2>
   <button class="toggle" id="enabled" role="switch" aria-checked="true" aria-label="Toggle desktop precipitation"><span></span></button></div>
  <p>Real deposition on exposed window edges, granular settling, wind and physical sliding.</p></div>
 <div class="settings-block"><h3>Quick presets</h3><div class="preset-bar" id="presets"></div></div>
 <div class="settings-block"><h3>Fine adjustments</h3><div id="sliders"></div></div>
 <div class="info-strip">Minimized and fully covered windows never accumulate snow or shed ghost clumps. Rain, petals and leaves do not form snowdrifts.</div>
</section>
<section id="panel-activity" class="studio-panel" role="tabpanel" aria-labelledby="tab-activity" hidden>
 <div class="panel-heading"><span class="eyebrow">REACTIVE DESKTOP</span>
  <div class="heading-row"><h2>Activities & spells</h2><span class="content-count">7 tools</span></div>
  <p>Footprints, snow displacement and magic gestures interact with real surfaces.</p></div>
 <div class="settings-block"><h3>Pointer tools</h3>
  <div id="interaction-tools" class="interaction-grid" role="group" aria-label="Select an interactive tool"></div>
  <div id="interaction-description" class="interaction-description" aria-live="polite"></div>
 </div>
 <div class="settings-block">
  <h3>Autonomous snowplows</h3>
  <p class="block-note">Animated maintenance vehicles drive over snow-covered exposed ledges and shift existing snow into natural piles.</p>
  <label class="switch-line"><span><strong>Snowplow vehicles</strong><small>Physical winter activity · Does not intercept desktop clicks</small></span>
   <input id="auto-plows" type="checkbox" role="switch"><span class="switch-track"></span></label>
  <div id="plow-sliders" class="extra-sliders"></div>
 </div>
</section>
<section id="panel-system" class="studio-panel" role="tabpanel" aria-labelledby="tab-system" hidden>
 <div id="android-overlay-controls" class="settings-block android-overlay-controls" hidden>
  <h3>Weather over other apps</h3>
  <p class="block-note">Real click-through Android weather overlay. Requires Android's “Display over other apps” permission.</p>
  <div id="android-overlay-status" role="status" aria-live="polite">Checking overlay status…</div>
  <div class="actions">
    <button id="android-overlay-start" type="button" class="secondary">Enable overlay</button>
    <button id="android-overlay-stop" type="button" class="secondary danger">Stop overlay</button>
  </div>
  <p class="block-note">Android restricts reading other apps' windows. Accumulation is on the screen bottom, not external app windows.</p>
 </div>
 <div class="panel-heading"><span class="eyebrow">DISPLAY & PERFORMANCE</span>
  <div class="heading-row"><h2>System settings</h2><span class="content-count">ALL MONITORS</span></div>
  <p>One shared desktop simulation, performance controls and accessible motion options.</p></div>
 <div class="settings-block"><h3>Performance profile</h3>
  <div class="environment-field"><label for="quality">Render quality</label><select id="quality">
   <option value="eco">Eco · 24 frames/sec</option>
   <option value="balanced">Balanced · 36 frames/sec</option>
   <option value="high">High · 60 frames/sec</option></select></div>
  <div id="quality-options" class="quality-cards"></div></div>
 <div class="settings-block"><h3>Accessibility</h3>
  <label class="switch-line"><span><strong>Reduce movement</strong><small>Keep scenery while suppressing decorative animation</small></span>
   <input id="reduced-motion" type="checkbox" role="switch"><span class="switch-track"></span></label>
 </div>
 <div class="settings-block"><h3>Desktop integration</h3>
  <div class="system-row"><span>Monitor topology</span><strong>Automatic</strong></div>
  <div class="system-row"><span>Overlay input</span><strong>Click-through</strong></div>
  <div class="system-row"><span>Scene data</span><strong>Stored locally</strong></div>
  <p class="block-note">Linux Wayland security restricts global overlays; the app preview remains usable.</p></div>
 <div class="settings-block"><h3>Maintenance</h3>
  <div class="actions"><button id="clear" class="secondary">Clear snow</button>
   <button id="reset" class="secondary danger">Restore defaults</button></div>
 </div>
</section>
<footer><span>Snowy Display · Atmosphere Studio</span><span>Windows · Linux · macOS · mobile preview</span></footer>
</main>`;

document.querySelector<HTMLElement>('#theme-count')!.textContent=`${THEMES.length} environments`;
const themeSelect=document.querySelector<HTMLSelectElement>('#theme')!;
const qualitySelect=document.querySelector<HTMLSelectElement>('#quality')!;
const autoTheme=document.querySelector<HTMLInputElement>('#auto-theme')!;
for(const category of ['Winter','Spring','Summer','Autumn','Weather','Events','Atmosphere']) {
  const group=document.createElement('optgroup');group.label=category;
  for(const t of THEMES.filter(t=>t.category===category)) {
    const option=document.createElement('option');option.value=t.id;option.textContent=t.name;
    group.appendChild(option);
  }
  themeSelect.appendChild(group);
}
const interactionButtons=document.querySelector<HTMLElement>('#interaction-tools')!;
const interactionDescription=document.querySelector<HTMLElement>('#interaction-description')!;
for (const tool of INTERACTION_TOOLS) {
  const button=document.createElement('button');
  button.type='button';button.className='interaction-button';
  button.dataset.tool=tool.id;
  const glyph=document.createElement('span');glyph.className='interaction-icon';
  glyph.setAttribute('aria-hidden','true');glyph.textContent=tool.icon;
  const caption=document.createElement('span');caption.textContent=tool.label;
  button.append(glyph,caption);
  button.title=tool.details;
  button.addEventListener('click',()=> {
    config={...config,interactionMode:tool.id};update();
  });
  interactionButtons.appendChild(button);
}
const isAndroid = document.documentElement.classList.contains('android-ui');
const androidControls = document.querySelector<HTMLElement>('#android-overlay-controls')!;
const overlayQuick = document.querySelector<HTMLButtonElement>('#android-overlay-quick')!;
const overlayStatus = document.querySelector<HTMLElement>('#android-overlay-status')!;
let overlayRunning = false;
type OverlayStatus = { granted:boolean; running:boolean; permissionRequested?:boolean };
async function androidOverlayAction(action:'status'|'permission'|'start'|'stop'|'update'):Promise<OverlayStatus> {
 const {invoke}=await import('@tauri-apps/api/core');
 return invoke<OverlayStatus>('control',{
  action,settings:{...config,themeId:activeTheme(config).id}
 });
}
function displayOverlayStatus(value:OverlayStatus):void {
 overlayRunning=value.running;
 overlayStatus.textContent=!value.granted
  ? 'Android permission required: Display over other apps'
  : value.running?'Overlay active over other apps':'Permission granted · overlay stopped';
 overlayQuick.textContent=value.running?'Stop overlay':'Start overlay';
 overlayQuick.setAttribute('aria-pressed',String(value.running));
 document.querySelector<HTMLButtonElement>('#android-overlay-start')!.disabled=value.running;
 document.querySelector<HTMLButtonElement>('#android-overlay-stop')!.disabled=!value.running;
}
async function refreshOverlayStatus():Promise<void>{
 if(!isAndroid)return;
 try {displayOverlayStatus(await androidOverlayAction('status'));}
 catch(err){overlayStatus.textContent='Overlay unavailable: '+String(err);}
}
async function startAndroidOverlay():Promise<void>{
 try {
  const state=await androidOverlayAction('status');
  if(!state.granted){
   const result=await androidOverlayAction('permission');
   displayOverlayStatus(result);
   return;
  }
  await androidOverlayAction('start');
  window.setTimeout(()=>{void refreshOverlayStatus()},600);
 }catch(err){overlayStatus.textContent='Overlay start failed: '+String(err);}
}
async function stopAndroidOverlay():Promise<void>{
 try{await androidOverlayAction('stop');}
 catch(err){overlayStatus.textContent='Overlay stop failed: '+String(err);}
 window.setTimeout(()=>{void refreshOverlayStatus()},250);
}
if(isAndroid){
 androidControls.hidden=false;overlayQuick.hidden=false;
 document.querySelector('#android-overlay-start')!.addEventListener('click',()=>{void startAndroidOverlay()});
 document.querySelector('#android-overlay-stop')!.addEventListener('click',()=>{void stopAndroidOverlay()});
 overlayQuick.addEventListener('click',()=>{void (overlayRunning?stopAndroidOverlay():startAndroidOverlay())});
 window.addEventListener('focus',()=>{void refreshOverlayStatus()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshOverlayStatus()});
 void refreshOverlayStatus();
}
const scene = document.querySelector<HTMLElement>('#scene')!;
const canvas = document.querySelector<HTMLCanvasElement>('#preview')!;
const engine = new SnowEngine(420, 300);
let config: AppSettings = loadSettings();
let editRevision = 0;
const syncStudio=installStudioUI((partial,persist=true)=>{
  config={...config,...partial};
  if(!persist)editRevision+=1;
  update(persist);
 });

const PRESETS: Record<string, Partial<AppSettings>> = {
  'Gentle Flurry': { snowfall: 0.35, wind: 0.05, gravity: 0.75, cohesion: 0.55, maxDepth: 20 },
  'Arctic Blizzard': { snowfall: 0.95, wind: 0.75, gravity: 1.45, cohesion: 0.3, maxDepth: 48 },
  'Mountain Gale': { snowfall: 0.7, wind: -0.85, gravity: 1.8, cohesion: 0.2, maxDepth: 28 },
  'Quiet Frost': { snowfall: 0.2, wind: 0.0, gravity: 0.6, cohesion: 0.8, maxDepth: 16 },
  'Deep Powder': { snowfall: 0.85, wind: 0.15, gravity: 1.1, cohesion: 0.7, maxDepth: 80 },
};

const presetContainer = document.querySelector<HTMLElement>('#presets')!;
for (const [name, preset] of Object.entries(PRESETS)) {
  const btn = document.createElement('button');
  btn.className = 'preset-chip';
  btn.textContent = name;
  btn.addEventListener('click', () => {
    config = { ...config, ...preset };
    update();
  });
  presetContainer.appendChild(btn);
}

const specs = [
  { key: 'snowfall', label: 'Snowfall', min: 0, max: 1, step: .01, display: (n: number) => `${Math.round(n * 100)}%` },
  { key: 'wind', label: 'Wind direction', min: -1, max: 1, step: .01, display: (n: number) => (n > 0 ? '+' : '') + Math.round(n * 100) },
  { key: 'gravity', label: 'Gravity', min: .2, max: 3, step: .05, display: (n: number) => `${n.toFixed(2)}×` },
  { key: 'cohesion', label: 'Snow cohesion', min: 0, max: 1, step: .01, display: (n: number) => `${Math.round(n * 100)}%` },
  { key: 'maxDepth', label: 'Maximum pile depth', min: 3, max: 120, step: 1, display: (n: number) => `${Math.round(n)} px` },
] as const;
const sliders = document.querySelector<HTMLElement>('#sliders')!;
for (const item of specs) {
  const row = document.createElement('label'); row.className = 'control-row';
  row.innerHTML = `<span class="control-title">${item.label}</span><output for="${item.key}"></output><input type="range" id="${item.key}" min="${item.min}" max="${item.max}" step="${item.step}" />`;
  sliders.appendChild(row);
  row.querySelector<HTMLInputElement>('input')!.addEventListener('input', event => {
    config = { ...config, [item.key]: Number((event.target as HTMLInputElement).value) };
    update();
  });
}
const toggle = document.querySelector<HTMLButtonElement>('#enabled')!;
function update(persist = true): void {
  engine.configure(config);
  const theme=activeTheme(config);
  engine.setTheme(theme.id);
  engine.setParticleLimit(PERFORMANCE[resolvePerformance(config.performanceMode)].particles);
  engine.configureActors({autoPlows:config.autoPlows,plowInterval:config.plowInterval});
  themeSelect.value=theme.id;
  themeSelect.disabled=config.automaticTheme;
  qualitySelect.value=resolvePerformance(config.performanceMode);
  autoTheme.checked=config.automaticTheme;
  scene.dataset.theme=theme.category.toLowerCase();
  document.documentElement.style.setProperty('--accent',theme.accent);
  syncStudio(config,theme);
  const mode=normalizeTool(config.interactionMode);
  for(const button of interactionButtons.querySelectorAll<HTMLButtonElement>('button')) {
    const active=button.dataset.tool===mode;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  }
  interactionDescription.textContent=INTERACTION_TOOLS.find(t=>t.id===mode)?.details??'';
  toggle.setAttribute('aria-checked', String(config.enabled));
  for (const spec of specs) {
    const field = document.querySelector<HTMLInputElement>(`#${spec.key}`)!;
    field.value = String(config[spec.key]);
    field.parentElement!.querySelector('output')!.textContent = spec.display(config[spec.key]);
  }
  for (const chip of Array.from(presetContainer.querySelectorAll<HTMLButtonElement>('.preset-chip'))) {
    const p = PRESETS[chip.textContent || ''];
    const active = p && Object.entries(p).every(([k, v]) => Math.abs((config as any)[k] - (v as number)) < 0.02);
    chip.classList.toggle('active', !!active);
  }
  if (isAndroid && overlayRunning) {
    void androidOverlayAction('update').catch(err=>console.warn('[snowy] Android overlay update failed',err));
  }
  if (persist) {
    editRevision += 1;
    void broadcastSettings(config);
  }
}
themeSelect.addEventListener('change',()=> {
  config={...config,themeId:themeSelect.value,automaticTheme:false};update();
});
qualitySelect.addEventListener('change',()=>{
  config={...config,performanceMode:resolvePerformance(qualitySelect.value)};update();
});
autoTheme.addEventListener('change',()=>{
  config={...config,automaticTheme:autoTheme.checked};update();
});
toggle.addEventListener('click', () => { config.enabled = !config.enabled; update(); });
document.querySelector<HTMLButtonElement>('#reset')!.addEventListener('click', () => {
  config = {...DEFAULT_APP_SETTINGS}; update();
});
document.querySelector<HTMLButtonElement>('#clear')!.addEventListener('click', () => {
  engine.clear();
  void broadcastClearSnow();
});
update(false);
const hydrationRevision = editRevision;
void fetchSettings().then(loaded => {
  if (editRevision !== hydrationRevision) return;
  config = loaded;
  saveSettings(loaded);
  update(false);
});
let ctx: CanvasRenderingContext2D;
const elementRects = () => Array.from(scene.querySelectorAll<HTMLElement>('[data-window]')).map((el, z) => {
  const a = el.getBoundingClientRect(), b = scene.getBoundingClientRect();
  return { id: el.dataset.window!, x: a.x - b.x, y: a.y - b.y, width: a.width, height: a.height, z: 2 - z } satisfies Surface;
});
function sizePreview(): void {
  const b = scene.getBoundingClientRect(); ctx = fitCanvas(canvas, b.width, b.height);
  engine.resize(b.width, b.height); engine.setSurfaces([...elementRects(), { id: 'floor', x: 0, y: b.height - 3, width: b.width, height: 5, z: -100 }], performance.now()/1000);
}
new ResizeObserver(sizePreview).observe(scene);
let last = performance.now();
let lastVisual=0;
let lastCalendarDay=new Date().getDate();
function animate(now: number): void {
  requestAnimationFrame(animate);
  const interval=1000/PERFORMANCE[resolvePerformance(config.performanceMode)].fps;
  if(now-lastVisual<interval)return;
  lastVisual=now;
  if(config.automaticTheme) {
    const today=new Date();
    if(today.getDate()!==lastCalendarDay) {lastCalendarDay=today.getDate();update(false);}
  }
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  engine.setSurfaces([...elementRects(), { id: 'floor', x: 0, y: engine.height - 3, width: engine.width, height: 5, z: -100 }], now / 1000);
  if (config.enabled) {
    for(let remaining=dt;remaining>0;) {
      const step=Math.min(1/30,remaining);engine.step(step);remaining-=step;
    }
    drawSnow(ctx,engine,false,activeTheme(config).id,config);
  } else ctx.clearRect(0, 0, engine.width, engine.height);
}
sizePreview(); requestAnimationFrame(animate);
for (const el of scene.querySelectorAll<HTMLElement>('[data-window]')) {
  let drag: { id: number; px: number; py: number; x: number; y: number } | null = null;
  el.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    drag = { id: event.pointerId, px: event.clientX, py: event.clientY, x: el.offsetLeft, y: el.offsetTop };
    el.setPointerCapture(event.pointerId);
  });
  el.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    el.style.left = `${Math.max(0, Math.min(scene.clientWidth - el.clientWidth, drag.x + event.clientX - drag.px))}px`;
    el.style.top = `${Math.max(20, Math.min(scene.clientHeight - el.clientHeight - 8, drag.y + event.clientY - drag.py))}px`;
  });
  el.addEventListener('pointerup', () => { drag = null; });
  el.addEventListener('pointercancel', () => { drag = null; });
}

let lastToolAt=0;
let lastToolX=-10000;
let lastToolY=-10000;
scene.addEventListener('pointerdown',event=>{
  if(event.button!==0||!config.enabled)return;
  const mode=normalizeTool(config.interactionMode);
  if(mode==='none')return;
  const b=scene.getBoundingClientRect();
  const x=event.clientX-b.x,y=event.clientY-b.y;
  if(engine.applyTool(mode,x,y,performance.now()/1000)) {
    lastToolAt=performance.now();
    lastToolX=x;lastToolY=y;
  }
});
scene.addEventListener('pointermove', event => {
  const b = scene.getBoundingClientRect();
  const x = event.clientX - b.x;
  const y = event.clientY - b.y;
  engine.interactMouse(x, y, performance.now() / 1000);
  const mode=normalizeTool(config.interactionMode);
  const tool=INTERACTION_TOOLS.find(t=>t.id===mode)!;
  const now=performance.now();
  if(config.enabled&&mode!=='none'&&
    now-lastToolAt>=tool.intervalMs&&Math.hypot(x-lastToolX,y-lastToolY)>12) {
    if(engine.applyTool(mode,x,y,now/1000)) {
      lastToolAt=now;lastToolX=x;lastToolY=y;
    }
  }
});

scene.addEventListener('pointerleave', () => {
  engine.interactMouse(-9999, -9999, performance.now() / 1000);
});

