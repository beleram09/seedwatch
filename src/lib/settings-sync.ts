// Persist UI settings (H&R rules, lang, theme, column widths) inside Transmission's
// `default-trackers` session field. This field is stored in settings.json on disk,
// so it survives container restarts and works across browsers.
//
// Format: real tracker URLs stay untouched. We append one line prefixed with #TUI:
// followed by base64-encoded JSON. Transmission treats it as an invalid tracker URL
// and ignores it for announce purposes.

import { rpc } from './transmission';

const MARKER = '#TUI:';

export interface SyncedSettings {
  trackerRules?: unknown[];
  lang?: string;
  theme?: string;
  colWidths?: Record<string, number>;
}

const VALID_COMBINES = ['OR', 'AND', 'RATIO_ONLY', 'TIME_ONLY'];
const VALID_FAIL_ACTIONS = ['flag', 'pause', 'delete', 'delete-files'];

function isTrackerRule(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.trackerId === 'string' &&
    typeof r.minRatio === 'number' && r.minRatio >= 0 &&
    (r.minSeedtimeH === null || (typeof r.minSeedtimeH === 'number' && r.minSeedtimeH >= 0)) &&
    typeof r.combine === 'string' && VALID_COMBINES.includes(r.combine) &&
    typeof r.failAction === 'string' && VALID_FAIL_ACTIONS.includes(r.failAction);
}

function validateSyncedSettings(raw: unknown): SyncedSettings | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const result: SyncedSettings = {};

  if (Array.isArray(obj.trackerRules)) {
    result.trackerRules = obj.trackerRules.filter(isTrackerRule);
  }
  if (obj.lang === 'fr' || obj.lang === 'en') result.lang = obj.lang;
  if (obj.theme === 'dark' || obj.theme === 'light') result.theme = obj.theme;
  if (typeof obj.colWidths === 'object' && obj.colWidths !== null) {
    const cw: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj.colWidths as Record<string, unknown>)) {
      if (typeof v === 'number' && v >= 20 && v <= 2000) cw[k] = v;
    }
    if (Object.keys(cw).length > 0) result.colWidths = cw;
  }

  return result;
}

/** Read settings from Transmission's default-trackers field */
export async function loadSettings(): Promise<SyncedSettings | null> {
  try {
    const session = await rpc<Record<string, unknown>>('session-get');
    const raw = (session['default-trackers'] as string) ?? '';
    const lines = raw.split('\n');
    const tuiLine = lines.find(l => l.startsWith(MARKER));
    if (!tuiLine) return null;
    const b64 = tuiLine.slice(MARKER.length);
    return validateSyncedSettings(JSON.parse(atob(b64)));
  } catch {
    return null;
  }
}

/** Save settings into Transmission's default-trackers field, preserving real tracker URLs */
export async function saveSettings(settings: SyncedSettings): Promise<void> {
  try {
    const session = await rpc<Record<string, unknown>>('session-get');
    const raw = (session['default-trackers'] as string) ?? '';
    // Keep all lines except the old TUI line
    const lines = raw.split('\n').filter(l => !l.startsWith(MARKER));
    // Append our settings line
    const b64 = btoa(JSON.stringify(settings));
    lines.push(`${MARKER}${b64}`);
    await rpc('session-set', { 'default-trackers': lines.join('\n') });
  } catch {
    // Silently fail — localStorage is still the fallback
  }
}
