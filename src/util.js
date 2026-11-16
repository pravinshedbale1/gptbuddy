// Room codes are the only "key" to a room, so keep them long and unguessable.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function makeRoomCode(len = 10) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function normalizeRoom(code) {
  return (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function roleUrl(room, role) {
  return `${location.origin}${import.meta.env.BASE_URL}?room=${room}&role=${role}`;
}

export function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function loadLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  // Fallback for non-secure contexts (e.g. http://192.168.x.x in dev).
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}

export function timeAgo(ts) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}
