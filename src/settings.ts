import { DEFAULT_SETTINGS, type Settings } from './physics.ts';
import { DEFAULT_THEME, resolveTheme, calendarTheme } from './themes.ts';
import { resolvePerformance, type PerformanceMode } from './desktop-world.ts';
import { normalizeTool, type InteractionTool } from './interactions.ts';
import type { SceneVisualOptions } from './seasonal-render.ts';
export const SETTINGS_KEY = 'snowy-display/settings-v1';
export const SETTINGS_EVENT = 'snowy-display:settings';
export const CLEAR_EVENT = 'snowy-display:clear-snow';
export type AppSettings = Settings & { enabled: boolean; themeId: string; automaticTheme: boolean; performanceMode: PerformanceMode; interactionMode: InteractionTool;
  autoPlows:boolean; plowInterval:number; } & SceneVisualOptions;
export function activeTheme(settings: Pick<AppSettings,'themeId'|'automaticTheme'>, now=new Date()) {
  return resolveTheme(settings.automaticTheme ? calendarTheme(now) : settings.themeId);
}
export const DEFAULT_APP_SETTINGS: AppSettings = {
  ...DEFAULT_SETTINGS, enabled: true, themeId: DEFAULT_THEME,
  automaticTheme: false, performanceMode: 'balanced', interactionMode: 'none',
  animationsEnabled:true,decorationDensity:.72,visualScale:1,reduceMotion:false,
  showSceneObjects:true,autoPlows:false,plowInterval:20,
};
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_APP_SETTINGS };
    const obj = parsed as Record<string, unknown>;
    const current = { ...DEFAULT_APP_SETTINGS };
    for (const key of ['snowfall', 'wind', 'gravity', 'cohesion', 'maxDepth'] as const) {
      if (typeof obj[key] === 'number' && Number.isFinite(obj[key])) current[key] = obj[key];
    }
    if (typeof obj.enabled === 'boolean') current.enabled = obj.enabled;
    current.themeId = resolveTheme(obj.themeId).id;
    if (typeof obj.automaticTheme === 'boolean') current.automaticTheme = obj.automaticTheme;
    current.performanceMode = resolvePerformance(obj.performanceMode);
    current.interactionMode = normalizeTool(obj.interactionMode);
    current.animationsEnabled = obj.animationsEnabled !== false;
    current.showSceneObjects = obj.showSceneObjects !== false;
    current.autoPlows = obj.autoPlows === true;
    current.reduceMotion = obj.reduceMotion === true;
    if(typeof obj.decorationDensity==='number' && Number.isFinite(obj.decorationDensity))
      current.decorationDensity=Math.max(0,Math.min(1,obj.decorationDensity));
    if(typeof obj.visualScale==='number' && Number.isFinite(obj.visualScale))
      current.visualScale=Math.max(.5,Math.min(2,obj.visualScale));
    if(typeof obj.plowInterval==='number' && Number.isFinite(obj.plowInterval))
      current.plowInterval=Math.max(7,Math.min(180,obj.plowInterval));
    return current;
  } catch { return { ...DEFAULT_APP_SETTINGS }; }
}
export function saveSettings(value: AppSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(value)); }
  catch (err) { console.warn('[snowy] could not persist settings', err); }
}

export async function fetchSettings(
  readNative: () => Promise<AppSettings> = async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<AppSettings>('get_desktop_settings');
  },
): Promise<AppSettings> {
  try {
    const fromBackend = await readNative();
    if (fromBackend && typeof fromBackend.snowfall === 'number') {
      // Native persistence from older alpha releases may not contain theme fields.
      return {
        ...DEFAULT_APP_SETTINGS, ...fromBackend,
        themeId: resolveTheme(fromBackend.themeId).id,
        performanceMode: resolvePerformance(fromBackend.performanceMode),
        interactionMode: normalizeTool(fromBackend.interactionMode),
        animationsEnabled:fromBackend.animationsEnabled !== false,
        showSceneObjects:fromBackend.showSceneObjects !== false,
        autoPlows:fromBackend.autoPlows === true,
        reduceMotion:fromBackend.reduceMotion === true,
        decorationDensity:typeof fromBackend.decorationDensity==='number'&&Number.isFinite(fromBackend.decorationDensity)?Math.max(0,Math.min(1,fromBackend.decorationDensity)):.72,
        visualScale:typeof fromBackend.visualScale==='number'&&Number.isFinite(fromBackend.visualScale)?Math.max(.5,Math.min(2,fromBackend.visualScale)):1,
        plowInterval:typeof fromBackend.plowInterval==='number'&&Number.isFinite(fromBackend.plowInterval)?Math.max(7,Math.min(180,fromBackend.plowInterval)):20,
        automaticTheme: fromBackend.automaticTheme === true,
      };
    }
  } catch {
    // Non-Tauri preview fallback
  }
  return loadSettings();
}

const inTauri = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function broadcastSettings(value: AppSettings): Promise<void> {
  saveSettings(value);
  if (!inTauri()) return; // Browser preview: localStorage is the only store.
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('save_desktop_settings', { settings: value });
  } catch (err) {
    console.warn('[snowy] native settings save failed; values apply this session only', err);
  }
}

export async function broadcastClearSnow(): Promise<void> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('clear_desktop_snow');
  } catch {
    // Web environment fallback
  }
}

