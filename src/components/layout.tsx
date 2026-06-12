import React, { useState, useEffect } from 'react';
import * as I from './icons';
import { TDot } from './ui';
import type { Screen } from '../App';
import { useUIStore } from '../store/useStore';
import { formatSpeed } from '../hooks/useTorrents';

interface SidebarProps {
  active: Screen;
  onNavigate: (s: Screen) => void;
  onTrackerClick?: (trackerKey: string) => void;
  counts?: { danger?: number; warn?: number; ok?: number; total?: number };
  trackers?: { id: string; name: string; total: number }[];
  speedUp?: number;
  speedDown?: number;
  version?: string;
  freeSpace?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  active, onNavigate, onTrackerClick, counts = {}, trackers = [],
  speedUp = 0, speedDown = 0, version, freeSpace,
  mobileOpen, onMobileClose,
}) => {
  const { t } = useUIStore();

  const nav = (screen: Screen) => {
    onNavigate(screen);
    onMobileClose?.();
  };

  const trackerClick = (key: string) => {
    onTrackerClick?.(key);
    onMobileClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && <div className="sidebar-backdrop" onClick={onMobileClose} />}

      <aside className={`side sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="mark">T</div>
          <div className="name">Transmission<small>web interface</small></div>
          {/* Mobile close */}
          <button className="sidebar-close" onClick={onMobileClose}>
            <I.X size={18} />
          </button>
        </div>

        <div>
          <div className="sect-label">{t('nav.workspace')}</div>
          <nav className="side-nav">
            <a className={`side-item ${active === 'list' || active === 'detail' ? 'active' : ''}`}
              onClick={() => nav('list')}>
              <I.ListIcon size={16} />
              <span>{t('nav.torrents')}</span>
              {counts.total != null && (
                <span className={`badge ${(counts.danger ?? 0) > 0 ? 'danger' : ''}`}>{counts.total}</span>
              )}
            </a>
            <a className={`side-item ${active === 'hnr-triage' ? 'active' : ''}`}
              onClick={() => nav('hnr-triage')}>
              <I.Shield size={16} />
              <span>{t('nav.triage')}</span>
              {((counts.danger ?? 0) + (counts.warn ?? 0)) > 0 && (
                <span className={`badge ${(counts.danger ?? 0) > 0 ? 'danger' : 'warn'}`}>
                  {(counts.danger ?? 0) + (counts.warn ?? 0)}
                </span>
              )}
            </a>
          </nav>
        </div>

        {(counts.danger ?? 0) > 0 || (counts.warn ?? 0) > 0 || (counts.ok ?? 0) > 0 ? (
          <div>
            <div className="sect-label">{t('nav.hnr_status')}</div>
            <nav className="side-nav">
              {(counts.danger ?? 0) > 0 && (
                <a className="side-item" onClick={() => trackerClick('danger')}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)', boxShadow: '0 0 8px var(--danger)' }} />
                  <span>{t('nav.risk')}</span>
                  <span className="badge danger">{counts.danger}</span>
                </a>
              )}
              {(counts.warn ?? 0) > 0 && (
                <a className="side-item" onClick={() => trackerClick('warn')}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warn)' }} />
                  <span>{t('nav.watch')}</span>
                  <span className="badge warn">{counts.warn}</span>
                </a>
              )}
              {(counts.ok ?? 0) > 0 && (
                <a className="side-item" onClick={() => trackerClick('ok')}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--safe)' }} />
                  <span>{t('nav.deletable')}</span>
                  <span className="badge">{counts.ok}</span>
                </a>
              )}
            </nav>
          </div>
        ) : null}

        {trackers.length > 0 && (
          <div>
            <div className="sect-label">{t('nav.trackers')}</div>
            <nav className="side-nav">
              {trackers.map((tr) => (
                <a key={tr.id} className="side-item" onClick={() => trackerClick(tr.id)}>
                  <TDot id={tr.id} name={tr.name} />
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{tr.name}</span>
                  <span className="badge">{tr.total}</span>
                </a>
              ))}
            </nav>
          </div>
        )}

        <div>
          <div className="sect-label">{t('nav.system')}</div>
          <nav className="side-nav">
            <a className={`side-item ${active === 'stats' ? 'active' : ''}`}
              onClick={() => nav('stats')}>
              <I.Activity size={16} />
              <span>{t('nav.stats')}</span>
            </a>
            <a className={`side-item ${active === 'settings' ? 'active' : ''}`}
              onClick={() => nav('settings')}>
              <I.Slider size={16} />
              <span>{t('nav.hnr_rules')}</span>
            </a>
            <a className={`side-item ${active === 'tx-settings' ? 'active' : ''}`}
              onClick={() => nav('tx-settings')}>
              <I.Settings size={16} />
              <span>{t('nav.transmission')}</span>
            </a>
          </nav>
        </div>

        <div className="spacer" />

        <div className="health">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="eyebrow" style={{ fontSize: 9 }}>{t('nav.seedbox')}</span>
            <span className="row" style={{ fontSize: 11, color: 'var(--text-soft)', gap: 4 }}>
              <span className="dot" /> {t('nav.online')}
            </span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
            <span className="row" style={{ gap: 4, color: 'var(--safe)' }}>
              <I.ArrowU size={11} /> <span className="mono">{formatSpeed(speedUp)}</span>
            </span>
            <span className="row" style={{ gap: 4, color: 'var(--accent)' }}>
              <I.ArrowD size={11} /> <span className="mono">{formatSpeed(speedDown)}</span>
            </span>
          </div>
          {version && (
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
              <span className="muted">Transmission</span>
              <span className="mono">{version.split(/\s|\(/)[0]}</span>
            </div>
          )}
          {freeSpace && (
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
              <span className="muted">{t('nav.free')}</span>
              <span className="mono">{freeSpace}</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

// ── Topbar ────────────────────────────────────────────────────────────────

interface TopbarProps {
  crumbs?: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  onMenuClick?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ crumbs, title, right, onMenuClick }) => (
  <header className="topbar">
    {onMenuClick && (
      <button className="menu-btn" onClick={onMenuClick}>
        <I.ListIcon size={20} />
      </button>
    )}
    <div className="col" style={{ gap: 2, minWidth: 0 }}>
      {crumbs && <div className="crumbs">{crumbs}</div>}
      <div className="title">{title}</div>
    </div>
    <div className="right">{right}</div>
  </header>
);

// ── Hook to detect mobile ────────────────────────────────────────────────

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}
