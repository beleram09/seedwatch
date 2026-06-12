import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TrackerRule, TrackerThresholds } from '../lib/hnr';
import { type Lang, t as translate, detectLang } from '../lib/i18n';
import { loadSettings, saveSettings, type SyncedSettings } from '../lib/settings-sync';

// ── Settings store (H&R rules) ───────────────────────────────────────────

interface SettingsState {
  trackerRules: TrackerRule[];
  _synced: boolean;
  setTrackerRule: (rule: TrackerRule) => void;
  removeTrackerRule: (id: string) => void;
  getThresholdsOverride: () => Record<string, TrackerThresholds>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      trackerRules: [],
      _synced: false,

      setTrackerRule: (rule) =>
        set((s) => {
          const idx = s.trackerRules.findIndex((r) => r.trackerId === rule.trackerId);
          const next = [...s.trackerRules];
          if (idx >= 0) next[idx] = rule;
          else next.push(rule);
          return { trackerRules: next };
        }),

      removeTrackerRule: (id) =>
        set((s) => ({
          trackerRules: s.trackerRules.filter((r) => r.trackerId !== id),
        })),

      getThresholdsOverride: () => {
        const map: Record<string, TrackerThresholds> = {};
        for (const rule of get().trackerRules) {
          map[rule.trackerId] = {
            minRatio: rule.minRatio,
            minSeedtime: rule.minSeedtimeH != null ? rule.minSeedtimeH * 3600 : null,
            freeleech: rule.freeleech,
            combine: rule.combine,
          };
        }
        return map;
      },
    }),
    { name: 'seedwatch-settings' },
  ),
);

// ── UI store (theme + language) ──────────────────────────────────────────

export type Theme = 'dark' | 'light';

interface UIState {
  lang: Lang;
  theme: Theme;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      lang: detectLang(),
      theme: 'dark' as Theme,

      setLang: (lang) => set({ lang }),
      setTheme: (theme) => {
        if (theme !== 'dark' && theme !== 'light') return;
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },

      t: (key, params) => translate(key, get().lang, params),
    }),
    {
      name: 'seedwatch-prefs',
    },
  ),
);

// ── Sync to Transmission's settings.json ─────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function collectSettings(): SyncedSettings {
  const { trackerRules } = useSettingsStore.getState();
  const { lang, theme } = useUIStore.getState();
  let colWidths: Record<string, number> | undefined;
  try {
    const raw = localStorage.getItem('tui-col-widths');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        const cw: Record<string, number> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'number' && v >= 20 && v <= 2000) cw[k] = v;
        }
        if (Object.keys(cw).length > 0) colWidths = cw;
      }
    }
  } catch { /* ignore */ }
  return { trackerRules, lang, theme, colWidths };
}

function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveSettings(collectSettings());
  }, 2000);
}

function applyRemoteSettings(remote: SyncedSettings) {
  const settings = useSettingsStore.getState();
  const ui = useUIStore.getState();

  // Server wins if local has no rules yet (fresh browser)
  if (remote.trackerRules && settings.trackerRules.length === 0) {
    useSettingsStore.setState({ trackerRules: remote.trackerRules as TrackerRule[] });
  }
  // Server wins for lang/theme if localStorage didn't have prefs yet
  const hasLocalPrefs = !!localStorage.getItem('seedwatch-prefs');
  if (!hasLocalPrefs) {
    if (remote.lang) ui.setLang(remote.lang as Lang);
    if (remote.theme) ui.setTheme(remote.theme as Theme);
  }
  if (remote.colWidths && !localStorage.getItem('tui-col-widths')) {
    localStorage.setItem('tui-col-widths', JSON.stringify(remote.colWidths));
  }
}

// Initial load from Transmission on startup
export async function initSettingsSync() {
  const remote = await loadSettings();
  if (remote) applyRemoteSettings(remote);
  useSettingsStore.setState({ _synced: true });

  // Save to Transmission whenever stores change
  useSettingsStore.subscribe(debouncedSave);
  useUIStore.subscribe(debouncedSave);

  // Also save when column widths change in localStorage
  window.addEventListener('storage', (e) => {
    if (e.key === 'tui-col-widths') debouncedSave();
  });

  // Initial save if server had nothing
  if (!remote) debouncedSave();
}
