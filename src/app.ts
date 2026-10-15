import { SnowEngine, type Surface } from './physics.ts';
import { drawSnow, fitCanvas } from './render.ts';
import { loadSettings, saveSettings, fetchSettings, broadcastSettings, broadcastClearSnow, type AppSettings } from './settings.ts';
import { THEMES } from './themes.ts';
import { PERFORMANCE, resolvePerformance } from './desktop-world.ts';
import { activeTheme, DEFAULT_APP_SETTINGS } from './settings.ts';
import { INTERACTION_TOOLS, normalizeTool } from './interactions.ts';
import './style.css';

const target = document.querySelector<HTMLDivElement>('#app');
if (!target) throw new Error('App root missing');
target.innerHTML = `
  <main class="app-shell">
    <header class="header"><div class="brandmark" aria-hidden="true">✳</div><div><h1>Snowy Display</h1><p>Real snow. Real surfaces.</p></div><span class="version">ALPHA 0.1</span></header>
    <section class="visual"><div class="preview-head"><span class="live-dot"></span> LIVE PHYSICS PREVIEW <span class="preview-hint">Drag the windows</span></div>
      <div id="scene" class="scene"><div class="sky-glow"></div>
        <div class="fake-window one" data-window="front"><div class="win-head"><b>Explorer</b><span>— □ ×</span></div><div class="win-inner"><span class="fake-line wide"></span><span class="fake-line"></span><span class="fake-line small"></span></div></div>
        <div class="fake-window two" data-window="back"><div class="win-head"><b>Notes</b><span>— □ ×</span></div><div class="win-inner"><span class="fake-line"></span><span class="fake-line wide"></span></div></div>
        <canvas id="preview" aria-label="Live interactive snow physics simulation"></canvas>
      </div>
    </section>
    <section class="environment-controls" aria-label="Seasonal and weather themes">
      <div class="section-title"><h2>Atmosphere & seasons</h2><span class="content-count" id="theme-count">Theme catalog</span></div>
      <div class="environment-grid">
        <label class="environment-field" for="theme"><span>Theme collection</span><select id="theme"></select></label>
        <label class="environment-field" for="quality"><span>Performance</span><select id="quality">
          <option value="eco">Eco · 24 FPS</option><option value="balanced">Balanced · 36 FPS</option>
          <option value="high">High · 60 FPS</option>
        </select></label>
      </div>
      <div id="theme-description" class="environment-description" aria-live="polite"></div>
      <label class="calendar-row" for="auto-theme"><input type="checkbox" id="auto-theme" />
        <span>Automatic seasonal calendar<small>Halloween, Advent weeks 1–4, Christmas, New Year & seasons</small></span>
      </label>
      <p class="content-note">Only snow themes accumulate. Other effects stay airborne and never build up on windows.</p>
    </section>
    <section class="interaction-controls" aria-label="Reactive snow tools and spells">
      <div class="section-title"><h2>Reactive snow &amp; spells</h2>
        <span class="content-count">Live interactions</span></div>
      <div id="interaction-tools" class="interaction-grid" role="group" aria-label="Choose snow interaction"></div>
      <div id="interaction-description" class="interaction-description" aria-live="polite"></div>
      <p class="content-note">Move the cursor through actual snow, or use the draggable preview. Snow tools need an exposed snow-covered edge. Effects are click-through on your desktop.</p>
    </section>
    <section class="controls" aria-label="Snow physics settings">
      <div class="section-title"><h2>Snow simulation</h2><button class="toggle" id="enabled" role="switch" aria-checked="true" aria-label="Toggle snowfall"><span></span></button></div>
      <div class="preset-bar" id="presets"></div>
      <div id="sliders"></div>
      <div class="actions"><button id="reset" class="secondary">Restore defaults</button><button id="clear" class="secondary">Clear snow</button></div>
    </section>
    <footer><span>Native desktop overlays: Windows · macOS · Linux X11</span><span>Mobile: in-app preview</span></footer>
  </main>`;

document.querySelector<HTMLElement>('#theme-count')!.textContent=`${THEMES.length} environments`;
const themeSelect=document.querySelector<HTMLSelectElement>('#theme')!;
const qualitySelect=document.querySelector<HTMLSelectElement>('#quality')!;
const autoTheme=document.querySelector<HTMLInputElement>('#auto-theme')!;
const themeDescription=document.querySelector<HTMLElement>('#theme-description')!;
for(const category of ['Winter','Spring','Summer','Autumn','Events','Atmosphere']) {
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
const scene = document.querySelector<HTMLElement>('#scene')!;
const canvas = document.querySelector<HTMLCanvasElement>('#preview')!;
const engine = new SnowEngine(420, 300);
let config: AppSettings = loadSettings();
let editRevision = 0;

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
  themeSelect.value=theme.id;
  themeSelect.disabled=config.automaticTheme;
  qualitySelect.value=resolvePerformance(config.performanceMode);
  autoTheme.checked=config.automaticTheme;
  themeDescription.textContent=theme.description;
  scene.dataset.theme=theme.category.toLowerCase();
  document.documentElement.style.setProperty('--accent-cyan',theme.accent);
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
    drawSnow(ctx,engine,false,activeTheme(config).id);
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

