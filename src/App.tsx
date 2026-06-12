import React, { useState } from 'react';
import { Sidebar, Topbar, useIsMobile } from './components/layout';
import { Btn, Chip } from './components/ui';
import * as I from './components/icons';
import { TorrentList } from './features/TorrentList';
import { Detail } from './features/Detail';
import { Settings } from './features/Settings';
import { TransmissionSettings } from './features/TransmissionSettings';
import { Stats } from './features/Stats';
import { HnrTriage } from './features/HnrTriage';
import { AddTorrent } from './features/AddTorrent';
import { useTorrents, useSessionStats, useSession, statusCounts, formatBytes } from './hooks/useTorrents';
import { useUIStore } from './store/useStore';

export type Screen = 'list' | 'detail' | 'settings' | 'tx-settings' | 'stats' | 'hnr-triage';

export default function App() {
  const [screen, setScreen] = useState<Screen>('list');
  const [selectedTorrentId, setSelectedTorrentId] = useState<number | null>(null);
  const [listFilter, setListFilter] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const { t } = useUIStore();

  const { data: torrents = [] } = useTorrents();
  const { data: stats } = useSessionStats();
  const { data: session } = useSession();
  const counts = statusCounts(torrents);

  const screenConfig: Record<Exclude<Screen, 'detail'>, { title: string; crumbs: string[] }> = {
    list:          { title: t('nav.torrents'),     crumbs: [t('crumb.workspace'), t('crumb.torrents')] },
    stats:         { title: t('nav.stats'),        crumbs: [t('crumb.workspace'), t('crumb.stats')] },
    'hnr-triage':  { title: t('nav.triage'),       crumbs: [t('crumb.workspace'), t('crumb.triage')] },
    settings:      { title: t('nav.hnr_rules'),    crumbs: [t('crumb.system'), t('crumb.hnr_rules')] },
    'tx-settings': { title: t('nav.transmission'), crumbs: [t('crumb.system'), t('crumb.transmission')] },
  };

  const cfg = screen === 'detail'
    ? { title: t('detail.title'), crumbs: [t('crumb.workspace'), t('crumb.torrents'), t('crumb.detail')] }
    : screenConfig[screen];

  const crumbs = (
    <>
      {cfg.crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <I.ChevronR size={11} style={{ color: 'var(--text-mute)' }} />}
          <span style={{ color: i === cfg.crumbs.length - 1 ? 'var(--text)' : 'var(--text-faint)' }}>{c}</span>
        </React.Fragment>
      ))}
    </>
  );

  const topbarRight = (
    <div className="row" style={{ gap: 8 }}>
      {counts.danger > 0 && (
        <Chip kind="danger" pulse style={{ cursor: 'pointer' }} onClick={() => setScreen('hnr-triage')}>
          {counts.danger} {t('topbar.risk_n')}
        </Chip>
      )}
      <Btn size="sm" kind="primary" icon={<I.Plus size={13} />} onClick={() => setShowAdd(true)}>
        {t('topbar.add')}
      </Btn>
    </div>
  );

  const trackerGroups = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const to of torrents) {
      if (to.trackerKey) map.set(to.trackerKey, (map.get(to.trackerKey) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([id, total]) => ({ id, name: id, total }));
  }, [torrents]);

  const freeSpace = session?.['download-dir-free-space']
    ? formatBytes(session['download-dir-free-space'])
    : undefined;

  const handleFilterFromSidebar = (key: string) => {
    setListFilter(key);
    setScreen('list');
  };

  return (
    <div className="app">
      <Sidebar
        active={screen}
        onNavigate={setScreen}
        mobileOpen={menuOpen}
        onMobileClose={() => setMenuOpen(false)}
        onTrackerClick={handleFilterFromSidebar}
        counts={counts}
        trackers={trackerGroups}
        speedUp={stats?.uploadSpeed ?? 0}
        speedDown={stats?.downloadSpeed ?? 0}
        version={session?.version}
        freeSpace={freeSpace}
      />
      <div className="main">
        <Topbar crumbs={crumbs} title={cfg.title} right={topbarRight}
          onMenuClick={isMobile ? () => setMenuOpen(true) : undefined} />
        {screen === 'list' && (
          <TorrentList
            key={listFilter}
            initialFilter={listFilter}
            onSelect={(id) => { setSelectedTorrentId(id); setScreen('detail'); }}
          />
        )}
        {screen === 'detail' && selectedTorrentId != null && (() => {
          const ids = torrents.map((to) => to.torrent.id);
          const idx = ids.indexOf(selectedTorrentId);
          // If torrent was deleted (not in list anymore), go back
          if (idx < 0 && torrents.length > 0) {
            setTimeout(() => setScreen('list'), 0);
            return null;
          }
          return (
            <Detail
              torrentId={selectedTorrentId}
              onBack={() => setScreen('list')}
              onPrev={idx > 0 ? () => setSelectedTorrentId(ids[idx - 1]) : undefined}
              onNext={idx >= 0 && idx < ids.length - 1 ? () => setSelectedTorrentId(ids[idx + 1]) : undefined}
            />
          );
        })()}
        {screen === 'stats' && <Stats />}
        {screen === 'hnr-triage' && <HnrTriage />}
        {screen === 'settings' && <Settings />}
        {screen === 'tx-settings' && <TransmissionSettings />}
      </div>
      <AddTorrent
        open={showAdd}
        onClose={() => setShowAdd(false)}
        defaultDir={session?.['download-dir']}
      />
    </div>
  );
}
