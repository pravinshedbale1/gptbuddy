import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, Check, Copy, Link2, QrCode, X } from 'lucide-react';
import { copyText, roleUrl } from './util';

export function Logo({ href = import.meta.env.BASE_URL }) {
  return (
    <a href={href} className="logo">
      <span className="logo-mark" aria-hidden>
        <svg viewBox="0 0 32 32" width="18" height="18">
          <path
            d="M16 8v16M11 12v8M21 12v8M6 15v2M26 15v2"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="logo-text">GPT Buddy</span>
    </a>
  );
}

export function StatusBadge({ ok, okText, badText, pulse }) {
  return (
    <span className={`badge ${ok ? 'badge-success' : 'badge-neutral'}`}>
      <span className={`dot ${ok ? 'dot-success' : ''} ${ok && pulse ? 'dot-pulse' : ''}`} />
      {ok ? okText : badText}
    </span>
  );
}

export function CopyButton({ text, label = 'Copy', className = 'btn btn-secondary btn-sm' }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className={className}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
      {label && <span>{done ? 'Copied' : label}</span>}
    </button>
  );
}

export function TopBar({ room, role, connected, othersOnline }) {
  const [shareOpen, setShareOpen] = useState(false);
  const other = role === 'transmitter' ? 'receiver' : 'transmitter';
  const otherLabel = other === 'receiver' ? 'Receiver' : 'Transmitter';

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Logo />
            <span className="divider-v" />
            <span className="role-tag">{role === 'transmitter' ? 'Transmitter' : 'Receiver'}</span>
          </div>
          <div className="topbar-right">
            <div className="room-chip" title="Room code">
              <span className="room-chip-label">Room</span>
              <span className="mono">{room}</span>
            </div>
            <StatusBadge ok={connected} okText="Connected" badText="Offline" />
            <StatusBadge
              ok={othersOnline > 0}
              okText={`${otherLabel} online`}
              badText={`${otherLabel} offline`}
              pulse
            />
            <button className="btn btn-primary btn-sm" onClick={() => setShareOpen(true)}>
              <QrCode size={15} />
              <span className="hide-sm">Pair {otherLabel.toLowerCase()}</span>
            </button>
          </div>
        </div>
      </header>
      {shareOpen && (
        <PairDialog room={room} other={other} onClose={() => setShareOpen(false)} />
      )}
    </>
  );
}

function PairDialog({ room, other, onClose }) {
  const link = roleUrl(room, other);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Pair a {other}</h3>
            <p className="text-muted">Scan this code with the other device, or open the link there.</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="qr-frame">
          <QRCodeSVG value={link} size={196} marginSize={1} />
        </div>
        <div className="link-field">
          <Link2 size={15} className="text-muted" />
          <span className="mono truncate">{link}</span>
          <CopyButton text={link} label="Copy" />
        </div>
        <p className="text-muted text-xs">
          Room <span className="mono">{room}</span>. Anyone with this code can join the room.
        </p>
      </div>
    </div>
  );
}

// Shown when the realtime connection hasn't come up after a few seconds.
export function ConnectionAlert({ connected }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (connected) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, [connected]);

  if (!show) return null;
  return (
    <div className="alert alert-warning">
      <AlertTriangle size={18} />
      <div>
        <strong>Can't reach the realtime database.</strong>
        <p>
          Check your internet connection. If you just set up Firebase, make sure the Realtime
          Database has been created in the Firebase console.
        </p>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="toggle-row">
      <div>
        <div className="toggle-label">{label}</div>
        {hint && <div className="text-muted text-xs">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`switch ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </label>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      <Check size={16} />
      {message}
    </div>
  );
}

export function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
