import { SnowEngine, type Surface } from './physics.ts';
import { drawSnow, fitCanvas } from './render.ts';
import { loadSettings, fetchSettings, broadcastSettings, broadcastClearSnow, type AppSettings } from './settings.ts';
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
    <section class="controls" aria-label="Snow physics settings">
      <div class="section-title"><h2>Snow simulation</h2><button class="toggle" id="enabled" role="switch" aria-checked="true" aria-label="Toggle snowfall"><span></span></button></div>
      <div id="sliders"></div>
      <div class="actions"><button id="reset" class="secondary">Restore defaults</button><button id="clear" class="secondary">Clear snow</button></div>
    </section>
    <footer><span>Native desktop overlays: Windows · macOS · Linux X11</span><span>Mobile: in-app preview</span></footer>
  </main>`;

const scene = document.querySelector<HTMLElement>('#scene')!;
const canvas = document.querySelector<HTMLCanvasElement>('#preview')!;
const engine = new SnowEngine(420, 300);
let config: AppSettings = loadSettings();
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
function update(): void {
  engine.configure(config);
  toggle.setAttribute('aria-checked', String(config.enabled));
  for (const spec of specs) {
    const field = document.querySelector<HTMLInputElement>(`#${spec.key}`)!;
    field.value = String(config[spec.key]);
    field.parentElement!.querySelector('output')!.textContent = spec.display(config[spec.key]);
  }
  void broadcastSettings(config);
}
toggle.addEventListener('click', () => { config.enabled = !config.enabled; update(); });
document.querySelector<HTMLButtonElement>('#reset')!.addEventListener('click', () => {
  config = { snowfall: .67, wind: .2, gravity: 1, cohesion: .48, maxDepth: 34, enabled: true }; update();
});
document.querySelector<HTMLButtonElement>('#clear')!.addEventListener('click', () => {
  engine.clear();
  void broadcastClearSnow();
});
update();
void fetchSettings().then(loaded => { config = loaded; update(); });
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
function animate(now: number): void {
  const dt = Math.min(.06, (now - last) / 1000); last = now;
  engine.setSurfaces([...elementRects(), { id: 'floor', x: 0, y: engine.height - 3, width: engine.width, height: 5, z: -100 }], now / 1000);
  if (config.enabled) engine.step(dt);
  if (config.enabled) drawSnow(ctx, engine, false);
  else ctx.clearRect(0, 0, engine.width, engine.height);
  requestAnimationFrame(animate);
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
