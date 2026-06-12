import React, { useState } from 'react';
import * as I from './icons';

// ── Tracker helpers ───────────────────────────────────────────────────────

export const TRACKER_BG: Record<string, string> = {
  torr9:  'var(--tr-torr9)',
  c411:   'var(--tr-c411)',
  lacale: 'var(--tr-cale)',
};

export function trackerBg(id: string) {
  return TRACKER_BG[id] ?? 'var(--surface-hi)';
}

// ── TrackerDot ────────────────────────────────────────────────────────────

interface TDotProps { id: string; name?: string; size?: 'lg' | 'xl' | '' }

export const TDot: React.FC<TDotProps> = ({ id, name, size = '' }) => (
  <span className={`tdot ${size}`} style={{ background: trackerBg(id) }} title={name}>
    {(name || id || '').slice(0, 2).toUpperCase()}
  </span>
);

// ── Button ────────────────────────────────────────────────────────────────

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: 'primary' | 'danger' | 'ghost' | 'danger-ghost' | 'safe-ghost' | '';
  size?: 'sm' | 'lg' | '';
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Btn: React.FC<BtnProps> = ({
  kind = '', size = '', icon, iconRight, children, className = '', ...rest
}) => {
  const cls = ['btn', kind, size, !children && icon ? 'icon-only' : '', className]
    .filter(Boolean).join(' ');
  return (
    <button className={cls} {...rest}>
      {icon}{children}{iconRight}
    </button>
  );
};

export const IconBtn: React.FC<Omit<BtnProps, 'kind' | 'size'>> = (props) => (
  <Btn kind="ghost" size="sm" {...props} />
);

// ── Chip ──────────────────────────────────────────────────────────────────

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  kind?: 'danger' | 'warn' | 'safe' | 'solid' | '';
  size?: 'sm' | 'lg' | '';
  pulse?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  kind = '', size = '', pulse, children, className = '', ...rest
}) => (
  <span className={`chip ${kind} ${size} ${className}`} {...rest}>
    {pulse && <span className="pulse" />}
    {children}
  </span>
);

// ── Card ──────────────────────────────────────────────────────────────────

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  kind?: 'danger' | 'warn' | '';
}

export const Card: React.FC<CardProps> = ({ kind = '', className = '', children, ...rest }) => (
  <div className={`card ${kind} ${className}`} {...rest}>{children}</div>
);

// ── Stat ──────────────────────────────────────────────────────────────────

interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  kind?: 'danger' | 'warn' | 'safe' | '';
  big?: boolean;
  after?: React.ReactNode;
}

export const Stat: React.FC<StatProps> = ({ label, value, hint, kind = '', big, after }) => (
  <div className={`stat ${kind}`}>
    <div className="label">{label}</div>
    <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
      <span className={`value ${big ? 'lg' : ''}`}>{value}</span>
      {after}
    </div>
    {hint && <div className="hint">{hint}</div>}
  </div>
);

export const Delta: React.FC<{ dir?: 'up' | 'down'; children: React.ReactNode }> = ({
  dir = 'up', children,
}) => (
  <span className={`delta ${dir}`}>
    {dir === 'up' ? <I.ArrowU size={11} /> : <I.ArrowD size={11} />}
    {children}
  </span>
);

// ── Bar ───────────────────────────────────────────────────────────────────

interface BarProps {
  value: number;
  max?: number;
  kind?: 'danger' | 'warn' | 'safe' | '';
  tall?: boolean;
  tickAt?: number;
  style?: React.CSSProperties;
}

export const Bar: React.FC<BarProps> = ({ value, max = 100, kind = '', tall, tickAt, style }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`bar ${kind} ${tall ? 'tall' : ''}`} style={style}>
      <i style={{ width: pct + '%' }} />
      {tickAt != null && <span className="tick" style={{ left: tickAt + '%' }} />}
    </div>
  );
};

// ── Toggle / Check / Radio ────────────────────────────────────────────────

export const Toggle: React.FC<{ on?: boolean; onChange?: (v: boolean) => void }> = ({ on, onChange }) => (
  <span className={`toggle ${on ? 'on' : ''}`}
    onClick={() => onChange?.(!on)} role="switch" aria-checked={on} />
);

export const CheckBox: React.FC<{ on?: boolean; onChange?: (v: boolean) => void }> = ({ on, onChange }) => (
  <span className={`check ${on ? 'on' : ''}`}
    onClick={() => onChange?.(!on)} role="checkbox" aria-checked={on}>
    {on && <I.Check size={11} />}
  </span>
);

export const Radio: React.FC<{ on?: boolean; onChange?: (v: boolean) => void }> = ({ on, onChange }) => (
  <span className={`radio ${on ? 'on' : ''}`}
    onClick={() => onChange?.(true)} role="radio" aria-checked={on} />
);

// ── Sparkline ─────────────────────────────────────────────────────────────

interface SparkProps {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
  area?: boolean;
  kind?: 'danger' | 'warn' | 'safe' | '';
}

