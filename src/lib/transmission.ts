// Transmission RPC client — direct connection (no proxy), same-origin served via TRANSMISSION_WEB_HOME
// Targets Transmission 4.0.x (RPC version 17)

// ── Types ─────────────────────────────────────────────────────────────────

export interface TorrentFile {
  bytesCompleted: number;
  length: number;
  name: string;
  beginPiece: number;
  endPiece: number;
}

export interface TorrentFileStats {
  bytesCompleted: number;
  wanted: boolean;
  priority: number; // -1 low, 0 normal, 1 high
}

export interface TrackerStats {
  announce: string;
  announceState: number;
  downloadCount: number;
  downloaderCount: number;
  hasAnnounced: boolean;
  hasScraped: boolean;
  host: string;
  id: number;
  isBackup: boolean;
  lastAnnouncePeerCount: number;
  lastAnnounceResult: string;
  lastAnnounceStartTime: number;
  lastAnnounceSucceeded: boolean;
  lastAnnounceTime: number;
  lastAnnounceTimedOut: boolean;
  lastScrapeResult: string;
  lastScrapeStartTime: number;
  lastScrapeSucceeded: boolean;
  lastScrapeTime: number;
  lastScrapeTimedOut: boolean;
  leecherCount: number;
  nextAnnounceTime: number;
  nextScrapeTime: number;
  scrape: string;
  scrapeState: number;
  seederCount: number;
  sitename: string;
  tier: number;
}

export interface Tracker {
  announce: string;
  id: number;
  scrape: string;
  sitename: string;
  tier: number;
}

export interface Peer {
  address: string;
  clientName: string;
  clientIsChoked: boolean;
  clientIsInterested: boolean;
  flagStr: string;
  isDownloadingFrom: boolean;
  isEncrypted: boolean;
  isIncoming: boolean;
  isUploadingTo: boolean;
  isUTP: boolean;
  peerIsChoked: boolean;
  peerIsInterested: boolean;
  port: number;
  progress: number;
  rateToClient: number;
  rateToPeer: number;
}

export interface Torrent {
  // Identity
  id: number;
  name: string;
  hashString: string;
  comment: string;
  creator: string;
  dateCreated: number;
  isPrivate: boolean;
  magnetLink: string;
  torrentFile: string;
  primaryMimeType: string;

  // Status
  status: TorrentStatus;
  error: number;
  errorString: string;
  isStalled: boolean;
  isFinished: boolean;

  // Progress
  percentDone: number;
  percentComplete: number;
  metadataPercentComplete: number;
  recheckProgress: number;
  leftUntilDone: number;
  sizeWhenDone: number;
  totalSize: number;
  downloadedEver: number;
  uploadedEver: number;
  corruptEver: number;
  haveUnchecked: number;
  haveValid: number;
  desiredAvailable: number;

  // Pieces
  pieceCount: number;
  pieceSize: number;
  pieces: string; // base64 bitfield

  // Speed
  rateDownload: number;
  rateUpload: number;
  eta: number;
  etaIdle: number;

  // Seeding
  uploadRatio: number;
  secondsSeeding: number;
  secondsDownloading: number;
  seedRatioLimit: number;
  seedRatioMode: number;
  seedIdleLimit: number;
  seedIdleMode: number;

  // Peers
  peersConnected: number;
  peersGettingFromUs: number;
  peersSendingToUs: number;
  peers: Peer[];
  maxConnectedPeers: number;

  // Files
  files: TorrentFile[];
  fileStats: TorrentFileStats[];
  fileCount: number;
  wanted: number[];
  priorities: number[];

  // Trackers
  trackerStats: TrackerStats[];
  trackers: Tracker[];
  trackerList: string;

  // Settings
  downloadDir: string;
  addedDate: number;
  startDate: number;
  activityDate: number;
  editDate: number;
  doneDate: number;
  queuePosition: number;
  bandwidthPriority: number;
  downloadLimit: number;
  downloadLimited: boolean;
  uploadLimit: number;
  uploadLimited: boolean;
  honorsSessionLimits: boolean;
  labels: string[];
  group: string;
  peerLimit: number;
}

export const TorrentStatus = {
  Stopped:      0,
  CheckWait:    1,
  Check:        2,
  DownloadWait: 3,
  Download:     4,
  SeedWait:     5,
  Seed:         6,
} as const;
export type TorrentStatus = typeof TorrentStatus[keyof typeof TorrentStatus];

