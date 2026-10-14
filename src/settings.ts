import { DEFAULT_SETTINGS, type Settings } from './physics.ts';
export const SETTINGS_KEY = 'snowy-display/settings-v1';
export const SETTINGS_EVENT = 'snowy-display:settings';
export const CLEAR_EVENT = 'snowy-display:clear-snow';
export type AppSettings = Settings & { enabled: boolean };
export const DEFAULT_APP_SETTINGS: AppSettings = { ...DEFAULT_SETTINGS, enabled: true };
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
    return current;
  } catch { return { ...DEFAULT_APP_SETTINGS }; }
}
export function saveSettings(value: AppSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(value)); }
  catch (err) { console.warn('[snowy] could not persist settings', err); }
}

export async function fetchSettings(): Promise<AppSettings> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const fromBackend = await invoke<AppSettings>('get_desktop_settings');
    if (fromBackend && typeof fromBackend.snowfall === 'number') {
      saveSettings(fromBackend);
      return fromBackend;
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

