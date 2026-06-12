import React, { useState } from 'react';
import { Card, Chip, Btn, Bar, Stat, TDot, Tabs, CheckBox, Page, SortTh, useSortable, DeleteBtn } from '../components/ui';
import * as I from '../components/icons';
import { useTorrentDetail, useTorrentAction, useTorrentSet, useTorrentRename, formatBytes, formatSpeed, formatDuration, formatDurationLong, formatEta, formatDaysAgo } from '../hooks/useTorrents';
import { enrichTorrent, type EnrichedTorrent, type TrackerThresholds } from '../lib/hnr';
import { TorrentStatus, type Torrent, type Peer } from '../lib/transmission';
import { useSettingsStore, useUIStore } from '../store/useStore';

interface Props {
  torrentId: number;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export const Detail: React.FC<Props> = ({ torrentId, onBack, onPrev, onNext }) => {
  const { data: torrent, isLoading } = useTorrentDetail(torrentId);
  const { t } = useUIStore();
  const trackerRules = useSettingsStore(s => s.trackerRules);
  const override = React.useMemo(() => {
    const map: Record<string, TrackerThresholds> = {};
    for (const r of trackerRules) {
      map[r.trackerId] = { minRatio: r.minRatio, minSeedtime: r.minSeedtimeH != null ? r.minSeedtimeH * 3600 : null, freeleech: r.freeleech, combine: r.combine };
    }
    return map;
  }, [trackerRules]);

  if (isLoading || !torrent) {
    return (
      <Page>
        <Btn size="sm" icon={<I.ChevronL size={13} />} onClick={onBack}>{t('action.back')}</Btn>
        <div className="empty" style={{ marginTop: 40 }}>
          {isLoading ? t('misc.loading') : t('detail.not_found')}
        </div>
      </Page>
    );
  }

  const et = enrichTorrent(torrent, override);
  return <DetailInner et={et} onBack={onBack} onPrev={onPrev} onNext={onNext} />;
};

// ── Inner component ──────────────────────────────────────────────────────

const DetailInner: React.FC<{
  et: EnrichedTorrent;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}> = ({ et, onBack, onPrev, onNext }) => {
  const { torrent: tor, status, trackerKey, hasRule } = et;
  const { t } = useUIStore();
  const action = useTorrentAction();
  const torrentSet = useTorrentSet();
  const [tab, setTab] = useState(0);

  const isPaused = tor.status === TorrentStatus.Stopped;
  const trackerName = trackerKey ?? '';

  const TAB_LABELS = [t('detail.tab.overview'), t('detail.tab.files'), t('detail.tab.peers'), t('detail.tab.trackers')];

  const tabs = hasRule
    ? [...TAB_LABELS, t('detail.tab.hnr')]
    : TAB_LABELS;

  return (
    <div className="page">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div className="row" style={{ marginBottom: 16, gap: 8 }}>
          <Btn size="sm" icon={<I.ChevronL size={13} />} onClick={onBack}>{t('action.back')}</Btn>
          <span style={{ flex: 1 }} />
          {onPrev && <Btn size="sm" kind="ghost" icon={<I.ChevronL size={13} />} onClick={onPrev} />}
          {onNext && <Btn size="sm" kind="ghost" icon={<I.ChevronR size={13} />} onClick={onNext} />}
        </div>

        {/* Title card */}
        <Card className="card-pad" style={{ marginBottom: 16 }}>
          <div className="row" style={{ gap: 12 }}>
            {trackerKey && <TDot id={trackerKey} name={trackerName} size="xl" />}
            <div className="col" style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <span className="mono" style={{ fontSize: 14, fontWeight: 600, wordBreak: 'break-word', lineHeight: 1.4 }}>
                {tor.name}
              </span>
              <div className="row" style={{ gap: 8 }}>
                {hasRule && (
                  <Chip kind={status === 'danger' ? 'danger' : status === 'warn' ? 'warn' : status === 'ok' ? 'safe' : ''} pulse={status === 'danger'}>
                    {status === 'danger' ? t('detail.hnr_danger') : status === 'warn' ? t('stats.to_watch') : status === 'ok' ? t('settings.deletable') : status}
                  </Chip>
                )}
                {isPaused && <Chip>{t('action.pause')}</Chip>}
                {tor.error > 0 && <Chip kind="danger">{tor.errorString}</Chip>}
                {tor.labels?.map(l => <Chip key={l} size="sm">{l}</Chip>)}
              </div>
            </div>
            <div className="row" style={{ gap: 4 }}>
              {isPaused ? (
                <Btn size="sm" icon={<I.Play size={14} />} onClick={() => action.mutate({ method: 'torrent-start', ids: [tor.id] })}>{t('action.start')}</Btn>
              ) : (
                <Btn size="sm" icon={<I.Pause size={14} />} onClick={() => action.mutate({ method: 'torrent-stop', ids: [tor.id] })}>{t('action.pause')}</Btn>
              )}
              <Btn size="sm" icon={<I.RotateCw size={13} />} onClick={() => action.mutate({ method: 'torrent-verify', ids: [tor.id] })} title={t('list.verify')} />
              <DeleteBtn onDelete={(wf) => { action.mutate({ method: 'torrent-remove', ids: [tor.id], extra: { 'delete-local-data': wf } }); onBack(); }} />
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs items={tabs} active={tab} onChange={setTab} />

        <div style={{ marginTop: 16 }}>
          {tab === 0 && <OverviewTab et={et} />}
          {tab === 1 && <FilesTab torrent={tor} onSet={(args) => torrentSet.mutate({ ids: [tor.id], ...args })} />}
          {tab === 2 && <PeersTab peers={tor.peers ?? []} />}
          {tab === 3 && <TrackersTab torrent={tor} />}
          {tab === 4 && hasRule && <HnrTab et={et} onBack={onBack} />}
        </div>
      </div>
    </div>
  );
};

// ── Overview Tab ──────────────────────────────────────────────────────────

const OverviewTab: React.FC<{ et: EnrichedTorrent }> = ({ et }) => {
  const { torrent: tor, thresholds, ratioProgress, seedtimeProgress, secondsRemaining, sizeGb, status } = et;
  const { t, lang } = useUIStore();
  const isDanger = status === 'danger';
  const isDownloading = tor.percentDone < 1;

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Stats */}
      <Card className="card-pad">
        <h3 className="h3" style={{ marginBottom: 14 }}>{t('detail.stats')}</h3>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <Stat label={t('stat.size')} value={`${sizeGb} GB`} />
          <Stat label={t('stat.downloaded')} value={formatBytes(tor.downloadedEver)} />
          <Stat label={t('stat.uploaded')} value={formatBytes(tor.uploadedEver)} />
          <Stat label={t('stat.ratio')} value={tor.uploadRatio.toFixed(3)} kind={tor.uploadRatio >= thresholds.minRatio ? 'safe' : isDanger ? 'danger' : 'warn'} />
          <Stat label={t('stat.seed_time')} value={formatDuration(tor.secondsSeeding)} />
          <Stat label={t('stat.dl_time')} value={formatDuration(tor.secondsDownloading ?? 0)} />
          <Stat label={t('stat.added')} value={formatDaysAgo(tor.addedDate, lang)} />
          {isDownloading && <Stat label={t('stat.progress')} value={`${(tor.percentDone * 100).toFixed(1)}%`} />}
          {isDownloading && tor.eta >= 0 && <Stat label={t('stat.eta')} value={formatEta(tor.eta)} />}
          {tor.rateUpload > 0 && <Stat label={t('stat.speed_up')} value={formatSpeed(tor.rateUpload)} kind="safe" />}
          {tor.rateDownload > 0 && <Stat label={t('stat.speed_down')} value={formatSpeed(tor.rateDownload)} />}
          <Stat label={t('stat.peers')} value={tor.peersConnected} hint={`↑${tor.peersGettingFromUs} ↓${tor.peersSendingToUs} max ${tor.maxConnectedPeers ?? '—'}`} />
          <Stat label={t('stat.queue')} value={`#${tor.queuePosition}`} />
          {tor.corruptEver > 0 && <Stat label={t('stat.corrupt')} value={formatBytes(tor.corruptEver)} kind="danger" />}
          {tor.fileCount > 0 && <Stat label={t('stat.files')} value={tor.fileCount} />}
          {tor.pieceCount > 0 && <Stat label={t('stat.pieces')} value={`${tor.pieceCount} × ${formatBytes(tor.pieceSize)}`} />}
        </div>
      </Card>

