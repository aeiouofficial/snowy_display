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
