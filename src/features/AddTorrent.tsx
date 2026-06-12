import React, { useState, useRef, useCallback } from 'react';
import { Modal, Btn } from '../components/ui';
import * as I from '../components/icons';
import { useTorrentAdd, useFreeSpace, formatBytes } from '../hooks/useTorrents';
import { useUIStore } from '../store/useStore';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultDir?: string;
}

export const AddTorrent: React.FC<Props> = ({ open, onClose, defaultDir }) => {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dir, setDir] = useState(defaultDir ?? '');
  const [paused, setPaused] = useState(false);
  const [labels, setLabels] = useState('');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { t } = useUIStore();

  const addMutation = useTorrentAdd();
  const { data: freeSpaceData } = useFreeSpace(dir || defaultDir);

  // Reset form when opening
  React.useEffect(() => {
    if (open) {
      setUrl('');
      setFile(null);
      setDir(defaultDir ?? '');
      setPaused(false);
      setLabels('');
      setError('');
    }
  }, [open, defaultDir]);

  const MAX_TORRENT_SIZE = 10 * 1024 * 1024; // 10 MB

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.torrent')) {
      if (f.size > MAX_TORRENT_SIZE) { setError(t('add.error_file_too_large')); return; }
      setFile(f);
      setUrl('');
      setError('');
    }
  }, [t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > MAX_TORRENT_SIZE) { setError(t('add.error_file_too_large')); return; }
      setFile(f);
      setUrl('');
      setError('');
    }
  };

  const handleSubmit = async () => {
    setError('');

    const args: Record<string, unknown> = {};

    if (dir) args['download-dir'] = dir;
    if (paused) args.paused = true;
    if (labels.trim()) args.labels = labels.split(',').map(l => l.trim()).filter(Boolean);

    if (file) {
      // Read file as base64
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      args.metainfo = btoa(binary);
    } else if (url.trim()) {
      const trimmed = url.trim();
      if (!/^(magnet:\?|https?:\/\/)/i.test(trimmed)) {
        setError(t('add.error_invalid_url'));
        return;
      }
      args.filename = trimmed;
    } else {
      setError(t('add.error_empty'));
      return;
    }

    try {
      await addMutation.mutateAsync(args);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('misc.unknown_error'));
    }
  };

  const freeBytes = freeSpaceData?.['size-bytes'];

  return (
    <Modal open={open} onClose={onClose} title={t('add.title')} width={560}>
      <div className="col" style={{ gap: 16 }}>
        {/* URL / Magnet input */}
        <div>
          <label className="field-label">{t('add.magnet_label')}</label>
          <input
            className="input mono"
            placeholder={t('add.magnet_placeholder')}
            value={url}
            onChange={e => { setUrl(e.target.value); setFile(null); }}
            disabled={!!file}
          />
        </div>

        {/* Or separator */}
        <div style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>{t('add.or')}</div>

        {/* File drop zone */}
        <div
          className={`dropzone ${dragging ? 'active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".torrent" hidden onChange={handleFileChange} />
          {file ? (
            <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
              <I.File size={16} />
              <span className="mono" style={{ color: 'var(--text)' }}>{file.name}</span>
              <Btn size="sm" kind="ghost" icon={<I.X size={12} />} onClick={(e) => { e.stopPropagation(); setFile(null); }} />
            </div>
          ) : (
            <div className="col" style={{ gap: 4, alignItems: 'center' }}>
              <I.Upload size={24} />
              <span>{t('add.drop_title')}</span>
              <span style={{ fontSize: 11 }}>{t('add.drop_sub')}</span>
            </div>
          )}
        </div>

        {/* Download dir */}
        <div>
          <label className="field-label">{t('add.dir_label')}</label>
          <input className="input mono" value={dir} onChange={e => setDir(e.target.value)} />
          {freeBytes != null && (
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-soft)' }}>
              <I.HardDrive size={11} style={{ verticalAlign: -2 }} /> {formatBytes(freeBytes)} {t('add.free')}
            </div>
          )}
        </div>

        {/* Options row */}
        <div className="row" style={{ gap: 16 }}>
          <label className="row" style={{ gap: 6, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={paused} onChange={e => setPaused(e.target.checked)} />
            {t('add.start_paused')}
          </label>
        </div>

        {/* Labels */}
        <div>
          <label className="field-label">{t('add.labels_label')}</label>
          <input className="input" placeholder="films, 4k, ..." value={labels} onChange={e => setLabels(e.target.value)} />
        </div>

        {/* Error */}
        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 13 }}>
            <I.Alert size={13} style={{ verticalAlign: -2 }} /> {error}
          </div>
        )}

        {/* Actions */}
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Btn kind="ghost" onClick={onClose}>{t('action.cancel')}</Btn>
          <Btn kind="primary" icon={<I.Plus size={14} />} onClick={handleSubmit}
            disabled={addMutation.isPending}>
            {addMutation.isPending ? t('action.adding') : t('action.add')}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};
