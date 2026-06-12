// H&R (Hit and Run) status logic
// Detects tracker via trackerStats[].sitename, applies user-configured thresholds

import type { Torrent, TrackerStats } from './transmission';
import { TorrentStatus } from './transmission';

// ── Types ─────────────────────────────────────────────────────────────────

export type HRStatus = 'ok' | 'warn' | 'danger' | 'downloading' | 'unknown';
export type CombineMode = 'OR' | 'AND' | 'RATIO_ONLY' | 'TIME_ONLY';
export type FailAction = 'flag' | 'pause' | 'delete' | 'delete-files';

export interface TrackerThresholds {
  minRatio: number;
  /** seconds — null means "no seedtime requirement" */
  minSeedtime: number | null;
  /** when true, tracker is in freeleech — all torrents are safe to delete */
  freeleech?: boolean;
  /** how ratio and seedtime requirements combine (default: OR) */
  combine?: CombineMode;
}

export interface TrackerRule {
  trackerId: string;        // any sitename (dynamic, not hardcoded)
  minRatio: number;
  minSeedtimeH: number | null;
  combine: CombineMode;
  failAction: FailAction;
  freeleech?: boolean;       // when true, all torrents from this tracker are considered "ok"
}

export const DEFAULT_THRESHOLDS: TrackerThresholds = {
  minRatio: 1.0,
  minSeedtime: null,
};

// ── Tracker detection ────────────────────────────────────────────────────

/** Extract the tracker sitename from a torrent's trackerStats. Returns null if empty. */
export function resolveTrackerKey(trackerStats: TrackerStats[]): string | null {
  for (const stat of trackerStats) {
    if (stat.sitename) return stat.sitename.toLowerCase();
  }
  return null;
}

// ── Status computation ───────────────────────────────────────────────────

export function computeStatus(torrent: Torrent, thresholds: TrackerThresholds): HRStatus {
  if (
    torrent.status === TorrentStatus.Download ||
    torrent.status === TorrentStatus.DownloadWait ||
    torrent.percentDone < 1
  ) {
    return 'downloading';
  }

  const { minRatio, minSeedtime, combine = 'OR' } = thresholds;
  const ratioOk = torrent.uploadRatio >= minRatio;
  const seedtimeOk = minSeedtime === null || torrent.secondsSeeding >= minSeedtime;
  // seedtimeMet: true only if there IS a requirement AND it's met
  const seedtimeMet = minSeedtime !== null && torrent.secondsSeeding >= minSeedtime;

  // Check if obligations are met based on combine mode
  let met = false;
  switch (combine) {
    case 'AND':        met = ratioOk && seedtimeOk; break;
    case 'RATIO_ONLY': met = ratioOk; break;
    case 'TIME_ONLY':  met = minSeedtime === null ? true : seedtimeMet; break;
    case 'OR': default: met = ratioOk || seedtimeMet; break;
  }
  if (met) return 'ok';

  // A torrent in error or stopped that hasn't met H&R requirements is dangerous:
  // its seedtime counter is frozen but the tracker deadline keeps ticking
  const isStopped = torrent.status === TorrentStatus.Stopped;
  const hasError = torrent.error > 0;
  if (isStopped || hasError) return 'danger';

  const secondsRemaining =
    minSeedtime !== null ? Math.max(0, minSeedtime - torrent.secondsSeeding) : null;

  if (secondsRemaining !== null && secondsRemaining <= 24 * 3600) {
    return 'danger';
  }

  return 'warn';
}

// ── Enriched torrent ─────────────────────────────────────────────────────

export interface EnrichedTorrent {
  torrent: Torrent;
  trackerKey: string | null;
  thresholds: TrackerThresholds;
  status: HRStatus;
  /** true if the tracker has a configured rule (H&R monitoring is active) */
  hasRule: boolean;
  sizeGb: number;
  ratioProgress: number;
  seedtimeProgress: number | null;
  secondsRemaining: number | null;
}

export function enrichTorrent(
  torrent: Torrent,
  rulesOverride?: Record<string, TrackerThresholds>,
): EnrichedTorrent {
  const trackerKey = resolveTrackerKey(torrent.trackerStats ?? []);
  const rule = trackerKey ? rulesOverride?.[trackerKey] : undefined;
  const thresholds = rule ?? DEFAULT_THRESHOLDS;
  const hasRule = !!rule;

  // Freeleech → always ok, otherwise compute
  const status = !hasRule ? 'unknown' : thresholds.freeleech ? 'ok' : computeStatus(torrent, thresholds);

  const sizeGb = Math.round((torrent.totalSize / 1024 ** 3) * 100) / 100;
  const ratioProgress = thresholds.minRatio > 0
    ? Math.min(100, (torrent.uploadRatio / thresholds.minRatio) * 100)
    : 100;

  let seedtimeProgress: number | null = null;
  let secondsRemaining: number | null = null;

  if (thresholds.minSeedtime !== null) {
    seedtimeProgress = Math.min(100, (torrent.secondsSeeding / thresholds.minSeedtime) * 100);
    secondsRemaining =
      torrent.secondsSeeding >= thresholds.minSeedtime
        ? 0
        : thresholds.minSeedtime - torrent.secondsSeeding;
  }

  return { torrent, trackerKey, thresholds, status, hasRule, sizeGb, ratioProgress, seedtimeProgress, secondsRemaining };
}

const STATUS_ORDER: HRStatus[] = ['danger', 'warn', 'downloading', 'ok', 'unknown'];

export function enrichAndSort(
  torrents: Torrent[],
  rulesOverride?: Record<string, TrackerThresholds>,
): EnrichedTorrent[] {
  return torrents
    .map(t => enrichTorrent(t, rulesOverride))
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
}
