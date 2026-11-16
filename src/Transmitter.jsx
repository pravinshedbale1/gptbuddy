import { useCallback, useEffect, useRef, useState } from 'react';
import { push, ref, remove, serverTimestamp, set } from 'firebase/database';
import { Globe, Info, Mic, Send, Square, Trash2, Volume2 } from 'lucide-react';
import { db } from './firebase';
import { loadLS, saveLS } from './util';
import { usePresence } from './usePresence';
import { ConnectionAlert, TopBar, formatTime } from './ui';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const LANGS = [
  ['en-US', 'English (US)'],
  ['en-IN', 'English (India)'],
  ['en-GB', 'English (UK)'],
  ['hi-IN', 'Hindi'],
  ['mr-IN', 'Marathi'],
  ['es-ES', 'Spanish'],
  ['fr-FR', 'French'],
  ['de-DE', 'German'],
];

export default function Transmitter({ room }) {
  const { connected, othersOnline } = usePresence(room, 'transmitter');
  const [listening, setListening] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [lang, setLang] = useState(() => loadLS('gb.lang', 'en-US'));
  const [interim, setInterim] = useState('');
  const [lines, setLines] = useState([]);
  const [error, setError] = useState('');
  const [typed, setTyped] = useState('');

  const recRef = useRef(null);
  const wantListening = useRef(false);
  const live = useRef({ timer: null, latest: '' });
  const scrollRef = useRef(null);

  useEffect(() => saveLS('gb.lang', lang), [lang]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, interim]);

  // Interim text changes many times a second: throttle writes to ~6/sec.
  const sendLive = useCallback(
    (text) => {
      const s = live.current;
      s.latest = text;
      if (s.timer) return;
      s.timer = setTimeout(() => {
        s.timer = null;
        set(ref(db, `rooms/${room}/live`), { text: s.latest, ts: Date.now() }).catch(() => {});
      }, 150);
    },
    [room],
  );

  const sendLine = useCallback(
    (text, manual = false) => {
      const t = text.trim();
      if (!t) return;
      setLines((l) => [...l, { text: t, ts: Date.now(), manual }].slice(-200));
      push(ref(db, `rooms/${room}/lines`), { text: t, ts: serverTimestamp(), manual }).catch((e) =>
        setError(`Couldn't send to the room: ${e.message}`),
      );
    },
    [room],
  );

  const start = () => {
    if (!SpeechRecognition) return;
    setError('');
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) sendLine(r[0].transcript);
        else interimText += r[0].transcript;
      }
      setInterim(interimText);
      sendLive(interimText);
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantListening.current = false;
        setError('Microphone access is blocked. Allow the microphone from the address bar, then try again.');
      } else if (e.error === 'network') {
        setError('Speech recognition needs an internet connection.');
      } else {
        setError(`Speech recognition error: ${e.error}`);
      }
    };

    // Chrome ends recognition after silence or ~60s; restart while we still want it.
    rec.onend = () => {
      if (wantListening.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through to stopped state */
        }
      }
      wantListening.current = false;
      setListening(false);
      setInterim('');
      sendLive('');
    };

    recRef.current = rec;
    wantListening.current = true;
    try {
      rec.start();
      setListening(true);
      setStartedAt(Date.now());
    } catch (err) {
      wantListening.current = false;
      setError(err.message);
    }
  };

  const stop = () => {
    wantListening.current = false;
    recRef.current?.stop();
  };

  useEffect(
    () => () => {
      wantListening.current = false;
      recRef.current?.abort();
    },
    [],
  );

  const clearRoom = () => {
    remove(ref(db, `rooms/${room}/lines`)).catch(() => {});
    setLines([]);
  };

  const submitTyped = (e) => {
    e.preventDefault();
    sendLine(typed, true);
    setTyped('');
  };

  return (
    <div className="app">
      <TopBar room={room} role="transmitter" connected={connected} othersOnline={othersOnline} />

      <main className="container tx-layout">
        <div className="stack">
          <ConnectionAlert connected={connected} />
          {!SpeechRecognition && (
            <div className="alert alert-warning">
              <Info size={18} />
              <div>
                <strong>Speech recognition isn't available in this browser.</strong>
                <p>Use Google Chrome or Microsoft Edge, or Safari on iPhone. You can still type questions.</p>
              </div>
            </div>
          )}
          {error && (
            <div className="alert alert-danger">
              <Info size={18} />
              <div>{error}</div>
            </div>
          )}

          <section className="panel capture">
            <div className="capture-status">
              <span className={`badge ${listening ? 'badge-live' : 'badge-neutral'}`}>
                <span className={`dot ${listening ? 'dot-live dot-pulse' : ''}`} />
                {listening ? 'Live' : 'Idle'}
              </span>
              {listening && <Elapsed since={startedAt} />}
            </div>

            <button
              className={`mic-button ${listening ? 'is-live' : ''}`}
              onClick={listening ? stop : start}
              disabled={!SpeechRecognition}
              aria-label={listening ? 'Stop listening' : 'Start listening'}
            >
              {listening ? <Square size={30} fill="currentColor" /> : <Mic size={34} />}
            </button>
            <div className="capture-title">{listening ? 'Listening…' : 'Start listening'}</div>
            <p className="text-muted text-sm capture-sub">
              {listening
                ? 'Everything heard is sent to the receiver in real time.'
                : 'Uses this device\'s microphone. Put it near the person or speaker you want to capture.'}
            </p>

            <MicMeter active={listening} />

            <div className="capture-settings">
              <label className="select-field">
                <Globe size={15} />
                <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={listening}>
                  {LANGS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="panel stats">
            <Stat label="Lines sent" value={lines.length} />
            <Stat label="Receiver" value={othersOnline ? 'Online' : 'Waiting'} tone={othersOnline ? 'success' : ''} />
          </section>

          <details className="panel tips">
            <summary>
              <Volume2 size={16} /> Capturing audio from a call
            </summary>
            <ul>
              <li>
                <b>Call on another device:</b> play it on that device's speaker, near this device's mic.
                Louder, clearer audio gives better transcripts.
              </li>
              <li>
                <b>Zoom or Teams on this laptop:</b> speech recognition listens to the computer's default
                input. Route the call audio through BlackHole (macOS) or VB-Cable (Windows). The README
                has the steps.
              </li>
              <li>The microphone only works on HTTPS or on localhost.</li>
            </ul>
          </details>
        </div>

        <section className="panel transcript-panel">
          <div className="panel-header">
            <div>
              <h2>Transcript</h2>
              <p className="text-muted text-xs">Sent to the receiver as you speak</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={clearRoom} disabled={!lines.length}>
              <Trash2 size={14} /> Clear
            </button>
          </div>

          <div className="transcript-body" ref={scrollRef}>
            {lines.length === 0 && !interim ? (
              <div className="empty">
                <span className="empty-icon">
                  <Mic size={22} />
                </span>
                <h3>No transcript yet</h3>
                <p className="text-muted text-sm">
                  Press <b>Start listening</b>, or type a question below.
                </p>
              </div>
            ) : (
              <>
                {lines.map((l, i) => (
                  <div key={i} className="t-line">
                    <span className="t-time mono">{formatTime(l.ts)}</span>
                    <p className={l.manual ? 't-text t-manual' : 't-text'}>
                      {l.manual && <span className="tag">Typed</span>}
                      {l.text}
                    </p>
                  </div>
                ))}
                {interim && (
                  <div className="t-line">
                    <span className="t-time mono">now</span>
                    <p className="t-text t-interim">{interim}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <form className="composer" onSubmit={submitTyped}>
            <input
              className="input"
              placeholder="Type a question to send to the receiver…"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
            <button className="btn btn-primary" disabled={!typed.trim()}>
              <Send size={15} /> Send
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="stat">
      <div className="text-muted text-xs">{label}</div>
      <div className={`stat-value ${tone === 'success' ? 'text-success' : ''}`}>{value}</div>
    </div>
  );
}

function Elapsed({ since }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return <span className="mono text-muted text-sm">{mm}:{ss}</span>;
}

// Visual input level, so you can tell whether the mic actually hears the other device.
const BARS = 28;
function MicMeter({ active }) {
  const barsRef = useRef(null);

  useEffect(() => {
    if (!active || !navigator.mediaDevices?.getUserMedia) return;
    let stream;
    let ctx;
    let raf;
    let stopped = false;
    const history = new Array(BARS).fill(0);

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(s).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        let frame = 0;
        const tick = () => {
          raf = requestAnimationFrame(tick);
          if (frame++ % 3) return;
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const x = (buf[i] - 128) / 128;
            sum += x * x;
          }
          const level = Math.min(1, Math.sqrt(sum / buf.length) * 5);
          history.shift();
          history.push(level);
          const el = barsRef.current;
          if (!el) return;
          for (let i = 0; i < BARS; i++) {
            el.children[i].style.transform = `scaleY(${Math.max(0.08, history[i])})`;
          }
        };
        tick();
      })
      .catch(() => {});

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
      const el = barsRef.current;
      if (el) for (const c of el.children) c.style.transform = '';
    };
  }, [active]);

  return (
    <div className={`meter ${active ? 'is-live' : ''}`} ref={barsRef} aria-hidden>
      {Array.from({ length: BARS }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