      {/* Progress + Metadata */}
      <div className="col" style={{ gap: 16 }}>
        {/* Download progress */}
        {isDownloading && (
          <Card className="card-pad">
            <h3 className="h3" style={{ marginBottom: 10 }}>{t('detail.download')}</h3>
            <Bar value={tor.percentDone * 100} max={100} tall />
            <div className="row" style={{ marginTop: 8, justifyContent: 'space-between', fontSize: 12, color: 'var(--text-soft)' }}>
              <span className="mono">{(tor.percentDone * 100).toFixed(1)}%</span>
              <span className="mono">{formatBytes(tor.leftUntilDone)} {t('detail.remaining')}</span>
            </div>
          </Card>
        )}

        {/* Ratio + seedtime bars */}
        {!isDownloading && (
          <Card className="card-pad">
            <h3 className="h3" style={{ marginBottom: 14 }}>{t('detail.progression')}</h3>
            <div className="col" style={{ gap: 14 }}>
              <div>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="field-label" style={{ marginBottom: 0 }}>{t('stat.ratio')}</span>
                  <span className="mono tabular" style={{ fontSize: 16, fontWeight: 600,
                    color: tor.uploadRatio >= thresholds.minRatio ? 'var(--safe)' : isDanger ? 'var(--danger)' : 'var(--warn)' }}>
                    {tor.uploadRatio.toFixed(3)} <span className="faint" style={{ fontWeight: 400, fontSize: 12 }}>/ {thresholds.minRatio}</span>
                  </span>
                </div>
                <Bar value={ratioProgress} max={100}
                  kind={tor.uploadRatio >= thresholds.minRatio ? 'safe' : isDanger ? 'danger' : 'warn'} tall />
              </div>
              {thresholds.minSeedtime != null && (
                <div>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="field-label" style={{ marginBottom: 0 }}>{t('stat.seed_time')}</span>
                    <span className="mono tabular" style={{ fontSize: 16, fontWeight: 600,
                      color: (seedtimeProgress ?? 0) >= 100 ? 'var(--safe)' : isDanger ? 'var(--danger)' : 'var(--text)' }}>
                      {formatDuration(tor.secondsSeeding)} <span className="faint" style={{ fontWeight: 400, fontSize: 12 }}>/ {formatDuration(thresholds.minSeedtime)}</span>
                    </span>
                  </div>
                  <Bar value={seedtimeProgress ?? 0} max={100}
                    kind={(seedtimeProgress ?? 0) >= 100 ? 'safe' : isDanger ? 'danger' : 'warn'} tall />
                  {secondsRemaining != null && secondsRemaining > 0 && (
                    <div style={{ marginTop: 6, fontSize: 12, color: isDanger ? 'var(--danger)' : 'var(--text-soft)' }}>
                      {formatDurationLong(secondsRemaining)} {t('detail.remaining')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Metadata */}
        <Card className="card-pad">
          <h3 className="h3" style={{ marginBottom: 10 }}>{t('detail.info')}</h3>
          <div className="col" style={{ gap: 6, fontSize: 13 }}>
            <MetaRow label={t('meta.directory')} value={tor.downloadDir} />
            {tor.hashString && <MetaRow label={t('meta.hash')} value={tor.hashString} mono />}
            {tor.comment && <MetaRow label={t('meta.comment')} value={tor.comment} />}
            {tor.creator && <MetaRow label={t('meta.creator')} value={tor.creator} />}
            {tor.dateCreated > 0 && <MetaRow label={t('meta.created')} value={new Date(tor.dateCreated * 1000).toLocaleDateString('fr-FR')} />}
            <MetaRow label={t('meta.private')} value={tor.isPrivate ? t('meta.yes') : t('meta.no')} />
            {tor.primaryMimeType && <MetaRow label={t('meta.type')} value={tor.primaryMimeType} />}
            {tor.group && <MetaRow label={t('meta.group')} value={tor.group} />}
            {tor.magnetLink && <MetaRow label={t('meta.magnet')} value={tor.magnetLink} mono />}
          </div>
        </Card>
      </div>
    </div>
  );
};

const MetaRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="row" style={{ gap: 12 }}>
    <span className="field-label" style={{ minWidth: 100, marginBottom: 0 }}>{label}</span>
    <span className={mono ? 'mono' : ''} style={{ fontSize: 12, color: 'var(--text-soft)', wordBreak: 'break-all' }}>{value}</span>
  </div>
);

// ── Files Tab ─────────────────────────────────────────────────────────────

type FileSortKey = 'name' | 'size' | 'progress' | 'priority';

const FilesTab: React.FC<{ torrent: Torrent; onSet: (args: Record<string, unknown>) => void }> = ({ torrent: tor, onSet }) => {
  const { t } = useUIStore();
  const files = tor.files ?? [];
  const stats = tor.fileStats ?? [];
  const rename = useTorrentRename();
  const [renaming, setRenaming] = useState<number | null>(null);
  const [renameTo, setRenameTo] = useState('');
  const sort = useSortable<FileSortKey>('name', 'asc');

  const indices = React.useMemo(() => {
    const arr = files.map((_, i) => i);
    const d = sort.dir === 'asc' ? 1 : -1;
    return arr.sort((a, b) => {
      switch (sort.key) {
        case 'name': return d * files[a].name.localeCompare(files[b].name);
        case 'size': return d * (files[a].length - files[b].length);
        case 'progress': {
          const pa = files[a].length > 0 ? files[a].bytesCompleted / files[a].length : 1;
          const pb = files[b].length > 0 ? files[b].bytesCompleted / files[b].length : 1;
          return d * (pa - pb);
        }
        case 'priority': return d * ((stats[a]?.priority ?? 0) - (stats[b]?.priority ?? 0));
        default: return 0;
      }
    });
  }, [files, stats, sort.key, sort.dir]);

  const toggleWanted = (idx: number, wanted: boolean) => {
    onSet(wanted ? { 'files-wanted': [idx] } : { 'files-unwanted': [idx] });
  };

  const setPriority = (idx: number, priority: string) => {
    const key = priority === '1' ? 'priority-high' : priority === '-1' ? 'priority-low' : 'priority-normal';
    onSet({ [key]: [idx] });
  };

  const startRename = (idx: number) => {
    setRenaming(idx);
    setRenameTo(files[idx].name.split('/').pop() ?? files[idx].name);
  };

  const submitRename = (idx: number) => {
    const path = files[idx].name;
    if (renameTo && renameTo !== path.split('/').pop()) {
      rename.mutate({ id: tor.id, path, name: renameTo });
    }
    setRenaming(null);
  };

  return (
    <Card>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: 32 }}></th>
            <SortTh sortKey="name" current={sort.key} dir={sort.dir} onClick={() => sort.cycle('name')}>
              {t('file.name')}
            </SortTh>
            <SortTh sortKey="size" current={sort.key} dir={sort.dir} onClick={() => sort.cycle('size')} style={{ width: 90 }}>
              {t('file.size')}
            </SortTh>
            <SortTh sortKey="progress" current={sort.key} dir={sort.dir} onClick={() => sort.cycle('progress')} style={{ width: 90 }}>
              {t('file.progress')}
            </SortTh>
            <SortTh sortKey="priority" current={sort.key} dir={sort.dir} onClick={() => sort.cycle('priority')} style={{ width: 100 }}>
              {t('file.priority')}
            </SortTh>
            <th style={{ width: 40 }}></th>
          </tr>
        </thead>
        <tbody>
          {indices.map(i => {
            const f = files[i];
            const fs = stats[i];
            const pct = f.length > 0 ? (f.bytesCompleted / f.length) * 100 : 100;
            const wanted = fs?.wanted ?? true;
            const priority = fs?.priority ?? 0;
            const isRenaming = renaming === i;
            return (
              <tr key={i} style={{ opacity: wanted ? 1 : 0.5 }}>
                <td><CheckBox on={wanted} onChange={() => toggleWanted(i, !wanted)} /></td>
                <td style={{ maxWidth: 0 }}>
                  {isRenaming ? (
                    <div className="row" style={{ gap: 6 }}>
                      <input className="input mono" style={{ fontSize: 12, padding: '2px 6px', flex: 1 }}
                        value={renameTo} onChange={e => setRenameTo(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submitRename(i); if (e.key === 'Escape') setRenaming(null); }}
                        autoFocus />
                      <Btn size="sm" kind="primary" icon={<I.Check size={11} />} onClick={() => submitRename(i)} />
                      <Btn size="sm" kind="ghost" icon={<I.X size={11} />} onClick={() => setRenaming(null)} />
                    </div>
                  ) : (
                    <div className="row" style={{ gap: 6 }}>
                      <I.File size={12} style={{ color: 'var(--text-mute)', flexShrink: 0 }} />
                      <span className="mono" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </span>
                    </div>
                  )}
                </td>
                <td className="mono" style={{ fontSize: 12 }}>{formatBytes(f.length)}</td>
                <td>
                  <div className="row" style={{ gap: 6 }}>
                    <Bar value={pct} max={100} kind={pct >= 100 ? 'safe' : ''} style={{ flex: 1 }} />
                    <span className="mono faint" style={{ fontSize: 11 }}>{pct.toFixed(0)}%</span>
                  </div>
                </td>
                <td>
                  <select className="select" style={{ fontSize: 12, padding: '4px 6px' }}
                    value={priority}
                    onChange={e => setPriority(i, e.target.value)}>
                    <option value="1">{t('file.high')}</option>
                    <option value="0">{t('file.normal')}</option>
                    <option value="-1">{t('file.low')}</option>
                  </select>
                </td>
                <td>
                  {!isRenaming && (
                    <Btn size="sm" kind="ghost" icon={<I.Edit size={11} />} title={t('action.rename')}
                      onClick={() => startRename(i)} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {files.length === 0 && <div className="empty">{t('detail.no_file')}</div>}
    </Card>
  );
};

// ── Peers Tab ─────────────────────────────────────────────────────────────

type PeerSortKey = 'address' | 'client' | 'progress' | 'from' | 'to';

const PeersTab: React.FC<{ peers: Peer[] }> = ({ peers }) => {
  const { t } = useUIStore();
  const sort = useSortable<PeerSortKey>('from', 'desc');

  const sorted = React.useMemo(() => {
    const d = sort.dir === 'asc' ? 1 : -1;
    return [...peers].sort((a, b) => {
      switch (sort.key) {
        case 'address': return d * a.address.localeCompare(b.address);
        case 'client': return d * (a.clientName || '').localeCompare(b.clientName || '');
        case 'progress': return d * (a.progress - b.progress);
        case 'from': return d * (a.rateToClient - b.rateToClient);
        case 'to': return d * (a.rateToPeer - b.rateToPeer);
        default: return 0;
      }
    });
  }, [peers, sort.key, sort.dir]);

  return (
    <Card>
      <table className="tbl">
        <thead>
          <tr>
            <SortTh sortKey="address" current={sort.key} dir={sort.dir} onClick={() => sort.cycle('address')}>
              {t('detail.peer_address')}
            </SortTh>
            <SortTh sortKey="client" current={sort.key} dir={sort.dir} onClick={() => sort.cycle('client')}>
              {t('detail.peer_client')}
            </SortTh>
            <SortTh sortKey="progress" current={sort.key} dir={sort.dir} onClick={() => sort.cycle('progress')} style={{ width: 70 }}>
              {t('file.progress')}
            </SortTh>
            <SortTh sortKey="from" current={sort.key} dir={sort.dir} onClick={() => sort.cycle('from')} style={{ width: 90 }}>
              {t('detail.peer_from')}
            </SortTh>
            <SortTh sortKey="to" current={sort.key} dir={sort.dir} onClick={() => sort.cycle('to')} style={{ width: 90 }}>
              {t('detail.peer_to')}
            </SortTh>
            <th style={{ width: 60 }}>{t('detail.peer_flags')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr key={i}>
              <td className="mono" style={{ fontSize: 12 }}>
                {p.isEncrypted && <I.Lock size={11} style={{ verticalAlign: -2, marginRight: 4, color: 'var(--safe)' }} />}
                {maskAddress(p.address)}:{p.port}
              </td>
              <td style={{ fontSize: 12, color: 'var(--text-soft)' }}>{p.clientName || '—'}</td>
              <td>
                <Bar value={p.progress * 100} max={100} kind={p.progress >= 1 ? 'safe' : ''} />
              </td>
              <td className="mono" style={{ fontSize: 12, color: p.rateToClient > 0 ? 'var(--accent)' : 'var(--text-faint)' }}>
                {p.rateToClient > 0 ? formatSpeed(p.rateToClient) : '—'}
              </td>
              <td className="mono" style={{ fontSize: 12, color: p.rateToPeer > 0 ? 'var(--safe)' : 'var(--text-faint)' }}>
                {p.rateToPeer > 0 ? formatSpeed(p.rateToPeer) : '—'}
              </td>
              <td className="mono faint" style={{ fontSize: 11 }}>{p.flagStr}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {peers.length === 0 && <div className="empty">{t('detail.no_peer')}</div>}
      {peers.length > 0 && (
        <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-faint)' }}>
          {peers.length} {t('detail.peers_count')}
        </div>
      )}
    </Card>
  );
};

function maskAddress(addr: string): string {
  if (addr.includes(':')) return addr; // IPv6, show as-is
  const parts = addr.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return addr;
}

// ── Trackers Tab ──────────────────────────────────────────────────────────

const TrackersTab: React.FC<{ torrent: Torrent }> = ({ torrent: tor }) => {
  const { t } = useUIStore();
  const stats = tor.trackerStats ?? [];
  return (
    <div className="col" style={{ gap: 12 }}>
      {stats.map((ts) => (
        <Card key={ts.id} className="card-pad">
          <div className="row" style={{ marginBottom: 10, gap: 8 }}>
            <TDot id={ts.sitename || 'unknown'} name={ts.sitename} />
            <h3 className="h3" style={{ margin: 0 }}>{ts.host}</h3>
            <Chip size="sm">tier {ts.tier}</Chip>
            {ts.isBackup && <Chip size="sm">backup</Chip>}
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <Stat label="Seeders" value={ts.seederCount >= 0 ? ts.seederCount : '—'} />
            <Stat label="Leechers" value={ts.leecherCount >= 0 ? ts.leecherCount : '—'} />
            <Stat label="Downloads" value={ts.downloadCount >= 0 ? ts.downloadCount : '—'} />
          </div>
          <hr className="divider" />
          <div className="col" style={{ gap: 4, fontSize: 12 }}>
            <MetaRow label="Announce" value={ts.announce} mono />
            <MetaRow label="Résultat" value={ts.lastAnnounceResult || '—'} />
            <MetaRow label="Prochain" value={ts.nextAnnounceTime > 0 ? new Date(ts.nextAnnounceTime * 1000).toLocaleTimeString('fr-FR') : '—'} />
          </div>
        </Card>
      ))}
      {stats.length === 0 && <div className="empty">{t('detail.no_tracker')}</div>}
    </div>
  );
};

// ── H&R Tab ──────────────────────────────────────────────────────────────

const HnrTab: React.FC<{ et: EnrichedTorrent; onBack: () => void }> = ({ et, onBack }) => {
  const { torrent: tor, trackerKey, thresholds, status, ratioProgress, seedtimeProgress, secondsRemaining } = et;
  const { t } = useUIStore();
  const action = useTorrentAction();
  const isDanger = status === 'danger';
  const isWarn = status === 'warn';

  const ratioOk = tor.uploadRatio >= thresholds.minRatio;
  const seedtimeOk = thresholds.minSeedtime === null || tor.secondsSeeding >= thresholds.minSeedtime;

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Progression */}
      <Card className="card-pad">
        <h3 className="h3" style={{ marginBottom: 14 }}>{t('detail.hnr_progression')}</h3>
        <div className="col" style={{ gap: 16 }}>
          <div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="field-label" style={{ marginBottom: 0 }}>{t('stat.ratio')}</span>
              <span className="mono tabular" style={{ fontSize: 24, fontWeight: 700,
                color: ratioOk ? 'var(--safe)' : isDanger ? 'var(--danger)' : 'var(--warn)' }}>
                {tor.uploadRatio.toFixed(3)}
                <span className="faint" style={{ fontSize: 13, fontWeight: 400 }}> / {thresholds.minRatio}</span>
              </span>
            </div>
            <Bar value={ratioProgress} max={100}
              kind={ratioOk ? 'safe' : isDanger ? 'danger' : 'warn'} tall />
            <div className="row" style={{ marginTop: 6, fontSize: 12, color: 'var(--text-soft)', gap: 8 }}>
              <span className="mono">↑ {formatBytes(tor.uploadedEver)}</span>
              <span className="faint">·</span>
              <span className="mono">↓ {formatBytes(tor.downloadedEver)}</span>
            </div>
          </div>
          {thresholds.minSeedtime != null && (
            <div>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="field-label" style={{ marginBottom: 0 }}>{t('stat.seed_time')}</span>
                <span className="mono tabular" style={{ fontSize: 24, fontWeight: 700,
                  color: (seedtimeProgress ?? 0) >= 100 ? 'var(--safe)' : isDanger ? 'var(--danger)' : 'var(--text)' }}>
                  {formatDuration(tor.secondsSeeding)}
                  <span className="faint" style={{ fontSize: 13, fontWeight: 400 }}> / {formatDuration(thresholds.minSeedtime)}</span>
                </span>
              </div>
              <Bar value={seedtimeProgress ?? 0} max={100}
                kind={(seedtimeProgress ?? 0) >= 100 ? 'safe' : isDanger ? 'danger' : 'warn'} tall />
              {secondsRemaining != null && secondsRemaining > 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: isDanger ? 'var(--danger)' : 'var(--text-soft)' }}>
                  {formatDurationLong(secondsRemaining)} {t('detail.remaining')}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Recommendation + trace */}
      <div className="col" style={{ gap: 16 }}>
        <Card kind={isDanger ? 'danger' : isWarn ? 'warn' : ''} className="card-pad">
          <h3 className="h3" style={{ marginBottom: 10 }}>{t('detail.recommendation')}</h3>
          {isDanger ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 14, lineHeight: 1.5 }}>
                {t('detail.hnr_danger')}
                {secondsRemaining != null && secondsRemaining > 0 && (
                  <> {t('detail.remaining')} : <span className="mono" style={{ color: 'var(--danger)' }}>{formatDurationLong(secondsRemaining)}</span>.</>
                )}
              </p>
              <div className="col" style={{ gap: 8 }}>
                <Btn kind="danger" icon={<I.Trash size={14} />}
                  onClick={() => { action.mutate({ method: 'torrent-remove', ids: [tor.id], extra: { 'delete-local-data': true } }); onBack(); }}>
                  {t('action.delete_files')}</Btn>
                <Btn icon={<I.Pause size={14} />}
                  onClick={() => action.mutate({ method: 'torrent-stop', ids: [tor.id] })}>
                  {t('action.pause')}</Btn>
              </div>
            </>
          ) : isWarn ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 14, lineHeight: 1.5 }}>
                {t('detail.hnr_warn')}
              </p>
              <Btn icon={<I.Play size={14} />}
                onClick={() => action.mutate({ method: 'torrent-start', ids: [tor.id] })}>
                {t('detail.force_seed')}</Btn>
            </>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5 }}>
              {t('detail.hnr_ok')}
            </p>
          )}
        </Card>

        <Card className="card-pad">
          <h3 className="h3" style={{ marginBottom: 10 }}>{t('detail.hnr_trace')}</h3>
          <pre style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.8,
            color: 'var(--text-soft)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            background: 'var(--surface-2)', padding: '10px 12px', borderRadius: 6,
          }}>
{`tracker       : ${trackerKey ?? 'unknown'}

ratio
  actuel      : ${tor.uploadRatio.toFixed(3)}
  requis      : ${thresholds.minRatio}
  satisfait   : ${ratioOk ? '✓ oui' : '✗ non'}

seed time
  actuel      : ${formatDurationLong(tor.secondsSeeding)}
  requis      : ${thresholds.minSeedtime != null ? formatDurationLong(thresholds.minSeedtime) : 'aucun'}
  satisfait   : ${seedtimeOk ? '✓ oui' : '✗ non'}${
  secondsRemaining != null && secondsRemaining > 0 ? `\n  restant     : ${formatDurationLong(secondsRemaining)}` : ''}

→ statut      : ${status.toUpperCase()}`}
          </pre>
        </Card>
      </div>
    </div>
  );
};
