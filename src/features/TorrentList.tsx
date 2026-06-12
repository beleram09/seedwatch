import React, { useState } from 'react';
import { Chip, Btn, Bar, TDot, CheckBox, Page, DeleteBtn } from '../components/ui';
import * as I from '../components/icons';
import { useTorrents, useTorrentAction, formatSpeed, formatDuration, formatDaysAgo, formatEta, formatBytes, statusCounts } from '../hooks/useTorrents';
import { trackerBg } from '../components/ui';
import type { EnrichedTorrent } from '../lib/hnr';
import { TorrentStatus } from '../lib/transmission';
import { useUIStore } from '../store/useStore';
import { useIsMobile } from '../components/layout';

type Filter = string;
type SortKey = 'risk' | 'ratio' | 'size' | 'speed-up' | 'speed-down' | 'date' | 'name' | 'status' | 'peers' | 'progress' | 'uploaded' | 'downloaded';
type SortDir = 'asc' | 'desc';
type ViewMode = 'cards' | 'table';

function sortTorrents(list: EnrichedTorrent[], key: SortKey, dir: SortDir): EnrichedTorrent[] {
  const d = dir === 'asc' ? 1 : -1;
  const sorted = [...list];
  switch (key) {
    case 'name': return sorted.sort((a, b) => d * a.torrent.name.localeCompare(b.torrent.name));
    case 'ratio': return sorted.sort((a, b) => d * (a.torrent.uploadRatio - b.torrent.uploadRatio));
    case 'size': return sorted.sort((a, b) => d * (a.torrent.totalSize - b.torrent.totalSize));
    case 'speed-up': return sorted.sort((a, b) => d * (a.torrent.rateUpload - b.torrent.rateUpload));
    case 'speed-down': return sorted.sort((a, b) => d * (a.torrent.rateDownload - b.torrent.rateDownload));
    case 'uploaded': return sorted.sort((a, b) => d * (a.torrent.uploadedEver - b.torrent.uploadedEver));
    case 'downloaded': return sorted.sort((a, b) => d * (a.torrent.downloadedEver - b.torrent.downloadedEver));
    case 'date': return sorted.sort((a, b) => d * (a.torrent.addedDate - b.torrent.addedDate));
    case 'peers': return sorted.sort((a, b) => d * (a.torrent.peersConnected - b.torrent.peersConnected));
    case 'progress': return sorted.sort((a, b) => d * (a.torrent.percentDone - b.torrent.percentDone));
    case 'status': return sorted.sort((a, b) => d * (a.torrent.status - b.torrent.status));
    case 'risk':
    default: return sorted; // already sorted by enrichAndSort
  }
}

// Default sort direction when clicking a column for the first time
const DEFAULT_DIR: Partial<Record<SortKey, SortDir>> = {
  name: 'asc', date: 'desc', size: 'desc', ratio: 'asc',
  'speed-up': 'desc', 'speed-down': 'desc', uploaded: 'desc', downloaded: 'desc',
  peers: 'desc', progress: 'desc', status: 'asc',
};

interface ListProps { onSelect?: (id: number) => void; initialFilter?: string }

