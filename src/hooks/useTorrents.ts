import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTorrents, getTorrent, getSessionStats, getSession, getFreeSpace,
  torrentAction, torrentAdd, torrentSet, torrentRenamePath, sessionSet, queueMove,
  LIST_FIELDS,
  type SessionStats, type Session, type TorrentAddArgs,
} from '../lib/transmission';
import { enrichAndSort, type EnrichedTorrent, type TrackerThresholds } from '../lib/hnr';
import { useSettingsStore } from '../store/useStore';

// ── Torrents (list, polled) ───────────────────────────────────────────────

export function useTorrents() {
  const trackerRules = useSettingsStore((s) => s.trackerRules);

  const thresholdsOverride = React.useMemo((): Record<string, TrackerThresholds> => {
    const map: Record<string, TrackerThresholds> = {};
    for (const rule of trackerRules) {
      map[rule.trackerId] = {
        minRatio: rule.minRatio,
        minSeedtime: rule.minSeedtimeH != null ? rule.minSeedtimeH * 3600 : null,
        freeleech: rule.freeleech,
        combine: rule.combine,
      };
    }
    return map;
  }, [trackerRules]);

  return useQuery({
    queryKey: ['torrents'],
    queryFn: () => getTorrents(LIST_FIELDS),
    select: (raw) => enrichAndSort(raw, thresholdsOverride),
    refetchInterval: 5_000,
    staleTime: 3_000,
  });
}

// ── Single torrent detail ────────────────────────────────────────────────

export function useTorrentDetail(id: number | null) {
  return useQuery({
    queryKey: ['torrent', id],
    queryFn: () => getTorrent(id!),
    enabled: id != null,
    refetchInterval: 3_000,
    staleTime: 2_000,
  });
}

// ── Session stats (speeds) ───────────────────────────────────────────────

export function useSessionStats() {
  return useQuery<SessionStats>({
    queryKey: ['session-stats'],
    queryFn: getSessionStats,
    refetchInterval: 5_000,
    staleTime: 4_000,
  });
}

// ── Session config ───────────────────────────────────────────────────────

export function useSession() {
  return useQuery<Session>({
    queryKey: ['session'],
    queryFn: getSession,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}

// ── Free space ───────────────────────────────────────────────────────────

export function useFreeSpace(path: string | undefined) {
  return useQuery({
    queryKey: ['free-space', path],
    queryFn: () => getFreeSpace(path!),
    enabled: !!path,
    staleTime: 15_000,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────

export function useTorrentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ method, ids, extra }: {
      method: Parameters<typeof torrentAction>[0];
      ids: number[];
      extra?: Record<string, unknown>;
    }) => torrentAction(method, ids, extra),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['torrents'] }),
  });
}

export function useTorrentAdd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: TorrentAddArgs) => torrentAdd(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['torrents'] }),
  });
}

export function useTorrentSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, ...args }: { ids: number[] } & Record<string, unknown>) =>
      torrentSet(ids, args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['torrents'] });
      qc.invalidateQueries({ queryKey: ['torrent'] });
    },
  });
}

export function useTorrentRename() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, path, name }: { id: number; path: string; name: string }) =>
      torrentRenamePath(id, path, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['torrents'] });
      qc.invalidateQueries({ queryKey: ['torrent'] });
    },
  });
}

export function useSessionSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: Record<string, unknown>) => sessionSet(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session'] }),
  });
}

export function useQueueMove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, ids }: {
      action: Parameters<typeof queueMove>[0];
      ids: number[];
    }) => queueMove(action, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['torrents'] }),
  });
}

// ── Formatting helpers ───────────────────────────────────────────────────

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(decimals)} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  return `${(bytesPerSec / k ** i).toFixed(1)} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 0) return '\u221E';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}j`;
}

export function formatDurationLong(seconds: number): string {
  if (seconds < 0) return '\u221E';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
  return `${Math.floor(seconds / 86400)}j ${Math.floor((seconds % 86400) / 3600)}h`;
}

export function formatEta(eta: number): string {
  if (eta < 0) return '\u221E';
  return formatDurationLong(eta);
}

export function formatDaysAgo(unixTs: number, lang: 'fr' | 'en' = 'fr'): string {
  const diff = Math.floor((Date.now() / 1000 - unixTs) / 86400);
  if (lang === 'fr') {
    if (diff === 0) return "aujourd'hui";
    if (diff === 1) return 'hier';
    return `il y a ${diff}j`;
  }
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return `${diff}d ago`;
}

export function statusCounts(torrents: EnrichedTorrent[]) {
  return {
    danger: torrents.filter((t) => t.status === 'danger').length,
    warn: torrents.filter((t) => t.status === 'warn').length,
    ok: torrents.filter((t) => t.status === 'ok').length,
    downloading: torrents.filter((t) => t.status === 'downloading').length,
    total: torrents.length,
  };
}