export const Spark: React.FC<SparkProps> = ({
  data, w = 120, h = 36, color = 'var(--accent)', area = true, kind,
}) => {
  if (!data?.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const pad = 2;
  const xs = data.map((_, i) => pad + (i * (w - pad * 2)) / (data.length - 1));
  const ys = data.map(d => h - pad - ((d - min) / (max - min || 1)) * (h - pad * 2));
  const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const last = { x: xs[xs.length - 1], y: ys[ys.length - 1] };
  const stroke = kind === 'danger' ? 'var(--danger)'
    : kind === 'warn' ? 'var(--warn)'
    : kind === 'safe' ? 'var(--safe)'
    : color;
  const gradId = `sg-${stroke.replace(/\W/g, '')}`;
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <polygon points={`${xs[0]},${h} ${pts} ${last.x},${h}`} fill={`url(#${gradId})`} />}
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="2" fill={stroke} />
    </svg>
  );
};

// ── MiniBars ──────────────────────────────────────────────────────────────

interface MiniBarsProps {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
}

export const MiniBars: React.FC<MiniBarsProps> = ({
  data, w = 120, h = 36, color = 'var(--accent)',
}) => {
  const max = Math.max(...data, 1);
  const bw = (w - data.length * 2) / data.length;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {data.map((d, i) => {
        const bh = (d / max) * h;
        return <rect key={i} x={i * (bw + 2)} y={h - bh} width={bw} height={bh} rx="1" fill={color} opacity="0.85" />;
      })}
    </svg>
  );
};

// ── Donut ─────────────────────────────────────────────────────────────────

interface DonutProps {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: string;
}

export const Donut: React.FC<DonutProps> = ({
  value, max = 1, size = 80, stroke = 8,
  color = 'var(--accent)', track = 'var(--surface-3)', label,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" />
      </svg>
      {label && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          fontFamily: 'var(--font-mono)', fontSize: size * 0.22, fontWeight: 600 }}>
          {label}
        </div>
      )}
    </div>
  );
};

// ── Tabs ──────────────────────────────────────────────────────────────────

interface TabItem { label: string; icon?: React.ReactNode; badge?: React.ReactNode }

interface TabsProps {
  items: (string | TabItem)[];
  active: number;
  onChange?: (i: number) => void;
}

export const Tabs: React.FC<TabsProps> = ({ items, active, onChange }) => (
  <div className="tabs">
    {items.map((it, i) => {
      const it2: TabItem = typeof it === 'string' ? { label: it } : it;
      return (
        <div key={i} className={`tab ${i === active ? 'active' : ''}`} onClick={() => onChange?.(i)}>
          {it2.icon}{it2.label}
          {it2.badge != null && <span className="badge">{it2.badge}</span>}
        </div>
      );
    })}
  </div>
);

// ── Page wrapper ──────────────────────────────────────────────────────────

export const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="page"><div className="page-narrow">{children}</div></div>
);

// ── Delete button with confirmation popover ──────────────────────────────

interface DeleteBtnProps {
  onDelete: (withFiles: boolean) => void;
  size?: 'sm' | '';
  style?: React.CSSProperties;
}

export const DeleteBtn: React.FC<DeleteBtnProps> = ({ onDelete, size = 'sm', style }) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', ...style }}>
      <Btn size={size} kind="ghost" icon={<I.Trash size={size === 'sm' ? 13 : 15} />}
        style={{ color: 'var(--danger)' }}
        onClick={e => { e.stopPropagation(); setOpen(!open); }} />
      {open && (
        <div className="delete-popover" onClick={e => e.stopPropagation()}>
          <button className="delete-opt" onClick={() => { onDelete(false); setOpen(false); }}>
            <I.Trash size={13} /> Torrent only
          </button>
          <button className="delete-opt danger" onClick={() => { onDelete(true); setOpen(false); }}>
            <I.Trash size={13} /> + Delete files
          </button>
        </div>
      )}
    </div>
  );
};

// ── Modal overlay ────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
}

// ── Sortable table header ─────────────────────────────────────────────────

export type SortDir = 'asc' | 'desc';

export function useSortable<K extends string>(initial: K, initialDir: SortDir = 'desc') {
  const [key, setKey] = useState<K>(initial);
  const [dir, setDir] = useState<SortDir>(initialDir);
  const cycle = (k: K) => {
    if (key === k) setDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setKey(k); setDir(initialDir); }
  };
  return { key, dir, cycle };
}

export const SortTh: React.FC<{
  sortKey: string; current: string; dir: SortDir;
  onClick: () => void;
  style?: React.CSSProperties; children: React.ReactNode;
}> = ({ sortKey, current, dir, onClick, style, children }) => (
  <th style={{ cursor: 'pointer', userSelect: 'none', color: current === sortKey ? 'var(--accent)' : undefined, ...style }}
    onClick={onClick}>
    {children}
    <span style={{ marginLeft: 4, opacity: current === sortKey ? 1 : 0, fontSize: 10, verticalAlign: 1, transition: 'opacity 0.12s' }}>
      {dir === 'asc' ? '▲' : '▼'}
    </span>
  </th>
);

// ── Modal overlay ────────────────────────────────────────────────────────

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, width = 520 }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content card" style={{ width }} onClick={e => e.stopPropagation()}>
        <div className="card-head">
          <h3 className="h3">{title}</h3>
          <div className="right">
            <Btn kind="ghost" size="sm" icon={<I.X size={14} />} onClick={onClose} />
          </div>
        </div>
        <div className="card-pad">{children}</div>
      </div>
    </div>
  );
};