export const TorrentList: React.FC<ListProps> = ({ onSelect, initialFilter = 'all' }) => {
  const { data: torrents = [], isLoading } = useTorrents();
  const action = useTorrentAction();
  const { t } = useUIStore();
  const isMobile = useIsMobile();

  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('risk');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [view, setView] = useState<ViewMode>('table');

  const counts = statusCounts(torrents);

  const cycleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(DEFAULT_DIR[key] ?? 'desc');
    }
  };

  const txCounts = React.useMemo(() => {
    let dl = 0, seed = 0, paused = 0, checking = 0, errored = 0;
    for (const t of torrents) {
      const s = t.torrent.status;
      if (s === TorrentStatus.Download || s === TorrentStatus.DownloadWait) dl++;
      else if (s === TorrentStatus.Seed || s === TorrentStatus.SeedWait) seed++;
      else if (s === TorrentStatus.Stopped) paused++;
      else if (s === TorrentStatus.Check || s === TorrentStatus.CheckWait) checking++;
      if (t.torrent.error > 0) errored++;
    }
    return { dl, seed, paused, checking, errored };
  }, [torrents]);

  const sorted = React.useMemo(() => {
    const q = search.toLowerCase();
    const list = torrents.filter(t => {
      // Search filter
      if (q && !t.torrent.name.toLowerCase().includes(q)) return false;
      // Status filter
      if (filter === 'all') return true;
      if (['danger', 'warn', 'ok', 'downloading'].includes(filter)) return t.status === filter;
      if (filter === 'tx-dl') return t.torrent.status === TorrentStatus.Download || t.torrent.status === TorrentStatus.DownloadWait;
      if (filter === 'tx-seed') return t.torrent.status === TorrentStatus.Seed || t.torrent.status === TorrentStatus.SeedWait;
      if (filter === 'tx-paused') return t.torrent.status === TorrentStatus.Stopped;
      if (filter === 'tx-check') return t.torrent.status === TorrentStatus.Check || t.torrent.status === TorrentStatus.CheckWait;
      if (filter === 'tx-error') return t.torrent.error > 0;
      return t.trackerKey === filter;
    });
    return sortTorrents(list, sortKey, sortDir);
  }, [torrents, filter, search, sortKey, sortDir]);

  const trackerKeys = Array.from(new Set(torrents.map(t => t.trackerKey).filter(Boolean) as string[]));

  const toggleSel = (id: number) => {
    const n = new Set(sel);
    n.has(id) ? n.delete(id) : n.add(id);
    setSel(n);
  };

  const toggleAll = () => {
    if (sel.size === sorted.length) setSel(new Set());
    else setSel(new Set(sorted.map(t => t.torrent.id)));
  };

  if (isLoading) return <Page><div className="empty">{t('list.loading')}</div></Page>;

  const filterPills = [
    { id: 'all',    label: t('list.all'),       count: counts.total, kind: '' },
    { id: 'danger', label: t('list.risk'),      count: counts.danger, kind: 'danger' },
    { id: 'warn',   label: t('list.watch'),     count: counts.warn, kind: 'warn' },
    { id: 'ok',     label: t('list.deletable'), count: counts.ok, kind: 'safe' },
  ] as const;

  const txPills = [
    { id: 'tx-dl',     label: t('list.dl'),      count: txCounts.dl },
    { id: 'tx-seed',   label: t('list.seed'),     count: txCounts.seed },
    { id: 'tx-paused', label: t('list.paused'),   count: txCounts.paused },
    { id: 'tx-check',  label: t('list.checking'), count: txCounts.checking },
    { id: 'tx-error',  label: t('list.error'),    count: txCounts.errored },
  ] as const;

  return (
    <Page>
      {/* ── Mobile toolbar ────────────────────────────────────────── */}
      {isMobile ? (
        <>
          {/* Search */}
          <div className="search" style={{ marginBottom: 8 }}>
            <I.Search size={13} />
            <input className="input" style={{ fontSize: 13 }}
              placeholder={t('list.search') || 'Search...'}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {/* Compact filter row */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, WebkitOverflowScrolling: 'touch' }}>
            {filterPills.map(p => (
              <button key={p.id} className={`filter-pill ${filter === p.id ? 'active' : ''}`}
                onClick={() => setFilter(p.id)}>
                {p.kind && <span style={{ width: 5, height: 5, borderRadius: '50%',
                  background: p.kind === 'danger' ? 'var(--danger)' : p.kind === 'warn' ? 'var(--warn)' : 'var(--safe)' }} />}
                {p.count}
              </button>
            ))}
            {txPills.filter(p => p.count > 0).map(p => (
              <button key={p.id} className={`filter-pill ${filter === p.id ? 'active' : ''}`}
                onClick={() => setFilter(p.id)}>
                {p.label} {p.count}
              </button>
            ))}
            {trackerKeys.map(k => (
              <button key={k} className={`filter-pill ${filter === k ? 'active' : ''}`}
                onClick={() => setFilter(k)}>
                <span style={{ width: 6, height: 6, background: trackerBg(k), borderRadius: 2 }} />{k}
              </button>
            ))}
          </div>

          {/* Selection bar mobile */}
          {sel.size > 0 && (
            <div className="row" style={{ gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <Chip kind="solid">{sel.size}</Chip>
              <Btn size="sm" icon={<I.Play size={12} />} onClick={() => action.mutate({ method: 'torrent-start', ids: [...sel] })} />
              <Btn size="sm" icon={<I.Pause size={12} />} onClick={() => action.mutate({ method: 'torrent-stop', ids: [...sel] })} />
              <DeleteBtn onDelete={(wf) => action.mutate({ method: 'torrent-remove', ids: [...sel], extra: { 'delete-local-data': wf } })} />
              <Btn size="sm" kind="ghost" icon={<I.X size={12} />} onClick={() => setSel(new Set())} />
            </div>
          )}

          {/* Mobile cards */}
          <div className="col" style={{ gap: 6 }}>
            {sorted.map(et => (
              <MobileCard key={et.torrent.id} et={et}
                onSelect={onSelect ? () => onSelect(et.torrent.id) : undefined}
                onAction={(method, extra) => action.mutate({ method, ids: [et.torrent.id], extra })}
              />
            ))}
            {sorted.length === 0 && <div className="empty">{t('list.empty')}</div>}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 12, color: 'var(--text-faint)', fontSize: 11, textAlign: 'center' }}>
            <span className="mono">{sorted.length}</span> {t('list.torrents')} · <span className="mono">{sorted.reduce((s, t) => s + t.sizeGb, 0).toFixed(1)} GB</span>
          </div>
        </>
      ) : (
      /* ── Desktop toolbar + content ──────────────────────────────── */
      <>
      {/* ── Primary filter bar (segmented) ───────────────────── */}
      <div className="filter-bar" style={{ marginBottom: 10 }}>
        <div className="seg-group">
          {filterPills.map(p => (
            <button key={p.id} className={`seg-item ${filter === p.id ? 'active' : ''}`}
              onClick={() => setFilter(p.id)}>
              {p.kind && <span className="seg-dot" style={{
                background: p.kind === 'danger' ? 'var(--danger)' : p.kind === 'warn' ? 'var(--warn)' : 'var(--safe)' }} />}
              {p.label}
              <span className="seg-count">{p.count}</span>
            </button>
          ))}
          <span className="seg-divider" />
          {txPills.map(p => p.count > 0 && (
            <button key={p.id} className={`seg-item sub ${filter === p.id ? 'active' : ''}`}
              onClick={() => setFilter(p.id)}>
              {p.label}
              <span className="seg-count">{p.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Secondary bar (search + trackers + view toggle) ─────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div className="search" style={{ width: 200 }}>
          <I.Search size={13} />
          <input className="input" style={{ fontSize: 12 }}
            placeholder={t('list.search') || 'Search...'}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {trackerKeys.map(k => (
          <button key={k} className={`filter-pill ${filter === k ? 'active' : ''}`}
            onClick={() => setFilter(k)}>
            <span style={{ width: 8, height: 8, background: trackerBg(k), borderRadius: 3 }} />
            <span className="mono">{k}</span>
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <div className="btn-group">
          <Btn size="sm" kind={view === 'cards' ? 'primary' : 'ghost'}
            icon={<I.ViewCards size={13} />} onClick={() => setView('cards')} />
          <Btn size="sm" kind={view === 'table' ? 'primary' : 'ghost'}
            icon={<I.ViewTable size={13} />} onClick={() => setView('table')} />
        </div>
      </div>

      {sel.size > 0 && (
        <div className="card card-pad-sm row" style={{ marginBottom: 12, background: 'var(--surface-2)' }}>
          <Chip kind="solid">{sel.size} {t('list.selected')}</Chip>
          <span style={{ flex: 1 }} />
          <Btn size="sm" icon={<I.Play size={13} />}
            onClick={() => action.mutate({ method: 'torrent-start', ids: [...sel] })}>{t('list.start')}</Btn>
          <Btn size="sm" icon={<I.Pause size={13} />}
            onClick={() => action.mutate({ method: 'torrent-stop', ids: [...sel] })}>{t('list.pause')}</Btn>
          <Btn size="sm" icon={<I.RotateCw size={13} />}
            onClick={() => action.mutate({ method: 'torrent-verify', ids: [...sel] })}>{t('list.verify')}</Btn>
          <DeleteBtn onDelete={(wf) => action.mutate({ method: 'torrent-remove', ids: [...sel], extra: { 'delete-local-data': wf } })} />
          <Btn size="sm" kind="ghost" icon={<I.X size={13} />} onClick={() => setSel(new Set())} />
        </div>
      )}

      {view === 'cards' ? (
        <div className="col" style={{ gap: 8 }}>
          {sorted.map(t => (
            <TorrentCard key={t.torrent.id} et={t}
              selected={sel.has(t.torrent.id)}
              onToggle={() => toggleSel(t.torrent.id)}
              onSelect={onSelect ? () => onSelect(t.torrent.id) : undefined}
              onAction={(method, extra) => action.mutate({ method, ids: [t.torrent.id], extra })}
            />
          ))}
          {sorted.length === 0 && <div className="empty">{t('list.empty')}</div>}
        </div>
      ) : (
        <TorrentTable
          torrents={sorted}
          sel={sel}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={cycleSort}
          onToggle={toggleSel}
          onToggleAll={toggleAll}
          onSelect={onSelect}
          onAction={(method, id, extra) => action.mutate({ method, ids: [id], extra })}
        />
      )}

      <div className="row" style={{ marginTop: 18, color: 'var(--text-faint)', fontSize: 12 }}>
        <span>
          <span className="mono">{sorted.length}</span> {t('list.torrents')} ·{' '}
          <span className="mono">{sorted.reduce((s, t) => s + t.sizeGb, 0).toFixed(1)} GB</span> {t('list.total')}
        </span>
      </div>
      </>
      )}
    </Page>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TABLE VIEW
// ═══════════════════════════════════════════════════════════════════════════

interface TableProps {
  torrents: EnrichedTorrent[];
  sel: Set<number>;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onSelect?: (id: number) => void;
  onAction: (method: 'torrent-stop' | 'torrent-start' | 'torrent-remove', id: number, extra?: Record<string, unknown>) => void;
}

const SortArrow: React.FC<{ active: boolean; dir: SortDir }> = ({ active, dir }) => (
  <span style={{ marginLeft: 4, opacity: active ? 1 : 0, transition: 'opacity 0.12s', fontSize: 10, verticalAlign: 1 }}>
    {dir === 'asc' ? '▲' : '▼'}
  </span>
);

// ── Column resize hook ──────────────────────────────────────────────────

// ── Column definitions ──────────────────────────────────────────────────

type ColId = 'check' | 'tracker' | 'name' | 'status' | 'size' | 'progress' | 'ratio' | 'uploaded' | 'downloaded' | 'up' | 'down' | 'seeds' | 'peers' | 'date' | 'actions';

const COL_I18N: Partial<Record<ColId, string>> = {
  name: 'th.name', status: 'th.status', size: 'th.size',
  progress: 'th.progress', ratio: 'th.ratio', peers: 'th.peers', date: 'th.added',
};

const COLUMNS: { id: ColId; label: string; sortAs?: SortKey; defaultW: number; min: number }[] = [
  { id: 'check',      label: '',              defaultW: 32,  min: 32 },
  { id: 'tracker',    label: '',              defaultW: 28,  min: 28 },
  { id: 'name',       label: 'Nom',           sortAs: 'name',       defaultW: 300, min: 100 },
  { id: 'status',     label: 'Statut',        sortAs: 'status',     defaultW: 70,  min: 50 },
  { id: 'size',       label: 'Taille',        sortAs: 'size',       defaultW: 80,  min: 50 },
  { id: 'progress',   label: 'Progression',   sortAs: 'progress',   defaultW: 140, min: 80 },
  { id: 'ratio',      label: 'Ratio',         sortAs: 'ratio',      defaultW: 65,  min: 45 },
  { id: 'uploaded',   label: '↑ Total',       sortAs: 'uploaded',   defaultW: 85,  min: 55 },
  { id: 'downloaded', label: '↓ Total',       sortAs: 'downloaded', defaultW: 85,  min: 55 },
  { id: 'up',         label: '↑ Vit.',        sortAs: 'speed-up',   defaultW: 80,  min: 50 },
  { id: 'down',       label: '↓ Vit.',        sortAs: 'speed-down', defaultW: 80,  min: 50 },
  { id: 'seeds',      label: 'S/L',           sortAs: 'peers',      defaultW: 55,  min: 40 },
  { id: 'peers',      label: 'Peers',         sortAs: 'peers',      defaultW: 55,  min: 40 },
  { id: 'date',       label: 'Ajouté',        sortAs: 'date',       defaultW: 85,  min: 60 },
  { id: 'actions',    label: '',              defaultW: 80,  min: 60 },
];

const RESIZABLE_COLS = new Set<ColId>(['name', 'status', 'size', 'progress', 'ratio', 'uploaded', 'downloaded', 'up', 'down', 'seeds', 'peers', 'date']);

function useColumnWidths() {
  const defaults = Object.fromEntries(COLUMNS.map(c => [c.id, c.defaultW])) as Record<ColId, number>;

  const [widths, setWidths] = useState<Record<ColId, number>>(() => {
    try {
      const saved = localStorage.getItem('tui-col-widths');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          const validated: Record<string, number> = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'number' && v >= 20 && v <= 2000) validated[k] = v;
          }
          return { ...defaults, ...validated };
        }
      }
    } catch { /* ignore */ }
    return defaults;
  });

  const startDrag = React.useCallback((colId: ColId, startX: number) => {
    const startW = widths[colId];
    const minW = COLUMNS.find(c => c.id === colId)?.min ?? 40;

    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(minW, startW + (ev.clientX - startX));
      setWidths(prev => {
        const next = { ...prev, [colId]: newW };
        localStorage.setItem('tui-col-widths', JSON.stringify(next));
        return next;
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [widths]);

  return { widths, startDrag };
}

const TorrentTable: React.FC<TableProps> = ({ torrents, sel, sortKey, sortDir, onSort, onToggle, onToggleAll, onSelect, onAction }) => {
  const { widths, startDrag } = useColumnWidths();
  const { t } = useUIStore();

  if (torrents.length === 0) return <div className="empty">{t('list.empty')}</div>;

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl" style={{ tableLayout: 'fixed', width: Object.values(widths).reduce((a, b) => a + b, 0) }}>
          <colgroup>
            {COLUMNS.map(c => <col key={c.id} style={{ width: widths[c.id] }} />)}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map(col => {
                if (col.id === 'check') {
                  return (
                    <th key={col.id} style={{ padding: '10px 10px' }}>
                      <CheckBox on={sel.size === torrents.length && torrents.length > 0} onChange={onToggleAll} />
                    </th>
                  );
                }
                if (!col.sortAs) return <th key={col.id} />;
                const active = sortKey === col.sortAs;
                const resizable = RESIZABLE_COLS.has(col.id);
                return (
                  <th key={col.id}
                    style={{ position: 'relative', cursor: 'pointer', userSelect: 'none', color: active ? 'var(--accent)' : undefined }}
                    onClick={() => onSort(col.sortAs!)}
                  >
                    {COL_I18N[col.id] ? t(COL_I18N[col.id]!) : col.label}
                    <SortArrow active={active} dir={sortDir} />
                    {resizable && (
                      <div
                        className="col-resize-handle"
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); startDrag(col.id, e.clientX); }}
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {torrents.map(et => (
              <TableRow key={et.torrent.id} et={et}
                selected={sel.has(et.torrent.id)}
                onToggle={() => onToggle(et.torrent.id)}
                onSelect={onSelect ? () => onSelect(et.torrent.id) : undefined}
                onAction={(method, extra) => onAction(method, et.torrent.id, extra)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface RowProps {
  et: EnrichedTorrent;
  selected: boolean;
  onToggle: () => void;
  onSelect?: () => void;
  onAction: (method: 'torrent-stop' | 'torrent-start' | 'torrent-remove', extra?: Record<string, unknown>) => void;
}

const TableRow: React.FC<RowProps> = ({ et, selected, onToggle, onSelect, onAction }) => {
  const { t: tr, lang } = useUIStore();
  const { torrent: t, status, trackerKey, hasRule, sizeGb } = et;
  const isDanger = hasRule && status === 'danger';
  const isWarn = hasRule && status === 'warn';
  const isSafe = hasRule && status === 'ok';
  const isDownloading = t.percentDone < 1;
  const isPaused = t.status === TorrentStatus.Stopped;
  const isChecking = t.status === TorrentStatus.Check || t.status === TorrentStatus.CheckWait;
  const hasError = t.error > 0;

  // Row class for subtle background tint
  const rowCls = isDanger ? 'row-danger' : isWarn ? 'row-warn' : selected ? 'selected' : '';

  // Status label
  const statusLabel = (): { text: string; color: string } => {
    if (hasError) return { text: tr('status.error'), color: 'var(--danger)' };
    if (isDanger) return { text: tr('status.hnr'), color: 'var(--danger)' };
    if (isWarn) return { text: tr('status.watch'), color: 'var(--warn)' };
    if (isSafe) return { text: 'OK', color: 'var(--safe)' };
    if (isDownloading) return { text: tr('status.dl'), color: 'var(--accent)' };
    if (isChecking) return { text: tr('status.check'), color: 'var(--warn)' };
    if (isPaused) return { text: tr('status.pause'), color: 'var(--text-faint)' };
    return { text: tr('status.seed'), color: 'var(--safe)' };
  };

  const st = statusLabel();

  // Progress bar: download % when downloading, full when seeding
  const progressPct = t.percentDone * 100;
  const progressKind = isDownloading ? '' : 'safe';
  const progressLabel = isDownloading
    ? `${progressPct.toFixed(0)}%`
    : '';

  return (
    <tr className={rowCls}>
      <td style={{ padding: '8px 10px' }}>
        <CheckBox on={selected} onChange={onToggle} />
      </td>
      {/* Status dot */}
      <td style={{ padding: '8px 4px' }}>
        {trackerKey ? (
          <span style={{
            display: 'inline-block', width: 18, height: 18, borderRadius: 5,
            background: trackerBg(trackerKey),
            fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-mono)',
            color: '#0a0c10', textAlign: 'center', lineHeight: '18px',
          }}>
            {trackerKey.slice(0, 2).toUpperCase()}
          </span>
        ) : (
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: st.color,
            boxShadow: isDanger ? `0 0 6px ${st.color}` : 'none',
          }} />
        )}
      </td>
      {/* Name */}
      <td style={{ maxWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="mono" style={{
            fontSize: 12.5, fontWeight: 500, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            cursor: onSelect ? 'pointer' : 'default',
          }} onClick={onSelect}>
            {t.name}
          </span>
          {t.labels?.map(l => (
            <span key={l} className="mono" style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 3,
              background: 'var(--accent-glow)', color: 'var(--accent)',
              whiteSpace: 'nowrap',
            }}>{l}</span>
          ))}
        </div>
      </td>
      {/* Status */}
      <td>
        <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: st.color }}>
          {st.text}
        </span>
      </td>
      {/* Size */}
      <td className="mono tabular" style={{ fontSize: 12 }}>{sizeGb < 1 ? formatBytes(t.totalSize) : `${sizeGb} GB`}</td>
      {/* Progress */}
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bar value={progressPct} max={100} kind={progressKind} style={{ flex: 1 }} />
          <span className="mono tabular" style={{ fontSize: 10, minWidth: 36, textAlign: 'right', color: isDownloading ? 'var(--accent)' : 'var(--text-faint)' }}>
            {isDownloading ? progressLabel : '100%'}
          </span>
        </div>
        {isDownloading && t.eta >= 0 && (
          <span className="mono faint" style={{ fontSize: 9, marginTop: 2, display: 'block' }}>
            ETA {formatEta(t.eta)}
          </span>
        )}
      </td>
      {/* Ratio */}
      <td>
        <span className="mono tabular" style={{
          fontSize: 12, fontWeight: 600,
          color: !hasRule ? 'var(--text)' : isSafe ? 'var(--safe)' : isDanger ? 'var(--danger)' : isWarn ? 'var(--warn)' : 'var(--text)',
        }}>
          {t.uploadRatio.toFixed(2)}
        </span>
      </td>
      {/* Uploaded total */}
      <td className="mono tabular" style={{ fontSize: 11, color: t.uploadedEver > 0 ? 'var(--safe)' : 'var(--text-mute)' }}>
        {t.uploadedEver > 0 ? formatBytes(t.uploadedEver) : '—'}
      </td>
      {/* Downloaded total */}
      <td className="mono tabular" style={{ fontSize: 11, color: 'var(--text-soft)' }}>
        {t.downloadedEver > 0 ? formatBytes(t.downloadedEver) : '—'}
      </td>
      {/* Upload speed */}
      <td className="mono tabular" style={{ fontSize: 11, color: t.rateUpload > 0 ? 'var(--safe)' : 'var(--text-mute)' }}>
        {t.rateUpload > 0 ? formatSpeed(t.rateUpload) : '—'}
      </td>
      {/* Download speed */}
      <td className="mono tabular" style={{ fontSize: 11, color: t.rateDownload > 0 ? 'var(--accent)' : 'var(--text-mute)' }}>
        {t.rateDownload > 0 ? formatSpeed(t.rateDownload) : '—'}
      </td>
      {/* Seeders/Leechers from tracker */}
      <td className="mono tabular" style={{ fontSize: 11 }}>
        {t.trackerStats?.[0] ? (
          <span>
            <span style={{ color: 'var(--safe)' }}>{t.trackerStats[0].seederCount >= 0 ? t.trackerStats[0].seederCount : '?'}</span>
            <span className="faint">/</span>
            <span style={{ color: 'var(--text-soft)' }}>{t.trackerStats[0].leecherCount >= 0 ? t.trackerStats[0].leecherCount : '?'}</span>
          </span>
        ) : '—'}
      </td>
      {/* Peers connected */}
      <td className="mono tabular" style={{ fontSize: 12, color: t.peersConnected > 0 ? 'var(--text)' : 'var(--text-mute)' }}>
        {t.peersConnected}
      </td>
      {/* Added */}
      <td className="mono" style={{ fontSize: 11, color: 'var(--text-soft)' }}>
        {formatDaysAgo(t.addedDate, lang)}
      </td>
      {/* Actions */}
      <td style={{ padding: '6px 8px' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {isPaused ? (
            <Btn size="sm" kind="ghost" icon={<I.Play size={12} />} title={tr('action.start')}
              onClick={() => onAction('torrent-start')} />
          ) : (
            <Btn size="sm" kind="ghost" icon={<I.Pause size={12} />} title={tr('action.pause')}
              onClick={() => onAction('torrent-stop')} />
          )}
          <DeleteBtn onDelete={(wf) => onAction('torrent-remove', { 'delete-local-data': wf })} />
          {onSelect && (
            <Btn size="sm" kind="ghost" icon={<I.ChevronR size={12} />} title={tr('action.detail')}
              onClick={onSelect} />
          )}
        </div>
      </td>
    </tr>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// CARD VIEW (existing)
// ═══════════════════════════════════════════════════════════════════════════

interface TCardProps {
  et: EnrichedTorrent;
  selected: boolean;
  onToggle: () => void;
  onSelect?: () => void;
  onAction: (method: 'torrent-stop' | 'torrent-start' | 'torrent-remove', extra?: Record<string, unknown>) => void;
}

const TorrentCard: React.FC<TCardProps> = ({ et, selected, onToggle, onSelect, onAction }) => {
  const { t: tr, lang } = useUIStore();
  const { torrent: t, status, trackerKey, ratioProgress, seedtimeProgress, thresholds, sizeGb, hasRule } = et;
  const isDanger = hasRule && status === 'danger';
  const isWarn = hasRule && status === 'warn';
  const isSafe = hasRule && status === 'ok';
  const isDownloading = t.percentDone < 1;
  const isPaused = t.status === TorrentStatus.Stopped;
  const hasError = t.error > 0;

  const trackerName = trackerKey ?? '';

  return (
    <div className="card" style={{
      borderColor: isDanger ? 'oklch(0.45 0.13 18 / 0.5)' : isWarn ? 'oklch(0.45 0.14 75 / 0.4)' : hasError ? 'oklch(0.45 0.13 18 / 0.3)' : 'var(--line)',
      transition: 'border-color 0.15s',
    }}>
      <div className="row" style={{ padding: '12px 16px', gap: 12 }}>
        <div style={{
          width: 3, alignSelf: 'stretch', borderRadius: 2, marginRight: -4,
          background: isDanger ? 'var(--danger)' : isWarn ? 'var(--warn)' : isSafe ? 'var(--safe)' :
            isDownloading ? 'var(--accent)' : 'var(--text-mute)',
          boxShadow: isDanger ? '0 0 12px var(--danger)' : isDownloading ? '0 0 8px var(--accent)' : 'none',
        }} />

        <CheckBox on={selected} onChange={onToggle} />
        {trackerKey && <TDot id={trackerKey} name={trackerName} size="lg" />}

        <div className="col" style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="mono" style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              cursor: onSelect ? 'pointer' : 'default' }}
              onClick={onSelect}>
              {t.name}
            </span>
            {hasRule && (
              <Chip kind={isDanger ? 'danger' : isWarn ? 'warn' : isSafe ? 'safe' : ''} pulse={isDanger}>
                {isDanger ? tr('status.hnr') : isWarn ? tr('status.watch') : isSafe ? tr('status.deletable') : status}
              </Chip>
            )}
            {hasError && <Chip kind="danger">{t.errorString || tr('status.error')}</Chip>}
            {isPaused && !hasError && <Chip>{tr('status.pause')}</Chip>}
            {t.labels?.map(l => (
              <Chip key={l} size="sm" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>{l}</Chip>
            ))}
          </div>
          <div className="row" style={{ gap: 14, fontSize: 12, color: 'var(--text-soft)' }}>
            <span className="row" style={{ gap: 4 }}><I.HardDrive size={11} /><span className="mono">{sizeGb} GB</span></span>
            <span className="row" style={{ gap: 4 }}><I.Clock size={11} /><span className="mono">{formatDaysAgo(t.addedDate, lang)}</span></span>
            {t.rateUpload > 0 && (
              <span className="row" style={{ gap: 4, color: 'var(--safe)' }}><I.ArrowU size={11} /><span className="mono">{formatSpeed(t.rateUpload)}</span></span>
            )}
            {t.rateDownload > 0 && (
              <span className="row" style={{ gap: 4, color: 'var(--accent)' }}><I.ArrowD size={11} /><span className="mono">{formatSpeed(t.rateDownload)}</span></span>
            )}
            {isDownloading && t.eta >= 0 && (
              <span className="row" style={{ gap: 4 }}><I.Clock size={11} /><span className="mono">ETA {formatEta(t.eta)}</span></span>
            )}
            <span className="row" style={{ gap: 4 }}><I.Users size={11} /><span className="mono">{t.peersConnected}</span></span>
          </div>
        </div>

        {isDownloading && (
          <div style={{ width: 110 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="field-label" style={{ marginBottom: 0 }}>DL</span>
              <span className="mono tabular" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                {(t.percentDone * 100).toFixed(1)}%
              </span>
            </div>
            <Bar value={t.percentDone * 100} max={100} />
          </div>
        )}

        {!isDownloading && (
          <div style={{ width: 110 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="field-label" style={{ marginBottom: 0 }}>Ratio</span>
              <span className="mono tabular" style={{ fontSize: 13, fontWeight: 600,
                color: !hasRule ? 'var(--text)' : t.uploadRatio >= thresholds.minRatio ? 'var(--safe)' : isDanger ? 'var(--danger)' : 'var(--warn)' }}>
                {t.uploadRatio.toFixed(2)}
              </span>
            </div>
            <Bar value={hasRule ? ratioProgress : Math.min(100, t.uploadRatio * 100)} max={100}
              kind={!hasRule ? '' : t.uploadRatio >= thresholds.minRatio ? 'safe' : isDanger ? 'danger' : 'warn'} />
          </div>
        )}

        {!isDownloading && hasRule && thresholds.minSeedtime != null && (
          <div style={{ width: 110 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="field-label" style={{ marginBottom: 0 }}>Seed</span>
              <span className="mono tabular" style={{ fontSize: 13, fontWeight: 600,
                color: (seedtimeProgress ?? 0) >= 100 ? 'var(--safe)' : isDanger ? 'var(--danger)' : 'var(--text)' }}>
                {formatDuration(t.secondsSeeding)}
              </span>
            </div>
            <Bar value={seedtimeProgress ?? 0} max={100}
              kind={(seedtimeProgress ?? 0) >= 100 ? 'safe' : isDanger ? 'danger' : 'warn'} />
          </div>
        )}

        <div className="row" style={{ gap: 4 }}>
          {isPaused ? (
            <Btn size="sm" icon={<I.Play size={13} />} title={tr('action.start')}
              onClick={() => onAction('torrent-start')} />
          ) : (
            <Btn size="sm" icon={<I.Pause size={13} />} title={tr('action.pause')}
              onClick={() => onAction('torrent-stop')} />
          )}
          <DeleteBtn onDelete={(wf) => onAction('torrent-remove', { 'delete-local-data': wf })} />
          {onSelect && (
            <Btn size="sm" kind="ghost" icon={<I.ChevronR size={13} />} title={tr('action.detail')} onClick={onSelect} />
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE CARD VIEW
// ═══════════════════════════════════════════════════════════════════════════

interface MobileCardProps {
  et: EnrichedTorrent;
  onSelect?: () => void;
  onAction: (method: 'torrent-stop' | 'torrent-start' | 'torrent-remove', extra?: Record<string, unknown>) => void;
}

const MobileCard: React.FC<MobileCardProps> = ({ et, onSelect, onAction }) => {
  const { torrent: t, status, trackerKey, ratioProgress, seedtimeProgress, thresholds, sizeGb, hasRule } = et;
  const isDanger = hasRule && status === 'danger';
  const isWarn = hasRule && status === 'warn';
  const isSafe = hasRule && status === 'ok';
  const isDownloading = t.percentDone < 1;
  const isPaused = t.status === TorrentStatus.Stopped;
  const hasError = t.error > 0;

  const accentColor = isDanger ? 'var(--danger)' : isWarn ? 'var(--warn)' : isSafe ? 'var(--safe)' :
    isDownloading ? 'var(--accent)' : 'var(--text-mute)';

  return (
    <div className="card" onClick={onSelect} style={{
      borderColor: isDanger ? 'oklch(0.45 0.13 18 / 0.5)' : isWarn ? 'oklch(0.45 0.14 75 / 0.4)' : 'var(--line)',
      cursor: onSelect ? 'pointer' : 'default',
      borderLeft: `3px solid ${accentColor}`,
    }}>
      <div style={{ padding: '10px 12px' }}>
        {/* Row 1: tracker dot + name */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
          {trackerKey && (
            <span style={{
              display: 'inline-block', width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 1,
              background: trackerBg(trackerKey),
              fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
              color: '#0a0c10', textAlign: 'center', lineHeight: '24px',
            }}>{trackerKey.slice(0, 2).toUpperCase()}</span>
          )}
          <span className="mono" style={{
            fontSize: 12, fontWeight: 500, flex: 1, lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{t.name}</span>
        </div>

        {/* Row 2: chips + size */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {hasRule && (
            <Chip kind={isDanger ? 'danger' : isWarn ? 'warn' : isSafe ? 'safe' : ''} pulse={isDanger} size="sm">
              {isDanger ? 'H&R' : isWarn ? 'surv.' : isSafe ? 'ok' : status}
            </Chip>
          )}
          {hasError && <Chip kind="danger" size="sm">err</Chip>}
          {isPaused && !hasError && <Chip size="sm">pause</Chip>}
          <span style={{ flex: 1 }} />
          <span className="mono faint" style={{ fontSize: 11 }}>{sizeGb} GB</span>
        </div>

        {/* Row 3: progress bars */}
        {isDownloading ? (
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span className="mono" style={{ fontSize: 10, color: 'var(--accent)' }}>{(t.percentDone * 100).toFixed(1)}%</span>
              {t.eta >= 0 && <span className="mono faint" style={{ fontSize: 10 }}>ETA {formatEta(t.eta)}</span>}
            </div>
            <Bar value={t.percentDone * 100} max={100} />
          </div>
        ) : hasRule ? (
          <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span className="mono faint" style={{ fontSize: 9 }}>RATIO</span>
                <span className="mono" style={{ fontSize: 11, fontWeight: 600,
                  color: t.uploadRatio >= thresholds.minRatio ? 'var(--safe)' : isDanger ? 'var(--danger)' : 'var(--warn)' }}>
                  {t.uploadRatio.toFixed(2)}
                </span>
              </div>
              <Bar value={ratioProgress} max={100}
                kind={t.uploadRatio >= thresholds.minRatio ? 'safe' : isDanger ? 'danger' : 'warn'} />
            </div>
            {thresholds.minSeedtime != null && (
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span className="mono faint" style={{ fontSize: 9 }}>SEED</span>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 600,
                    color: (seedtimeProgress ?? 0) >= 100 ? 'var(--safe)' : isDanger ? 'var(--danger)' : 'var(--text)' }}>
                    {formatDuration(t.secondsSeeding)}
                  </span>
                </div>
                <Bar value={seedtimeProgress ?? 0} max={100}
                  kind={(seedtimeProgress ?? 0) >= 100 ? 'safe' : isDanger ? 'danger' : 'warn'} />
              </div>
            )}
          </div>
        ) : null}

        {/* Row 4: speeds + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="mono faint" style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.rateUpload > 0 && <span style={{ color: 'var(--safe)' }}>↑{formatSpeed(t.rateUpload)}</span>}
            {t.rateDownload > 0 && <span style={{ color: 'var(--accent)' }}>↓{formatSpeed(t.rateDownload)}</span>}
            <span><I.Users size={9} style={{ verticalAlign: -1 }} /> {t.peersConnected}</span>
          </span>
          <span style={{ flex: 1 }} />
          {isPaused ? (
            <Btn size="sm" kind="ghost" icon={<I.Play size={14} />}
              onClick={e => { e.stopPropagation(); onAction('torrent-start'); }} />
          ) : (
            <Btn size="sm" kind="ghost" icon={<I.Pause size={14} />}
              onClick={e => { e.stopPropagation(); onAction('torrent-stop'); }} />
          )}
          <DeleteBtn onDelete={(wf) => onAction('torrent-remove', { 'delete-local-data': wf })} />
        </div>
      </div>
    </div>
  );
};
