import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { SnowEngine, type Surface } from './physics.ts';
import { drawSnow, fitCanvas } from './render.ts';
import { loadSettings, fetchSettings, SETTINGS_EVENT, CLEAR_EVENT, type AppSettings } from './settings.ts';

const canvas = document.querySelector<HTMLCanvasElement>('#snow');
if (!canvas) throw new Error('snow overlay canvas missing');
let ctx = fitCanvas(canvas, innerWidth, innerHeight);
const engine = new SnowEngine(innerWidth, innerHeight);
let settings: AppSettings = loadSettings();
engine.configure(settings);
void fetchSettings().then(s => apply(s));
let lastFrame = performance.now();
let lastPoll = 0;
let polling = false;
let isCoveredFullscreen = false;
let canvasCleared = false;
let lastFailureLog = 0;
const ownWindow = getCurrentWindow();
const monitorIsMac = navigator.userAgent.includes('Macintosh');
let cachedOrigin = { x: 0, y: 0 };
let cachedScale = 1;

// Immediately initialize window origin and scale factor for crisp cursor mapping
void Promise.all([ownWindow.outerPosition(), ownWindow.scaleFactor()]).then(([origin, scale]) => {
  cachedOrigin = origin;
  cachedScale = scale;
  void invoke<[number, number] | null>('get_cursor_position').then(cursor => {
    if (cursor) {
      const [gx, gy] = cursor;
      engine.interactMouse((gx - cachedOrigin.x) / cachedScale, (gy - cachedOrigin.y) / cachedScale, performance.now() / 1000);
    }
  }).catch(() => {});
}).catch(() => {});

void listen<[number, number]>('cursor-move', event => {
  const [globalX, globalY] = event.payload;
  const localX = (globalX - cachedOrigin.x) / cachedScale;
  const localY = (globalY - cachedOrigin.y) / cachedScale;
  engine.interactMouse(localX, localY, performance.now() / 1000);
});

function bottom(): Surface {
  return { id: 'desktop-bottom', x: 0, y: innerHeight - 2, width: innerWidth, height: 5, z: -1000 };
}
async function refreshSurfaces(): Promise<void> {
  if (polling) return;
  polling = true;
  try {
    const [rects, origin, scale] = await Promise.all([
      invoke<Surface[]>('desktop_snapshot'), ownWindow.outerPosition(), ownWindow.scaleFactor(),
    ]);
    cachedOrigin = origin;
    cachedScale = scale;
    // CGWindow bounds use macOS points. Win32 and X11 return physical pixels.
    const units = monitorIsMac ? 1 : scale;
    const mapped = rects.map(s => ({ ...s,
      x: s.x / units - origin.x / scale, y: s.y / units - origin.y / scale,
      width: s.width / units, height: s.height / units,
    })).filter(s => s.x < innerWidth && s.x + s.width > 0 && s.y < innerHeight && s.y + s.height > 0 && s.y > 6);
    // Keep rendering active across desktop and open windows
    isCoveredFullscreen = false;
    engine.setSurfaces([...mapped, bottom()], performance.now() / 1000);
  } catch (error) {
    isCoveredFullscreen = false;
    if (performance.now() - lastFailureLog > 30_000) {
      console.warn('[snowy] geometry refresh failed; using desktop surface', error);
      lastFailureLog = performance.now();
    }
    engine.setSurfaces([bottom()], performance.now() / 1000);
  } finally { polling = false; }
}
function frame(now: number): void {
  const elapsed = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (now - lastPoll > 140) { lastPoll = now; void refreshSurfaces(); }
  if (settings.enabled && !isCoveredFullscreen) {
    // Fixed timestep with bounded catch-up, maintaining stable integration on slow screens.
    const substeps = Math.min(4, Math.max(1, Math.ceil(elapsed / (1 / 60))));
    for (let i = 0; i < substeps; i++) engine.step(elapsed / substeps);
    drawSnow(ctx, engine, false);
    canvasCleared = false;
  } else if (!canvasCleared) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    canvasCleared = true;
  }
  requestAnimationFrame(frame);
}
function apply(next: AppSettings): void { settings = next; engine.configure(next); }
void listen<AppSettings>(SETTINGS_EVENT, event => apply(event.payload)).catch(error =>
  console.error('[snowy] settings event listener failed', error));
void listen(CLEAR_EVENT, () => engine.clear()).catch(error =>
  console.error('[snowy] clear snow event listener failed', error));
window.addEventListener('storage', ev => { if (ev.key) apply(loadSettings()); });
window.addEventListener('resize', () => {
  ctx = fitCanvas(canvas, innerWidth, innerHeight); engine.resize(innerWidth, innerHeight);
});
engine.setSurfaces([bottom()]);
requestAnimationFrame(frame);
