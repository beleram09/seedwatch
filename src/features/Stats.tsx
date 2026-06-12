import React from 'react';
import { Card, Stat, Donut, Spark, Page } from '../components/ui';
import * as I from '../components/icons';
import { useSessionStats, useSession, useTorrents, formatBytes, formatSpeed, statusCounts } from '../hooks/useTorrents';
import { useUIStore } from '../store/useStore';
import type { TransferStats } from '../lib/transmission';

export const Stats: React.FC = () => {
  const { t } = useUIStore();
  const { data: stats } = useSessionStats();
  const { data: session } = useSession();
  const { data: torrents = [] } = useTorrents();
  const counts = statusCounts(torrents);

  const cum = stats?.['cumulative-stats'] as TransferStats | undefined;
  const cur = stats?.['current-stats'] as TransferStats | undefined;

  // Speed history ring buffer (client-side, in-memory)
  const speedHistory = React.useRef<{ up: number[]; down: number[] }>({ up: [], down: [] });
  React.useEffect(() => {
    if (stats) {
      const h = speedHistory.current;
      h.up = [...h.up.slice(-59), stats.uploadSpeed];
      h.down = [...h.down.slice(-59), stats.downloadSpeed];
    }
  }, [stats]);

  const formatUptime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}j ${hours}h`;
  };

  // Total sizes
  const totalSize = torrents.reduce((s, t) => s + t.torrent.totalSize, 0);
  const totalUp = torrents.reduce((s, t) => s + t.torrent.uploadedEver, 0);
  const totalDown = torrents.reduce((s, t) => s + t.torrent.downloadedEver, 0);
  const avgRatio = totalDown > 0 ? totalUp / totalDown : 0;

  return (
    <Page>
      <div className="col" style={{ gap: 20 }}>

        {/* ── Speed live ──────────────────────────────────────────── */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card className="card-pad">
            <div className="row" style={{ marginBottom: 12, gap: 8 }}>
              <I.ArrowU size={16} style={{ color: 'var(--safe)' }} />
              <h3 className="h3" style={{ margin: 0 }}>{t('stats.upload')}</h3>
            </div>
            <Stat label={t('stat.current_speed')} value={formatSpeed(stats?.uploadSpeed ?? 0)} kind="safe" big />
            {speedHistory.current.up.length > 2 && (
              <div style={{ marginTop: 12 }}>
                <Spark data={speedHistory.current.up} w={300} h={50} kind="safe" />
              </div>
            )}
          </Card>
          <Card className="card-pad">
            <div className="row" style={{ marginBottom: 12, gap: 8 }}>
              <I.ArrowD size={16} style={{ color: 'var(--accent)' }} />
              <h3 className="h3" style={{ margin: 0 }}>{t('stats.download')}</h3>
            </div>
            <Stat label={t('stat.current_speed')} value={formatSpeed(stats?.downloadSpeed ?? 0)} big />
            {speedHistory.current.down.length > 2 && (
              <div style={{ marginTop: 12 }}>
                <Spark data={speedHistory.current.down} w={300} h={50} color="var(--accent)" />
              </div>
            )}
          </Card>
        </div>

        {/* ── Torrent overview ────────────────────────────────────── */}
        <Card className="card-pad">
          <h3 className="h3" style={{ marginBottom: 14 }}>{t('stats.torrents')}</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            <Stat label={t('stat.total')} value={stats?.torrentCount ?? 0} big />
            <Stat label={t('stat.active')} value={stats?.activeTorrentCount ?? 0} kind="safe" />
            <Stat label={t('stat.paused')} value={stats?.pausedTorrentCount ?? 0} />
            <Stat label={t('stat.downloading')} value={counts.downloading} />
            <Stat label={t('stat.space_used')} value={formatBytes(totalSize)} />
          </div>
          {(counts.danger > 0 || counts.warn > 0) && (
            <>
              <hr className="divider" />
              <div className="row" style={{ gap: 24 }}>
                {counts.danger > 0 && (
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 8px var(--danger)' }} />
                    <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger)' }}>{counts.danger}</span>
                    <span className="faint" style={{ fontSize: 12 }}>{t('stats.hnr_risk')}</span>
                  </div>
                )}
                {counts.warn > 0 && (
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warn)' }} />
                    <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--warn)' }}>{counts.warn}</span>
                    <span className="faint" style={{ fontSize: 12 }}>{t('stats.to_watch')}</span>
                  </div>
                )}
                {counts.ok > 0 && (
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--safe)' }} />
                    <span className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--safe)' }}>{counts.ok}</span>
                    <span className="faint" style={{ fontSize: 12 }}>{t('settings.deletable')}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>

        {/* ── Ratio global ────────────────────────────────────────── */}
        <Card className="card-pad">
          <h3 className="h3" style={{ marginBottom: 14 }}>{t('stats.global_ratio')}</h3>
          <div className="grid" style={{ gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center' }}>
            <Donut
              value={Math.min(avgRatio, 2)}
              max={2}
              size={100}
              stroke={10}
              color={avgRatio >= 1 ? 'var(--safe)' : avgRatio >= 0.5 ? 'var(--warn)' : 'var(--danger)'}
              label={avgRatio.toFixed(2)}
            />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Stat label={t('stat.total_uploaded')} value={formatBytes(totalUp)} kind="safe" />
              <Stat label={t('stat.total_downloaded')} value={formatBytes(totalDown)} />
              <Stat label={t('stat.avg_ratio')} value={avgRatio.toFixed(3)}
                kind={avgRatio >= 1 ? 'safe' : avgRatio >= 0.5 ? 'warn' : 'danger'} />
              <Stat label={t('stat.corrupt_data')} value={formatBytes(torrents.reduce((s, t) => s + (t.torrent.corruptEver ?? 0), 0))} />
            </div>
          </div>
        </Card>

        {/* ── Session courante ────────────────────────────────────── */}
        {cur && (
          <Card className="card-pad">
            <div className="row" style={{ marginBottom: 14, gap: 8 }}>
              <I.Activity size={16} style={{ color: 'var(--accent)' }} />
              <h3 className="h3" style={{ margin: 0 }}>{t('stats.current_session')}</h3>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
              <Stat label={t('stat.uploaded')} value={formatBytes(cur.uploadedBytes)} kind="safe" />
              <Stat label={t('stat.downloaded')} value={formatBytes(cur.downloadedBytes)} />
              <Stat label={t('stat.ratio')} value={cur.downloadedBytes > 0 ? (cur.uploadedBytes / cur.downloadedBytes).toFixed(2) : '—'}
                kind={cur.downloadedBytes > 0 && cur.uploadedBytes / cur.downloadedBytes >= 1 ? 'safe' : 'warn'} />
              <Stat label={t('stat.files_added')} value={cur.filesAdded} />
              <Stat label={t('stat.duration')} value={formatUptime(cur.secondsActive)} />
            </div>
          </Card>
        )}

        {/* ── Stats cumulatives ───────────────────────────────────── */}
        {cum && (
          <Card className="card-pad">
            <div className="row" style={{ marginBottom: 14, gap: 8 }}>
              <I.Layers size={16} style={{ color: 'var(--text-soft)' }} />
              <h3 className="h3" style={{ margin: 0 }}>{t('stats.cumulative')}</h3>
              <span className="faint" style={{ fontSize: 12, marginLeft: 'auto' }}>
                {cum.sessionCount} session{cum.sessionCount > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
              <Stat label={t('stat.total_uploaded')} value={formatBytes(cum.uploadedBytes)} kind="safe" />
              <Stat label={t('stat.total_downloaded')} value={formatBytes(cum.downloadedBytes)} />
              <Stat label={t('stat.global_ratio')} value={cum.downloadedBytes > 0 ? (cum.uploadedBytes / cum.downloadedBytes).toFixed(2) : '—'}
                kind={cum.downloadedBytes > 0 && cum.uploadedBytes / cum.downloadedBytes >= 1 ? 'safe' : 'warn'} />
              <Stat label={t('stat.files_added')} value={cum.filesAdded} />
              <Stat label={t('stat.active_time')} value={formatUptime(cum.secondsActive)} />
            </div>
          </Card>
        )}

        {/* ── Infos système ───────────────────────────────────────── */}
        <Card className="card-pad">
          <h3 className="h3" style={{ marginBottom: 14 }}>{t('stats.system')}</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Stat label="Version" value={session?.version ?? '—'} />
            <Stat label="RPC" value={`v${session?.['rpc-version'] ?? '—'}`} />
            <Stat label={t('stat.free_space')} value={formatBytes(session?.['download-dir-free-space'] ?? 0)} />
          </div>
        </Card>

      </div>
    </Page>
  );
};
