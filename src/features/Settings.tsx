import React, { useState } from 'react';
import { Card, Btn, Chip, TDot, Toggle, Page } from '../components/ui';
import { trackerBg } from '../components/ui';
import * as I from '../components/icons';
import { useSettingsStore, useUIStore } from '../store/useStore';
import { type CombineMode, type FailAction, type TrackerRule, DEFAULT_THRESHOLDS } from '../lib/hnr';
import { useTorrents, statusCounts } from '../hooks/useTorrents';

export const Settings: React.FC = () => {
  const { t } = useUIStore();
  const { trackerRules, setTrackerRule, removeTrackerRule } = useSettingsStore();
  const { data: torrents = [] } = useTorrents();
  const counts = statusCounts(torrents);

  const [adding, setAdding] = useState(false);
  const [newTrackerName, setNewTrackerName] = useState('');

  const COMBINE_OPTIONS: { value: CombineMode; label: string }[] = [
    { value: 'OR', label: t('settings.combine.or') },
    { value: 'AND', label: t('settings.combine.and') },
    { value: 'RATIO_ONLY', label: t('settings.combine.ratio') },
    { value: 'TIME_ONLY', label: t('settings.combine.time') },
  ];

  const ACTION_OPTIONS: { value: FailAction; label: string }[] = [
    { value: 'flag', label: t('settings.action.ignore') },
    { value: 'pause', label: t('settings.action.pause') },
    { value: 'delete', label: t('settings.action.delete') },
    { value: 'delete-files', label: t('settings.action.delete_files') },
  ];

  // Collect all tracker sitenames seen in current torrents
  const liveTrackers = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of torrents) {
      if (t.trackerKey) set.add(t.trackerKey);
    }
    return Array.from(set).sort();
  }, [torrents]);

  // Trackers that have torrents but no rule yet
  const existingRuleIds = new Set(trackerRules.map(r => r.trackerId));
  const unruledTrackers = liveTrackers.filter(k => !existingRuleIds.has(k));

  // Count torrents per tracker
  const trackerCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of torrents) {
      if (t.trackerKey) map[t.trackerKey] = (map[t.trackerKey] ?? 0) + 1;
    }
    return map;
  }, [torrents]);

  const addRule = (trackerId: string) => {
    setTrackerRule({
      trackerId,
      minRatio: DEFAULT_THRESHOLDS.minRatio,
      minSeedtimeH: DEFAULT_THRESHOLDS.minSeedtime != null ? DEFAULT_THRESHOLDS.minSeedtime / 3600 : null,
      combine: 'OR',
      failAction: 'flag',
    });
    setNewTrackerName('');
    setAdding(false);
  };

  const updateRule = (trackerId: string, patch: Partial<TrackerRule>) => {
    const rule = trackerRules.find(r => r.trackerId === trackerId);
    if (rule) setTrackerRule({ ...rule, ...patch });
  };

  return (
    <Page>
      <div className="col" style={{ gap: 20 }}>
        {/* Preview */}
        <Card className="card-pad">
          <h3 className="h3" style={{ marginBottom: 12 }}>{t('settings.preview')}</h3>
          <div className="row" style={{ gap: 24 }}>
            <div className="row" style={{ gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} />
              <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--danger)' }}>{counts.danger}</span>
              <span className="faint" style={{ fontSize: 12 }}>{t('settings.risk')}</span>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warn)' }} />
              <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--warn)' }}>{counts.warn}</span>
              <span className="faint" style={{ fontSize: 12 }}>{t('settings.watch')}</span>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--safe)' }} />
              <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--safe)' }}>{counts.ok}</span>
              <span className="faint" style={{ fontSize: 12 }}>{t('settings.deletable')}</span>
            </div>
          </div>
        </Card>

        {/* Trackers without rules (suggestion) */}
        {unruledTrackers.length > 0 && (
          <Card className="card-pad">
            <h3 className="h3" style={{ marginBottom: 10 }}>{t('settings.unruled_title')}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 12 }}>
              {t('settings.unruled_desc')}
            </p>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {unruledTrackers.map(k => (
                <Btn key={k} size="sm" icon={<I.Plus size={12} />} onClick={() => addRule(k)}>
                  <TDot id={k} name={k} />
                  <span className="mono">{k}</span>
                  <span className="faint mono" style={{ fontSize: 11 }}>{trackerCounts[k] ?? 0}</span>
                </Btn>
              ))}
            </div>
          </Card>
        )}

        {/* Rules table */}
        <Card>
          <div className="card-head">
            <h3 className="h3">{t('settings.rules_title')}</h3>
            <div className="right">
              {!adding && (
                <Btn size="sm" icon={<I.Plus size={13} />} onClick={() => setAdding(true)}>
                  {t('action.add')}
                </Btn>
              )}
            </div>
          </div>

          {adding && (
            <div className="card-pad row" style={{ gap: 8, background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
              <input
                className="input mono"
                style={{ width: 180, fontSize: 13 }}
                placeholder={t('settings.tracker_placeholder')}
                value={newTrackerName}
                onChange={e => setNewTrackerName(e.target.value.toLowerCase().trim())}
                onKeyDown={e => { if (e.key === 'Enter' && newTrackerName) addRule(newTrackerName); }}
                autoFocus
              />
              {/* Quick-add buttons for detected trackers without rules */}
              {unruledTrackers.map(k => (
                <Btn key={k} size="sm" kind="ghost" onClick={() => addRule(k)}>
                  <span style={{ width: 8, height: 8, background: trackerBg(k), borderRadius: 2 }} />
                  {k}
                </Btn>
              ))}
              <span style={{ flex: 1 }} />
              <Btn size="sm" kind="primary" disabled={!newTrackerName || existingRuleIds.has(newTrackerName)}
                onClick={() => addRule(newTrackerName)}>{t('action.add')}</Btn>
              <Btn size="sm" kind="ghost" onClick={() => { setAdding(false); setNewTrackerName(''); }}>{t('action.cancel')}</Btn>
            </div>
          )}

          <table className="tbl">
            <thead>
              <tr>
                <th>{t('settings.tracker')}</th>
                <th style={{ width: 80 }}>{t('settings.torrents_col')}</th>
                <th style={{ width: 70 }}>Freeleech</th>
                <th style={{ width: 90 }}>{t('settings.ratio_min')}</th>
                <th style={{ width: 100 }}>{t('settings.seed_h')}</th>
                <th style={{ width: 150 }}>{t('settings.combine')}</th>
                <th style={{ width: 140 }}>{t('settings.action')}</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {trackerRules.map(rule => {
                const count = trackerCounts[rule.trackerId] ?? 0;
                const isLive = liveTrackers.includes(rule.trackerId);
                return (
                  <tr key={rule.trackerId}>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <TDot id={rule.trackerId} name={rule.trackerId} />
                        <span className="mono" style={{ fontWeight: 600 }}>{rule.trackerId}</span>
                        {!isLive && (
                          <Chip size="sm" style={{ fontSize: 10 }}>{t('settings.inactive')}</Chip>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="mono tabular" style={{ color: count > 0 ? 'var(--text)' : 'var(--text-faint)' }}>
                        {count}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Toggle on={rule.freeleech ?? false}
                        onChange={v => updateRule(rule.trackerId, { freeleech: v })} />
                    </td>
                    <td>
                      <input className="input mono" type="number" step="0.1" min="0"
                        style={{ width: 70, padding: '4px 6px', fontSize: 12 }}
                        value={rule.minRatio}
                        onChange={e => updateRule(rule.trackerId, { minRatio: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td>
                      <input className="input mono" type="number" step="1" min="0"
                        style={{ width: 70, padding: '4px 6px', fontSize: 12 }}
                        value={rule.minSeedtimeH ?? ''}
                        placeholder="—"
                        onChange={e => {
                          const v = e.target.value;
                          updateRule(rule.trackerId, { minSeedtimeH: v === '' ? null : parseFloat(v) || 0 });
                        }}
                      />
                    </td>
                    <td>
                      <select className="select" style={{ fontSize: 12, padding: '4px 6px' }}
                        value={rule.combine}
                        onChange={e => updateRule(rule.trackerId, { combine: e.target.value as CombineMode })}>
                        {COMBINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="select" style={{ fontSize: 12, padding: '4px 6px' }}
                        value={rule.failAction}
                        onChange={e => updateRule(rule.trackerId, { failAction: e.target.value as FailAction })}>
                        {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <Btn size="sm" kind="danger-ghost" icon={<I.Trash size={12} />}
                        onClick={() => removeTrackerRule(rule.trackerId)} />
                    </td>
                  </tr>
                );
              })}
              {trackerRules.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty" style={{ padding: 20 }}>
                    {t('settings.no_rules')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* Info */}
        <Card className="card-pad" style={{ borderColor: 'var(--line-soft)' }}>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <I.Info size={14} style={{ color: 'var(--text-faint)' }} />
            <h3 className="h3" style={{ margin: 0 }}>{t('settings.how_title')}</h3>
          </div>
          <div className="col" style={{ gap: 6, fontSize: 13, color: 'var(--text-soft)' }}>
            <p style={{ margin: 0 }}>
              {t('settings.how_1')}
            </p>
            <p style={{ margin: 0 }}>
              {t('settings.how_2')}
            </p>
            <p style={{ margin: 0 }}>
              {t('settings.how_3')}
            </p>
          </div>
        </Card>
      </div>
    </Page>
  );
};
