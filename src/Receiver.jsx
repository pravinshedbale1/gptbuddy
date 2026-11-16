import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { limitToLast, onValue, query, ref } from 'firebase/database';
import {
  ArrowUpRight,
  CornerDownLeft,
  Copy,
  MessageSquareText,
  Radio,
  Trash2,
  Wand2,
} from 'lucide-react';
import { db } from './firebase';
import { TARGETS, targetById } from './askTargets';
import { copyText, loadLS, makeId, saveLS, timeAgo } from './util';
import { usePresence } from './usePresence';
import { ConnectionAlert, Toast, Toggle, TopBar, formatTime } from './ui';

const PAUSES = [1000, 2000, 3000, 5000];

export default function Receiver({ room }) {
  const { connected, othersOnline } = usePresence(room, 'receiver');

  const [lines, setLines] = useState([]); // [{ id, text, ts, manual }]
  const [interim, setInterim] = useState('');
  const [usedIds, setUsedIds] = useState(() => new Set());
  const [questions, setQuestions] = useState(() => loadLS(`gb.q.${room}`, []));
  const [toast, setToast] = useState('');

  const [defaultTarget, setDefaultTarget] = useState(() => loadLS('gb.target', 'chatgpt'));
  const [autoGroup, setAutoGroup] = useState(() => loadLS('gb.auto', true));
  const [pauseMs, setPauseMs] = useState(() => loadLS('gb.pause', 2000));
  const [prefix, setPrefix] = useState(() => loadLS('gb.prefix', ''));

  // Lines already in the room when we joined count as history, not new questions.
  const historyIds = useRef(null);
  const scrollRef = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => saveLS('gb.target', defaultTarget), [defaultTarget]);
  useEffect(() => saveLS('gb.auto', autoGroup), [autoGroup]);
  useEffect(() => saveLS('gb.pause', pauseMs), [pauseMs]);
  useEffect(() => saveLS('gb.prefix', prefix), [prefix]);
  useEffect(() => saveLS(`gb.q.${room}`, questions.slice(0, 100)), [room, questions]);

  useEffect(() => {
    const offLines = onValue(query(ref(db, `rooms/${room}/lines`), limitToLast(300)), (snap) => {
      const next = [];
      snap.forEach((c) => {
        next.push({ id: c.key, ...c.val() });
      });
      if (historyIds.current === null) historyIds.current = new Set(next.map((l) => l.id));
      setLines(next);
    });
    const offLive = onValue(ref(db, `rooms/${room}/live`), (snap) => {
      setInterim(snap.val()?.text || '');
    });
    return () => {
      offLines();
      offLive();
    };
  }, [room]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, interim]);

  const pending = useMemo(
    () => lines.filter((l) => !usedIds.has(l.id) && !historyIds.current?.has(l.id)),
    [lines, usedIds],
  );

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);

  const makeQuestion = useCallback((srcLines) => {
    if (!srcLines.length) return;
    const text = srcLines.map((l) => l.text.trim()).join(' ');
    setUsedIds((s) => {
      const n = new Set(s);
      srcLines.forEach((l) => n.add(l.id));
      return n;
    });
    setQuestions((qs) => [{ id: makeId(), text, ts: Date.now(), sentTo: [] }, ...qs]);
  }, []);

  // Typed questions are complete as soon as they arrive.
  // Speech is grouped once the speaker has paused for `pauseMs`.
  useEffect(() => {
    if (!pending.length) return;
    if (pending.every((l) => l.manual)) {
      makeQuestion(pending);
      return;
    }
    if (!autoGroup || interim) return;
    const t = setTimeout(() => makeQuestion(pending), pauseMs);
    return () => clearTimeout(t);
  }, [pending, autoGroup, interim, pauseMs, makeQuestion]);

  const updateQuestion = (id, patch) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const sendTo = useCallback(
    async (q, targetId) => {
      const target = targetById(targetId);
      const full = prefix.trim() ? `${prefix.trim()}\n\n${q.text}` : q.text;
      const copied = await copyText(full);
      // A named window reuses the same tab for each AI instead of piling up new tabs.
      window.open(target.url(full), `gptbuddy-${target.id}`);
      setQuestions((qs) =>
        qs.map((x) =>
          x.id === q.id ? { ...x, sentTo: [...new Set([...(x.sentTo || []), target.id])] } : x,
        ),
      );
      if (!target.prefill) {
        showToast(
          copied
            ? `Copied. Paste it into ${target.label} with ⌘V / Ctrl+V.`
            : 'Copy failed. Select the text and copy it manually.',
        );
      } else {
        showToast(`Opened in ${target.label}`);
      }
    },
    [prefix, showToast],
  );

  // Press Enter anywhere (outside a text field) to send the newest question to the default AI.
  const latestRef = useRef(null);
  latestRef.current = questions[0];
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (e.key !== 'Enter' || ['TEXTAREA', 'INPUT', 'SELECT', 'BUTTON'].includes(tag)) return;
      if (latestRef.current) {
        e.preventDefault();
        sendTo(latestRef.current, defaultTarget);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sendTo, defaultTarget]);

  const recentLines = lines.slice(-60);
  const pendingIds = new Set(pending.map((l) => l.id));
  const def = targetById(defaultTarget);

  return (
    <div className="app">
      <TopBar room={room} role="receiver" connected={connected} othersOnline={othersOnline} />

      <main className="container rx-layout">
        <div className="rx-alerts">
          <ConnectionAlert connected={connected} />
        </div>

        {/* Settings */}
        <aside className="panel rx-settings">
          <div className="settings-group">
            <div className="settings-label">Default assistant</div>
            <div className="target-list" role="radiogroup">
              {TARGETS.map((t) => (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={t.id === defaultTarget}
                  className={`target-option ${t.id === defaultTarget ? 'is-selected' : ''}`}
                  onClick={() => setDefaultTarget(t.id)}
                >
                  <span className="target-dot" style={{ background: t.color }} />
                  <span className="target-name">{t.label}</span>
                  {!t.prefill && <span className="tag tag-muted">Paste</span>}
                  <span className="radio" />
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-label">Question detection</div>
            <Toggle
              checked={autoGroup}
              onChange={setAutoGroup}
              label="Create a question automatically"
              hint="When the speaker pauses"
            />
            <div className={`segmented ${autoGroup ? '' : 'is-disabled'}`}>
              {PAUSES.map((v) => (
                <button
                  key={v}
                  className={pauseMs === v ? 'is-active' : ''}
                  onClick={() => setPauseMs(v)}
                  disabled={!autoGroup}
                >
                  {v / 1000}s
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-label">Text added before each question</div>
            <textarea
              className="input"
              rows={3}
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. Answer concisely in 3 bullet points."
            />
          </div>

          <div className="shortcut-hint">
            <kbd>
              <CornerDownLeft size={12} />
            </kbd>
            <span className="text-muted text-xs">
              Press Enter to send the newest question to <b>{def.label}</b>
            </span>
          </div>
        </aside>

        {/* Live transcript */}
        <section className="panel transcript-panel rx-transcript">
          <div className="panel-header">
            <div>
              <h2>
                Live transcript
                {interim && <span className="badge badge-live badge-inline"><span className="dot dot-live dot-pulse" />Speaking</span>}
              </h2>
              <p className="text-muted text-xs">Click a line to turn it into a question</p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              disabled={!pending.length}
              onClick={() => makeQuestion(pending)}
            >
              <Wand2 size={14} /> Create question
              {pending.length > 0 && <span className="count">{pending.length}</span>}
            </button>
          </div>

          <div className="transcript-body" ref={scrollRef}>
            {recentLines.length === 0 && !interim ? (
              <div className="empty">
                <span className="empty-icon">
                  <Radio size={22} />
                </span>
                <h3>{othersOnline ? 'Waiting for speech' : 'Waiting for the transmitter'}</h3>
                <p className="text-muted text-sm">
                  {othersOnline
                    ? 'The transcript appears here as soon as someone speaks.'
                    : 'Open the transmitter with this room code, or use “Pair transmitter” above.'}
                </p>
              </div>
            ) : (
              <>
                {recentLines.map((l) => (
                  <button
                    key={l.id}
                    className={`t-line t-clickable ${pendingIds.has(l.id) ? 'is-pending' : ''}`}
                    onClick={() => makeQuestion([l])}
                  >
                    <span className="t-time mono">{formatTime(l.ts)}</span>
                    <span className="t-text">
                      {l.manual && <span className="tag">Typed</span>}
                      {l.text}
                    </span>
                  </button>
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
        </section>

        {/* Questions */}
        <section className="rx-questions">
          <div className="section-header">
            <h2>
              Questions <span className="count">{questions.length}</span>
            </h2>
            {questions.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setQuestions([])}>
                Clear all
              </button>
            )}
          </div>

          {questions.length === 0 ? (
            <div className="panel empty">
              <span className="empty-icon">
                <MessageSquareText size={22} />
              </span>
              <h3>No questions yet</h3>
              <p className="text-muted text-sm">
                When the speaker pauses, what they said becomes a question here, ready to send to
                {' '}{def.label}.
              </p>
            </div>
          ) : (
            questions.map((q, i) => (
              <article key={q.id} className={`panel question ${i === 0 ? 'is-latest' : ''}`}>
                <div className="question-head">
                  <span className="q-index">Q{questions.length - i}</span>
                  {i === 0 && <span className="tag tag-accent">Latest</span>}
                  <span className="text-muted text-xs">{timeAgo(q.ts)}</span>
                  <span className="spacer" />
                  {q.sentTo?.map((id) => (
                    <span key={id} className="sent-chip" title={`Sent to ${targetById(id).label}`}>
                      <span className="target-dot" style={{ background: targetById(id).color }} />
                      {targetById(id).label}
                    </span>
                  ))}
                </div>

                <textarea
                  className="question-text"
                  value={q.text}
                  rows={Math.min(6, Math.max(2, Math.ceil(q.text.length / 64)))}
                  onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                />

                <div className="question-actions">
                  <button className="btn btn-primary" onClick={() => sendTo(q, defaultTarget)}>
                    <span className="target-dot target-dot-light" style={{ background: def.color }} />
                    Ask {def.label}
                    <ArrowUpRight size={15} />
                  </button>
                  <div className="btn-group">
                    {TARGETS.filter((t) => t.id !== defaultTarget).map((t) => (
                      <button
                        key={t.id}
                        className="btn btn-secondary btn-sm"
                        onClick={() => sendTo(q, t.id)}
                        title={`Ask ${t.label}`}
                      >
                        <span className="target-dot" style={{ background: t.color }} />
                        <span className="hide-sm">{t.label}</span>
                      </button>
                    ))}
                  </div>
                  <span className="spacer" />
                  <button
                    className="btn btn-ghost btn-icon"
                    title="Copy"
                    aria-label="Copy question"
                    onClick={async () => showToast((await copyText(q.text)) ? 'Copied to clipboard' : 'Copy failed')}
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="btn btn-ghost btn-icon btn-danger-ghost"
                    title="Remove"
                    aria-label="Remove question"
                    onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </main>

      <Toast message={toast} />
    </div>
  );
}
