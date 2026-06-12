import React, { useState } from 'react';
import { Card, Chip, Btn, CheckBox, Bar, Page, SortTh, useSortable } from '../components/ui';
import * as I from '../components/icons';
import { useTorrents, useTorrentAction, formatDuration, formatDurationLong } from '../hooks/useTorrents';
import { trackerBg } from '../components/ui';
import { useUIStore } from '../store/useStore';
import type { EnrichedTorrent } from '../lib/hnr';

type TriageSortKey = 'name' | 'ratio' | 'seed' | 'size' | 'remaining';

export const HnrTriage: React.FC = () => {
  const { data: torrents = [] } = useTorrents();
  const action = useTorrentAction();
  const { t } = useUIStore();

  const tracked = torrents.filter(t => t.hasRule);
  const safe = tracked.filter(t => t.status === 'ok');
  const atRisk = tracked.filter(t => t.status === 'danger' || t.status === 'warn');
  const downloading = tracked.filter(t => t.status === 'downloading');

  const [sel, setSel] = useState<Set<number>>(new Set());
  const safeSort = useSortable<TriageSortKey>('ratio', 'desc');
  const riskSort = useSortable<TriageSortKey>('remaining', 'asc');

  const triageSort = (list: EnrichedTorrent[], key: TriageSortKey, dir: 'asc' | 'desc') => {
    const d = dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (key) {
        case 'name': return d * a.torrent.name.localeCompare(b.torrent.name);
        case 'ratio': return d * (a.torrent.uploadRatio - b.torrent.uploadRatio);
        case 'seed': return d * (a.torrent.secondsSeeding - b.torrent.secondsSeeding);
        case 'size': return d * (a.torrent.totalSize - b.torrent.totalSize);
        case 'remaining': return d * ((a.secondsRemaining ?? 999999) - (b.secondsRemaining ?? 999999));
        default: return 0;
      }
    });
  };

  const sortedSafe = triageSort(safe, safeSort.key, safeSort.dir);
  const sortedRisk = triageSort(atRisk, riskSort.key, riskSort.dir);

  const toggleSel = (id: number) => {
    const n = new Set(sel);
    n.has(id) ? n.delete(id) : n.add(id);
    setSel(n);
  };

  const selectAllSafe = () => {
    if (safe.every(t => sel.has(t.torrent.id))) {
      setSel(new Set());
    } else {
      setSel(new Set(safe.map(t => t.torrent.id)));
    }
  };

  const selectedSize = safe.filter(t => sel.has(t.torrent.id)).reduce((s, t) => s + t.sizeGb, 0);

  const deleteSelected = (withFiles: boolean) => {
    action.mutate({
      method: 'torrent-remove',
      ids: [...sel],
      extra: { 'delete-local-data': withFiles },
    });
    setSel(new Set());
  };

  return (
    <Page>
      <div className="col" style={{ gap: 20 }}>

        {/* ── Torrents safe : supprimables ─────────────────────────── */}
        <Card>
          <div className="card-head">
            <div className="row" style={{ gap: 8 }}>
              <I.Check size={16} style={{ color: 'var(--safe)' }} />
              <h3 className="h3" style={{ margin: 0 }}>{t('triage.safe_title')}</h3>
              <Chip kind="safe">{safe.length}</Chip>
              {safe.length > 0 && (
                <span className="faint mono" style={{ fontSize: 11 }}>
                  {safe.reduce((s, t) => s + t.sizeGb, 0).toFixed(1)} GB
                </span>
              )}
            </div>
            <div className="right">
              {safe.length > 0 && (
                <Btn size="sm" kind="ghost" onClick={selectAllSafe}>
                  {safe.every(t => sel.has(t.torrent.id)) ? t('action.uncheck_all') : t('action.check_all')}
                </Btn>
              )}
            </div>
          </div>

          {safe.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>{t('triage.empty_safe')}</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <SortTh sortKey="name" current={safeSort.key} dir={safeSort.dir} onClick={() => safeSort.cycle('name')}>
                    Torrent
                  </SortTh>
                  <SortTh sortKey="ratio" current={safeSort.key} dir={safeSort.dir} onClick={() => safeSort.cycle('ratio')} style={{ width: 70 }}>
                    {t('th.ratio')}
                  </SortTh>
                  <SortTh sortKey="seed" current={safeSort.key} dir={safeSort.dir} onClick={() => safeSort.cycle('seed')} style={{ width: 90 }}>
                    {t('stat.seed_time')}
                  </SortTh>
                  <SortTh sortKey="size" current={safeSort.key} dir={safeSort.dir} onClick={() => safeSort.cycle('size')} style={{ width: 80 }}>
                    {t('th.size')}
                  </SortTh>
                </tr>
              </thead>
              <tbody>
                {sortedSafe.map(et => (
                  <tr key={et.torrent.id} className={sel.has(et.torrent.id) ? 'selected' : ''}>
                    <td><CheckBox on={sel.has(et.torrent.id)} onChange={() => toggleSel(et.torrent.id)} /></td>
                    <td style={{ maxWidth: 0 }}>
                      <div className="row" style={{ gap: 8 }}>
                        {et.trackerKey && (
                          <span style={{
                            display: 'inline-block', width: 18, height: 18, borderRadius: 5,
                            background: trackerBg(et.trackerKey),
                            fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-mono)',
                            color: '#0a0c10', textAlign: 'center', lineHeight: '18px', flexShrink: 0,
                          }}>{et.trackerKey.slice(0, 2).toUpperCase()}</span>
                        )}
                        <span className="mono" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {et.torrent.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 12, color: 'var(--safe)', fontWeight: 600 }}>
                        {et.torrent.uploadRatio.toFixed(2)}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                      {formatDuration(et.torrent.secondsSeeding)}
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{et.sizeGb} GB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {sel.size > 0 && (
            <div className="card-pad row" style={{ borderTop: '1px solid var(--line)', gap: 12 }}>
              <span className="mono" style={{ fontSize: 13 }}>
                <strong>{sel.size}</strong> torrent{sel.size > 1 ? 's' : ''} · <strong>{selectedSize.toFixed(1)} GB</strong>
              </span>
              <span style={{ flex: 1 }} />
              <Btn size="sm" icon={<I.Trash size={13} />}
                onClick={() => deleteSelected(false)}>{t('action.delete')}</Btn>
              <Btn size="sm" kind="danger" icon={<I.Trash size={13} />}
                onClick={() => deleteSelected(true)}>{t('action.delete_files')}</Btn>
            </div>
          )}
        </Card>

        {/* ── Torrents à risque : garder ──────────────────────────── */}
        {atRisk.length > 0 && (
          <Card>
            <div className="card-head">
              <div className="row" style={{ gap: 8 }}>
                <I.Alert size={16} style={{ color: 'var(--danger)' }} />
                <h3 className="h3" style={{ margin: 0 }}>{t('triage.keep_title')}</h3>
                <Chip kind="danger">{atRisk.filter(t => t.status === 'danger').length}</Chip>
                {atRisk.some(t => t.status === 'warn') && (
                  <Chip kind="warn">{atRisk.filter(t => t.status === 'warn').length}</Chip>
                )}
              </div>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>{t('th.status')}</th>
                  <SortTh sortKey="name" current={riskSort.key} dir={riskSort.dir} onClick={() => riskSort.cycle('name')}>
                    Torrent
                  </SortTh>
                  <SortTh sortKey="ratio" current={riskSort.key} dir={riskSort.dir} onClick={() => riskSort.cycle('ratio')} style={{ width: 110 }}>
                    {t('th.ratio')}
                  </SortTh>
                  <SortTh sortKey="seed" current={riskSort.key} dir={riskSort.dir} onClick={() => riskSort.cycle('seed')} style={{ width: 110 }}>
                    {t('stat.seed_time')}
                  </SortTh>
                  <SortTh sortKey="remaining" current={riskSort.key} dir={riskSort.dir} onClick={() => riskSort.cycle('remaining')} style={{ width: 90 }}>
                    {t('triage.remaining')}
                  </SortTh>
                  <SortTh sortKey="size" current={riskSort.key} dir={riskSort.dir} onClick={() => riskSort.cycle('size')} style={{ width: 80 }}>
                    {t('th.size')}
                  </SortTh>
                </tr>
              </thead>
              <tbody>
                {sortedRisk.map(et => {
                  const isDanger = et.status === 'danger';
                  return (
                    <tr key={et.torrent.id} className={isDanger ? 'row-danger' : 'row-warn'}>
                      <td>
                        <Chip kind={isDanger ? 'danger' : 'warn'} pulse={isDanger}>
                          {isDanger ? t('status.hnr') : t('status.watch')}
                        </Chip>
                      </td>
                      <td style={{ maxWidth: 0 }}>
                        <div className="row" style={{ gap: 8 }}>
                          {et.trackerKey && (
                            <span style={{
                              display: 'inline-block', width: 18, height: 18, borderRadius: 5,
                              background: trackerBg(et.trackerKey),
                              fontSize: 8, fontWeight: 700, fontFamily: 'var(--font-mono)',
                              color: '#0a0c10', textAlign: 'center', lineHeight: '18px', flexShrink: 0,
                            }}>{et.trackerKey.slice(0, 2).toUpperCase()}</span>
                          )}
                          <span className="mono" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {et.torrent.name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          <Bar value={et.ratioProgress} max={100}
                            kind={et.torrent.uploadRatio >= et.thresholds.minRatio ? 'safe' : isDanger ? 'danger' : 'warn'}
                            style={{ flex: 1 }} />
                          <span className="mono tabular" style={{ fontSize: 11, minWidth: 32,
                            color: et.torrent.uploadRatio >= et.thresholds.minRatio ? 'var(--safe)' : isDanger ? 'var(--danger)' : 'var(--warn)' }}>
                            {et.torrent.uploadRatio.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td>
                        {et.thresholds.minSeedtime != null ? (
                          <div className="row" style={{ gap: 6 }}>
                            <Bar value={et.seedtimeProgress ?? 0} max={100}
                              kind={(et.seedtimeProgress ?? 0) >= 100 ? 'safe' : isDanger ? 'danger' : 'warn'}
                              style={{ flex: 1 }} />
                            <span className="mono tabular" style={{ fontSize: 11, minWidth: 28 }}>
                              {formatDuration(et.torrent.secondsSeeding)}
                            </span>
                          </div>
                        ) : (
                          <span className="faint mono" style={{ fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td>
                        {et.secondsRemaining != null && et.secondsRemaining > 0 ? (
                          <span className="mono" style={{
                            fontSize: 12, fontWeight: 600,
                            color: isDanger ? 'var(--danger)' : 'var(--text-soft)',
                          }}>
                            {formatDurationLong(et.secondsRemaining)}
                          </span>
                        ) : (
                          <span className="faint mono" style={{ fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>{et.sizeGb} GB</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}

        {/* ── En cours de téléchargement ──────────────────────────── */}
        {downloading.length > 0 && (
          <Card>
            <div className="card-head">
              <div className="row" style={{ gap: 8 }}>
                <I.Download size={16} style={{ color: 'var(--accent)' }} />
                <h3 className="h3" style={{ margin: 0 }}>{t('triage.downloading')}</h3>
                <Chip>{downloading.length}</Chip>
              </div>
            </div>
            <div className="card-pad faint" style={{ fontSize: 13 }}>
              {downloading.length} torrent{downloading.length > 1 ? 's' : ''} {t('triage.downloading_note')}
            </div>
          </Card>
        )}

        {/* ── Tout clean ──────────────────────────────────────────── */}
        {tracked.length > 0 && atRisk.length === 0 && safe.length === 0 && (
          <Card className="card-pad">
            <div className="empty" style={{ padding: '30px 0' }}>
              <I.Check size={32} style={{ color: 'var(--safe)', marginBottom: 8 }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--safe)' }}>{t('triage.all_clean')}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t('triage.all_clean_sub')}</div>
            </div>
          </Card>
        )}

        {tracked.length === 0 && (
          <Card className="card-pad">
            <div className="empty" style={{ padding: '30px 0' }}>
              <I.Slider size={28} style={{ color: 'var(--text-faint)', marginBottom: 8 }} />
              <div style={{ fontSize: 14, color: 'var(--text-soft)' }}>{t('triage.no_rules')}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t('triage.no_rules_sub')}</div>
            </div>
          </Card>
        )}

        {/* Summary */}
        {tracked.length > 0 && (
          <div className="row" style={{ color: 'var(--text-faint)', fontSize: 12, gap: 16 }}>
            <span><span className="mono">{safe.length}</span> {t('triage.deletable')} · <span className="mono">{safe.reduce((s, t) => s + t.sizeGb, 0).toFixed(1)} GB</span> {t('triage.freeable')}</span>
            <span><span className="mono">{atRisk.length}</span> {t('triage.to_keep')}</span>
            <span><span className="mono">{downloading.length}</span> {t('triage.in_dl')}</span>
          </div>
        )}
      </div>
    </Page>
  );
};