// Fields for list view (lightweight polling)
export const LIST_FIELDS: (keyof Torrent)[] = [
  'id', 'name', 'status', 'addedDate', 'totalSize', 'percentDone',
  'uploadRatio', 'uploadedEver', 'downloadedEver', 'downloadDir',
  'secondsSeeding', 'peersConnected', 'peersGettingFromUs', 'peersSendingToUs',
  'files', 'trackerStats', 'trackers',
  'rateDownload', 'rateUpload', 'eta',
  'leftUntilDone', 'sizeWhenDone',
  'queuePosition', 'bandwidthPriority',
  'labels', 'error', 'errorString', 'isStalled', 'isFinished',
  'metadataPercentComplete', 'group',
];

// Fields for detail view (single torrent, full data)
export const DETAIL_FIELDS: (keyof Torrent)[] = [
  ...LIST_FIELDS,
  'hashString', 'comment', 'creator', 'dateCreated', 'isPrivate', 'magnetLink',
  'torrentFile', 'primaryMimeType',
  'recheckProgress', 'activityDate', 'doneDate', 'startDate', 'editDate',
  'downloadLimit', 'downloadLimited', 'uploadLimit', 'uploadLimited',
  'honorsSessionLimits', 'seedRatioLimit', 'seedRatioMode',
  'seedIdleLimit', 'seedIdleMode',
  'peers', 'fileStats', 'fileCount', 'wanted', 'priorities',
  'trackerList',
  'pieceCount', 'pieceSize',
  'percentComplete', 'corruptEver', 'haveUnchecked', 'haveValid',
  'desiredAvailable', 'etaIdle',
  'secondsDownloading', 'maxConnectedPeers', 'peerLimit', 'group',
];

// ── Session types ─────────────────────────────────────────────────────────

export interface TransferStats {
  uploadedBytes: number;
  downloadedBytes: number;
  filesAdded: number;
  secondsActive: number;
  sessionCount: number;
}

export interface SessionStats {
  activeTorrentCount: number;
  downloadSpeed: number;
  pausedTorrentCount: number;
  torrentCount: number;
  uploadSpeed: number;
  'cumulative-stats': TransferStats;
  'current-stats': TransferStats;
}

export interface Session {
  // Directories
  'download-dir': string;
  'incomplete-dir': string;
  'incomplete-dir-enabled': boolean;
  'config-dir': string;

  // Speed limits
  'speed-limit-down': number;
  'speed-limit-down-enabled': boolean;
  'speed-limit-up': number;
  'speed-limit-up-enabled': boolean;

  // Alt-speed (turtle mode)
  'alt-speed-down': number;
  'alt-speed-up': number;
  'alt-speed-enabled': boolean;
  'alt-speed-time-enabled': boolean;
  'alt-speed-time-begin': number;
  'alt-speed-time-end': number;
  'alt-speed-time-day': number;

  // Peers
  'peer-limit-global': number;
  'peer-limit-per-torrent': number;
  'encryption': string;

  // Protocol
  'dht-enabled': boolean;
  'pex-enabled': boolean;
  'lpd-enabled': boolean;
  'utp-enabled': boolean;

  // Network
  'peer-port': number;
  'peer-port-random-on-start': boolean;
  'port-forwarding-enabled': boolean;

  // Queue
  'download-queue-enabled': boolean;
  'download-queue-size': number;
  'seed-queue-enabled': boolean;
  'seed-queue-size': number;
  'queue-stalled-enabled': boolean;
  'queue-stalled-minutes': number;

  // Seeding defaults
  'seedRatioLimit': number;
  'seedRatioLimited': boolean;
  'idle-seeding-limit': number;
  'idle-seeding-limit-enabled': boolean;

  // Blocklist
  'blocklist-enabled': boolean;
  'blocklist-url': string;
  'blocklist-size': number;

  // Behavior
  'start-added-torrents': boolean;
  'rename-partial-files': boolean;
  'trash-original-torrent-files': boolean;
  'default-trackers': string;

