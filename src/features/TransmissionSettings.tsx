import React, { useState } from 'react';
import { Card, Btn, Toggle, Page } from '../components/ui';
import * as I from '../components/icons';
import { useSession, useSessionSet, formatBytes } from '../hooks/useTorrents';
import { useUIStore } from '../store/useStore';
import { rpc } from '../lib/transmission';

export const TransmissionSettings: React.FC = () => {
  const { t, lang, setLang, theme, setTheme } = useUIStore();
  const { data: session, isLoading } = useSession();
  const sessionSet = useSessionSet();
  const [portResult, setPortResult] = useState<boolean | null>(null);
  const [blUpdating, setBlUpdating] = useState(false);

  const [form, setForm] = useState<Record<string, unknown>>({});
  const dirty = Object.keys(form).length > 0;

  const val = <T,>(key: string, fallback: T): T =>
    (key in form ? form[key] : session?.[key as keyof typeof session]) as T ?? fallback;

  const set = (key: string, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const save = () => {
    if (!dirty) return;
    sessionSet.mutate(form, { onSuccess: () => setForm({}) });
  };

  const testPort = async () => {
    setPortResult(null);
    try {
      const res = await rpc<{ 'port-is-open': boolean }>('port-test');
      setPortResult(res['port-is-open']);
    } catch { setPortResult(false); }
  };

  const updateBlocklist = async () => {
    setBlUpdating(true);
    try { await rpc('blocklist-update'); }
    catch { /* ignore */ }
    setBlUpdating(false);
  };

  if (isLoading || !session) return <Page><div className="empty">{t('misc.loading')}</div></Page>;

  return (
    <Page>
      <div className="col" style={{ gap: 20 }}>

        {/* Dirty bar */}
        {dirty && (
          <div className="card card-pad-sm row" style={{ background: 'var(--accent-glow)', borderColor: 'var(--accent)' }}>
            <I.Info size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 13, color: 'var(--accent)' }}>{t('tx.unsaved')}</span>
            <span style={{ flex: 1 }} />
            <Btn size="sm" kind="ghost" onClick={() => setForm({})}>{t('action.cancel')}</Btn>
            <Btn size="sm" kind="primary" icon={<I.Save size={13} />} onClick={save}
              disabled={sessionSet.isPending}>{t('action.save')}</Btn>
          </div>
        )}

        {/* ── Vitesse ─────────────────────────────────────────────── */}
        <Card>
          <div className="card-head"><h3 className="h3">{t('tx.speed_limits')}</h3></div>
          <div className="card-pad col" style={{ gap: 16 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="col" style={{ gap: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <label className="field-label" style={{ marginBottom: 0 }}>{t('tx.dl_limit')}</label>
                  <Toggle on={val('speed-limit-down-enabled', false)} onChange={v => set('speed-limit-down-enabled', v)} />
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <input className="input mono" type="number" min="0" step="10" style={{ width: 100 }}
                    disabled={!val('speed-limit-down-enabled', false)}
                    value={val('speed-limit-down', 0)} onChange={e => set('speed-limit-down', parseInt(e.target.value) || 0)} />
                  <span className="faint" style={{ fontSize: 12 }}>KB/s</span>
                </div>
              </div>
              <div className="col" style={{ gap: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <label className="field-label" style={{ marginBottom: 0 }}>{t('tx.ul_limit')}</label>
                  <Toggle on={val('speed-limit-up-enabled', false)} onChange={v => set('speed-limit-up-enabled', v)} />
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <input className="input mono" type="number" min="0" step="10" style={{ width: 100 }}
                    disabled={!val('speed-limit-up-enabled', false)}
                    value={val('speed-limit-up', 0)} onChange={e => set('speed-limit-up', parseInt(e.target.value) || 0)} />
                  <span className="faint" style={{ fontSize: 12 }}>KB/s</span>
                </div>
              </div>
            </div>

            <hr className="divider" />

            {/* Alt-speed */}
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                  <I.Turtle size={14} style={{ color: 'var(--text-soft)' }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{t('tx.turtle')}</span>
                </div>
                <span className="faint" style={{ fontSize: 12 }}>{t('tx.turtle_desc')}</span>
              </div>
              <Toggle on={val('alt-speed-enabled', false)} onChange={v => set('alt-speed-enabled', v)} />
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="row" style={{ gap: 6 }}>
                <label className="field-label" style={{ marginBottom: 0 }}>↓ Alt</label>
                <input className="input mono" type="number" min="0" step="10" style={{ width: 80 }}
                  value={val('alt-speed-down', 0)} onChange={e => set('alt-speed-down', parseInt(e.target.value) || 0)} />
                <span className="faint" style={{ fontSize: 12 }}>KB/s</span>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <label className="field-label" style={{ marginBottom: 0 }}>↑ Alt</label>
                <input className="input mono" type="number" min="0" step="10" style={{ width: 80 }}
                  value={val('alt-speed-up', 0)} onChange={e => set('alt-speed-up', parseInt(e.target.value) || 0)} />
                <span className="faint" style={{ fontSize: 12 }}>KB/s</span>
              </div>
            </div>

            {/* Alt-speed schedule */}
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{t('tx.turtle_schedule')}</span>
              <Toggle on={val('alt-speed-time-enabled', false)} onChange={v => set('alt-speed-time-enabled', v)} />
            </div>
            {val('alt-speed-time-enabled', false) && (
              <div className="row" style={{ gap: 12 }}>
                <div className="row" style={{ gap: 6 }}>
                  <label className="field-label" style={{ marginBottom: 0 }}>{t('misc.from')}</label>
                  <input className="input mono" type="number" min="0" max="1440" style={{ width: 70 }}
                    value={val('alt-speed-time-begin', 0)} onChange={e => set('alt-speed-time-begin', parseInt(e.target.value) || 0)} />
                  <span className="faint" style={{ fontSize: 11 }}>min</span>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <label className="field-label" style={{ marginBottom: 0 }}>{t('misc.to')}</label>
                  <input className="input mono" type="number" min="0" max="1440" style={{ width: 70 }}
                    value={val('alt-speed-time-end', 0)} onChange={e => set('alt-speed-time-end', parseInt(e.target.value) || 0)} />
                  <span className="faint" style={{ fontSize: 11 }}>min</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ── Répertoires ─────────────────────────────────────────── */}
        <Card>
          <div className="card-head"><h3 className="h3">{t('tx.directories')}</h3></div>
          <div className="card-pad col" style={{ gap: 14 }}>
            <div>
              <label className="field-label">{t('tx.dl_dir')}</label>
              <input className="input mono" value={val('download-dir', '')} onChange={e => set('download-dir', e.target.value)} />
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{t('tx.incomplete_dir')}</span>
              <Toggle on={val('incomplete-dir-enabled', false)} onChange={v => set('incomplete-dir-enabled', v)} />
            </div>
            {val('incomplete-dir-enabled', false) && (
              <input className="input mono" value={val('incomplete-dir', '')} onChange={e => set('incomplete-dir', e.target.value)} />
            )}
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{t('tx.rename_partial')}</span>
              <Toggle on={val('rename-partial-files', false)} onChange={v => set('rename-partial-files', v)} />
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{t('tx.trash_torrent')}</span>
              <Toggle on={val('trash-original-torrent-files', false)} onChange={v => set('trash-original-torrent-files', v)} />
            </div>
          </div>
        </Card>

        {/* ── Queue ───────────────────────────────────────────────── */}
        <Card>
          <div className="card-head"><h3 className="h3">{t('tx.queue')}</h3></div>
          <div className="card-pad col" style={{ gap: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="col" style={{ gap: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <label className="field-label" style={{ marginBottom: 0 }}>{t('tx.dl_queue')}</label>
                  <Toggle on={val('download-queue-enabled', true)} onChange={v => set('download-queue-enabled', v)} />
                </div>
                <input className="input mono" type="number" min="1" style={{ width: 80 }}
                  disabled={!val('download-queue-enabled', true)}
                  value={val('download-queue-size', 5)} onChange={e => set('download-queue-size', parseInt(e.target.value) || 1)} />
              </div>
              <div className="col" style={{ gap: 8 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <label className="field-label" style={{ marginBottom: 0 }}>{t('tx.seed_queue')}</label>
                  <Toggle on={val('seed-queue-enabled', false)} onChange={v => set('seed-queue-enabled', v)} />
                </div>
                <input className="input mono" type="number" min="1" style={{ width: 80 }}
                  disabled={!val('seed-queue-enabled', false)}
                  value={val('seed-queue-size', 10)} onChange={e => set('seed-queue-size', parseInt(e.target.value) || 1)} />
              </div>
            </div>
            <hr className="divider" />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{t('tx.stalled')}</span>
              <Toggle on={val('queue-stalled-enabled', true)} onChange={v => set('queue-stalled-enabled', v)} />
            </div>
            {val('queue-stalled-enabled', true) && (
              <div className="row" style={{ gap: 6 }}>
                <label className="field-label" style={{ marginBottom: 0 }}>{t('tx.stalled_min')}</label>
                <input className="input mono" type="number" min="1" style={{ width: 70 }}
                  value={val('queue-stalled-minutes', 30)} onChange={e => set('queue-stalled-minutes', parseInt(e.target.value) || 1)} />
                <span className="faint" style={{ fontSize: 12 }}>{t('tx.minutes')}</span>
              </div>
            )}
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{t('tx.auto_start')}</span>
              <Toggle on={val('start-added-torrents', true)} onChange={v => set('start-added-torrents', v)} />
            </div>
          </div>
        </Card>

        {/* ── Peers ───────────────────────────────────────────────── */}
        <Card>
          <div className="card-head"><h3 className="h3">{t('tx.peers')}</h3></div>
          <div className="card-pad col" style={{ gap: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label">{t('tx.peer_global')}</label>
                <input className="input mono" type="number" min="1" style={{ width: 100 }}
                  value={val('peer-limit-global', 200)} onChange={e => set('peer-limit-global', parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <label className="field-label">{t('tx.peer_torrent')}</label>
                <input className="input mono" type="number" min="1" style={{ width: 100 }}
                  value={val('peer-limit-per-torrent', 50)} onChange={e => set('peer-limit-per-torrent', parseInt(e.target.value) || 1)} />
              </div>
            </div>
            <div>
              <label className="field-label">{t('tx.encryption')}</label>
              <select className="select" style={{ width: 200 }} value={val('encryption', 'preferred')}
                onChange={e => set('encryption', e.target.value)}>
                <option value="required">{t('tx.enc_required')}</option>
                <option value="preferred">{t('tx.enc_preferred')}</option>
                <option value="tolerated">{t('tx.enc_tolerated')}</option>
              </select>
            </div>
          </div>
        </Card>

        {/* ── Réseau ──────────────────────────────────────────────── */}
        <Card>
          <div className="card-head"><h3 className="h3">{t('tx.network')}</h3></div>
          <div className="card-pad col" style={{ gap: 14 }}>
            <div className="row" style={{ gap: 16 }}>
              <div>
                <label className="field-label">{t('tx.port')}</label>
                <div className="row" style={{ gap: 8 }}>
                  <input className="input mono" type="number" min="1024" max="65535" style={{ width: 100 }}
                    value={val('peer-port', 51413)} onChange={e => set('peer-port', parseInt(e.target.value) || 51413)} />
                  <Btn size="sm" onClick={testPort}>{t('action.test')}</Btn>
                  {portResult !== null && (
                    <span className="mono" style={{ fontSize: 12, color: portResult ? 'var(--safe)' : 'var(--danger)' }}>
                      {portResult ? t('tx.port_open') : t('tx.port_closed')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{t('tx.port_random')}</span>
              <Toggle on={val('peer-port-random-on-start', false)} onChange={v => set('peer-port-random-on-start', v)} />
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{t('tx.port_forward')}</span>
              <Toggle on={val('port-forwarding-enabled', false)} onChange={v => set('port-forwarding-enabled', v)} />
            </div>
            <hr className="divider" />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 13 }}>DHT</span>
                <Toggle on={val('dht-enabled', true)} onChange={v => set('dht-enabled', v)} /></div>
              <div className="row" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 13 }}>PEX</span>
                <Toggle on={val('pex-enabled', true)} onChange={v => set('pex-enabled', v)} /></div>
              <div className="row" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 13 }}>LPD</span>
                <Toggle on={val('lpd-enabled', false)} onChange={v => set('lpd-enabled', v)} /></div>
              <div className="row" style={{ justifyContent: 'space-between' }}><span style={{ fontSize: 13 }}>µTP</span>
                <Toggle on={val('utp-enabled', true)} onChange={v => set('utp-enabled', v)} /></div>
            </div>
          </div>
        </Card>

        {/* ── Seeding ─────────────────────────────────────────────── */}
        <Card>
          <div className="card-head"><h3 className="h3">{t('tx.seeding')}</h3></div>
          <div className="card-pad col" style={{ gap: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label">{t('tx.seed_ratio')}</label>
                <input className="input mono" type="number" min="0" step="0.1" style={{ width: 100 }}
                  value={val('seedRatioLimit', 2)} onChange={e => set('seedRatioLimit', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="row" style={{ justifyContent: 'space-between', alignSelf: 'end' }}>
                <span style={{ fontSize: 13 }}>{t('tx.seed_ratio_on')}</span>
                <Toggle on={val('seedRatioLimited', false)} onChange={v => set('seedRatioLimited', v)} />
              </div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label">{t('tx.idle_limit')}</label>
                <input className="input mono" type="number" min="0" step="5" style={{ width: 100 }}
                  value={val('idle-seeding-limit', 30)} onChange={e => set('idle-seeding-limit', parseInt(e.target.value) || 0)} />
              </div>
              <div className="row" style={{ justifyContent: 'space-between', alignSelf: 'end' }}>
                <span style={{ fontSize: 13 }}>{t('tx.idle_on')}</span>
                <Toggle on={val('idle-seeding-limit-enabled', false)} onChange={v => set('idle-seeding-limit-enabled', v)} />
              </div>
            </div>
          </div>
        </Card>

        {/* ── Scripts ─────────────────────────────────────────────── */}
        <Card>
          <div className="card-head"><h3 className="h3">{t('tx.scripts')}</h3></div>
          <div className="card-pad col" style={{ gap: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{t('tx.script_added')}</span>
              <Toggle on={val('script-torrent-added-enabled', false)} onChange={v => set('script-torrent-added-enabled', v)} />
            </div>
            {val('script-torrent-added-enabled', false) && (
              <input className="input mono" placeholder="/path/to/script.sh"
                value={val('script-torrent-added-filename', '')} onChange={e => set('script-torrent-added-filename', e.target.value)} />
            )}
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{t('tx.script_done')}</span>
              <Toggle on={val('script-torrent-done-enabled', false)} onChange={v => set('script-torrent-done-enabled', v)} />
            </div>
            {val('script-torrent-done-enabled', false) && (
              <input className="input mono" placeholder="/path/to/script.sh"
                value={val('script-torrent-done-filename', '')} onChange={e => set('script-torrent-done-filename', e.target.value)} />
            )}
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{t('tx.script_seed_done')}</span>
              <Toggle on={val('script-torrent-done-seeding-enabled', false)} onChange={v => set('script-torrent-done-seeding-enabled', v)} />
            </div>
            {val('script-torrent-done-seeding-enabled', false) && (
              <input className="input mono" placeholder="/path/to/script.sh"
                value={val('script-torrent-done-seeding-filename', '')} onChange={e => set('script-torrent-done-seeding-filename', e.target.value)} />
            )}
          </div>
        </Card>

        {/* ── Blocklist ───────────────────────────────────────────── */}
        <Card>
          <div className="card-head"><h3 className="h3">{t('tx.blocklist')}</h3></div>
          <div className="card-pad col" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>{t('tx.blocklist_on')}</span>
              <Toggle on={val('blocklist-enabled', false)} onChange={v => set('blocklist-enabled', v)} />
            </div>
            {val('blocklist-enabled', false) && (
              <>
                <div>
                  <label className="field-label">{t('tx.blocklist_url')}</label>
                  <input className="input mono" value={val('blocklist-url', '')} onChange={e => set('blocklist-url', e.target.value)} />
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <Btn size="sm" icon={<I.Refresh size={13} />} onClick={updateBlocklist} disabled={blUpdating}>
                    {blUpdating ? t('action.updating') : t('action.update')}
                  </Btn>
                  <span className="mono faint" style={{ fontSize: 12 }}>{val('blocklist-size', 0)} {t('tx.blocklist_rules')}</span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* ── Trackers par défaut ──────────────────────────────────── */}
        <Card>
          <div className="card-head"><h3 className="h3">{t('tx.default_trackers')}</h3></div>
          <div className="card-pad col" style={{ gap: 8 }}>
            <span className="faint" style={{ fontSize: 12 }}>{t('tx.default_trackers_desc')}</span>
            <textarea className="input mono" rows={4} style={{ resize: 'vertical', fontSize: 12 }}
              value={val('default-trackers', '')} onChange={e => set('default-trackers', e.target.value)} />
          </div>
        </Card>

        {/* ── Interface ────────────────────────────────────────────── */}
        <Card>
          <div className="card-head"><h3 className="h3">Interface</h3></div>
          <div className="card-pad col" style={{ gap: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="field-label">{lang === 'fr' ? 'Langue' : 'Language'}</label>
                <select className="select" style={{ width: '100%' }} value={lang}
                  onChange={e => setLang(e.target.value as 'fr' | 'en')}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="field-label">{t('theme.dark')} / {t('theme.light')}</label>
                <select className="select" style={{ width: '100%' }} value={theme}
                  onChange={e => setTheme(e.target.value as 'dark' | 'light')}>
                  <option value="dark">{t('theme.dark')}</option>
                  <option value="light">{t('theme.light')}</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Info ────────────────────────────────────────────────── */}
        <Card className="card-pad" style={{ borderColor: 'var(--line-soft)' }}>
          <div className="col" style={{ gap: 6, fontSize: 13 }}>
            <div className="row" style={{ gap: 12 }}>
              <span className="field-label" style={{ minWidth: 120, marginBottom: 0 }}>Version</span>
              <span className="mono">{session.version}</span>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <span className="field-label" style={{ minWidth: 120, marginBottom: 0 }}>RPC version</span>
              <span className="mono">{session['rpc-version']}</span>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <span className="field-label" style={{ minWidth: 120, marginBottom: 0 }}>{t('stat.free_space')}</span>
              <span className="mono">{formatBytes(session['download-dir-free-space'] ?? 0)}</span>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <span className="field-label" style={{ minWidth: 120, marginBottom: 0 }}>Config</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-soft)' }}>{session['config-dir'] ?? '—'}</span>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
};
