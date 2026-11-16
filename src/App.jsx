import { useState } from 'react';
import {
  ArrowRight,
  AudioLines,
  MessagesSquare,
  Mic,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { isConfigured } from './firebase';
import { makeRoomCode, normalizeRoom } from './util';
import { Logo } from './ui';
import Transmitter from './Transmitter';
import Receiver from './Receiver';

export default function App() {
  if (!isConfigured) return <SetupNeeded />;

  const params = new URLSearchParams(location.search);
  const room = normalizeRoom(params.get('room'));
  const role = params.get('role');

  if (room.length >= 8 && role === 'transmitter') return <Transmitter room={room} />;
  if (room.length >= 8 && role === 'receiver') return <Receiver room={room} />;
  return <Home initialRoom={room} />;
}

function Home({ initialRoom }) {
  const [room, setRoom] = useState(initialRoom || makeRoomCode());
  const code = normalizeRoom(room);
  const valid = code.length >= 8 && code.length <= 32;
  const go = (role) => {
    location.search = `?room=${code}&role=${role}`;
  };

  return (
    <div className="landing">
      <header className="topbar topbar-plain">
        <div className="topbar-inner">
          <Logo />
          <a className="btn btn-ghost btn-sm" href="#how">
            How it works
          </a>
        </div>
      </header>

      <main className="hero">
        <span className="eyebrow">
          <Sparkles size={14} /> Live voice to AI answers
        </span>
        <h1>
          Questions asked out loud,{' '}
          <span className="gradient-text">answered by AI in seconds.</span>
        </h1>
        <p className="lead">
          One device listens and transcribes. Another turns the conversation into clean questions
          and sends them to ChatGPT, Claude or Gemini, using your own logged-in accounts.
        </p>

        <div className="panel start-panel">
          <div className="field">
            <label htmlFor="room">Room code</label>
            <div className="input-group">
              <input
                id="room"
                className="input mono"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                spellCheck={false}
                autoCapitalize="characters"
              />
              <button
                className="btn btn-secondary btn-icon"
                onClick={() => setRoom(makeRoomCode())}
                title="Generate a new code"
                aria-label="Generate a new code"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <span className={`text-xs ${valid ? 'text-muted' : 'text-danger'}`}>
              {valid ? 'Use the same room code on both devices.' : 'Use 8–32 letters or digits.'}
            </span>
          </div>

          <div className="role-grid">
            <button className="role-card" disabled={!valid} onClick={() => go('transmitter')}>
              <span className="role-icon role-icon-tx">
                <Mic size={20} />
              </span>
              <span className="role-body">
                <span className="role-title">Transmitter</span>
                <span className="role-desc">Listens through the mic and transcribes live</span>
              </span>
              <ArrowRight size={18} className="role-arrow" />
            </button>
            <button className="role-card" disabled={!valid} onClick={() => go('receiver')}>
              <span className="role-icon role-icon-rx">
                <MessagesSquare size={20} />
              </span>
              <span className="role-body">
                <span className="role-title">Receiver</span>
                <span className="role-desc">Reviews questions and asks your AI of choice</span>
              </span>
              <ArrowRight size={18} className="role-arrow" />
            </button>
          </div>
        </div>
      </main>

      <section id="how" className="features">
        <Feature icon={<AudioLines size={20} />} title="Live transcription">
          Built-in browser speech recognition. No API keys and no per-minute cost.
        </Feature>
        <Feature icon={<Smartphone size={20} />} title="Any two devices">
          Pair a laptop and a phone with a QR code. Updates arrive in under a second.
        </Feature>
        <Feature icon={<ShieldCheck size={20} />} title="Your accounts">
          Questions open in your own ChatGPT, Claude or Gemini session. Nothing goes through a
          third-party AI API.
        </Feature>
      </section>

      <footer className="footer text-muted text-xs">GPT Buddy</footer>
    </div>
  );
}

function Feature({ icon, title, children }) {
  return (
    <div className="feature">
      <span className="feature-icon">{icon}</span>
      <h3>{title}</h3>
      <p className="text-muted">{children}</p>
    </div>
  );
}

function SetupNeeded() {
  return (
    <div className="landing">
      <main className="hero">
        <Logo />
        <div className="alert alert-warning" style={{ marginTop: 24 }}>
          <div>
            <strong>Firebase isn't configured.</strong>
            <p>
              Copy <code>.env.example</code> to <code>.env</code>, fill it from{' '}
              <code>firebase apps:sdkconfig web</code>, then restart the dev server.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