  // Scripts
  'script-torrent-added-enabled': boolean;
  'script-torrent-added-filename': string;
  'script-torrent-done-enabled': boolean;
  'script-torrent-done-filename': string;
  'script-torrent-done-seeding-enabled': boolean;
  'script-torrent-done-seeding-filename': string;

  // Info (read-only)
  version: string;
  'rpc-version': number;
  'rpc-version-minimum': number;
  'download-dir-free-space': number;
  'cache-size-mb': number;

  // Units (read-only)
  units: {
    'speed-units': string[];
    'speed-bytes': number;
    'size-units': string[];
    'size-bytes': number;
    'memory-units': string[];
    'memory-bytes': number;
  };
}

// ── RPC Client ────────────────────────────────────────────────────────────

let sid = '';

export async function rpc<T = Record<string, unknown>>(
  method: string,
  args?: Record<string, unknown>,
  retry = true,
): Promise<T> {
  const res = await fetch('/transmission/rpc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Transmission-Session-Id': sid,
    },
    body: JSON.stringify({ method, arguments: args ?? {} }),
  });

  if (res.status === 409) {
    sid = res.headers.get('X-Transmission-Session-Id') ?? '';
    if (retry) return rpc(method, args, false);
    throw new Error('Transmission SID handshake failed');
  }

  if (!res.ok) throw new Error(`Transmission HTTP ${res.status}`);

  const data = await res.json();
  if (data.result !== 'success') throw new Error(`RPC: ${data.result}`);
  return data.arguments as T;
}

// ── Convenience functions ─────────────────────────────────────────────────

export async function getTorrents(fields: (keyof Torrent)[] = LIST_FIELDS): Promise<Torrent[]> {
  const data = await rpc<{ torrents: Torrent[] }>('torrent-get', { fields });
  return data.torrents;
}

export async function getTorrent(id: number): Promise<Torrent | undefined> {
  const data = await rpc<{ torrents: Torrent[] }>('torrent-get', {
    ids: [id],
    fields: DETAIL_FIELDS,
  });
  return data.torrents[0];
}

export async function getSessionStats(): Promise<SessionStats> {
  return rpc<SessionStats>('session-stats');
}

export async function getSession(): Promise<Session> {
  return rpc<Session>('session-get');
}

export async function getFreeSpace(path: string): Promise<{ path: string; 'size-bytes': number }> {
  return rpc('free-space', { path });
}

export interface TorrentAddArgs {
  filename?: string;
  metainfo?: string;
  'download-dir'?: string;
  paused?: boolean;
  bandwidthPriority?: number;
  labels?: string[];
  cookies?: string;
  'peer-limit'?: number;
  'files-wanted'?: number[];
  'files-unwanted'?: number[];
  'priority-high'?: number[];
  'priority-normal'?: number[];
  'priority-low'?: number[];
}

export async function torrentAdd(args: TorrentAddArgs) {
  return rpc('torrent-add', args as Record<string, unknown>);
}

export async function torrentAction(
  method: 'torrent-start' | 'torrent-start-now' | 'torrent-stop' | 'torrent-remove' |
          'torrent-verify' | 'torrent-reannounce',
  ids: number[],
  extra?: Record<string, unknown>,
) {
  return rpc(method, { ids, ...extra });
}

export async function torrentSet(ids: number[], args: Record<string, unknown>) {
  return rpc('torrent-set', { ids, ...args });
}

export async function torrentSetLocation(ids: number[], location: string, move: boolean) {
  return rpc('torrent-set-location', { ids, location, move });
}

export async function torrentRenamePath(id: number, path: string, name: string) {
  return rpc('torrent-rename-path', { ids: [id], path, name });
}

export async function sessionSet(args: Record<string, unknown>) {
  return rpc('session-set', args);
}

export async function queueMove(
  action: 'queue-move-top' | 'queue-move-up' | 'queue-move-down' | 'queue-move-bottom',
  ids: number[],
) {
  return rpc(action, { ids });
}

export async function groupGet(group?: string) {
  return rpc('group-get', group ? { group } : undefined);
}

export async function groupSet(args: {
  name: string;
  'speed-limit-down-enabled'?: boolean;
  'speed-limit-down'?: number;
  'speed-limit-up-enabled'?: boolean;
  'speed-limit-up'?: number;
  'honors-session-limits'?: boolean;
}) {
  return rpc('group-set', args as Record<string, unknown>);
}
