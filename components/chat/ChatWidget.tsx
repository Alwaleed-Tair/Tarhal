'use client';
import { useRef, useEffect, useState } from 'react';

type Flight = { id: string; flightNumber: string; from: string; to: string; departureTime: string; priceSar: number; availableSeats: number };
type Msg = { role: 'user' | 'assistant'; content: string; flights?: Flight[] };
const MAX = 1000;

// Colors/font come from --tc-* variables (Omar's theme); fallbacks keep it usable until they exist.
const css = `
.tc-chat{position:fixed;bottom:20px;inset-inline-end:20px;z-index:1000;font-family:var(--tc-font,system-ui,sans-serif)}
.tc-chat-fab{width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;background:var(--tc-primary,#0b6b3a);color:var(--tc-on-primary,#fff);font-size:24px;box-shadow:0 4px 14px rgba(0,0,0,.25)}
.tc-chat-panel{position:absolute;bottom:68px;inset-inline-end:0;width:min(360px,calc(100vw - 32px));height:min(520px,70vh);display:flex;flex-direction:column;background:var(--tc-surface,#fff);color:var(--tc-text,#1a1a1a);border:1px solid var(--tc-border,#ddd);border-radius:var(--tc-radius,12px);overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.2)}
.tc-chat-head{padding:12px 14px;background:var(--tc-primary,#0b6b3a);color:var(--tc-on-primary,#fff);font-weight:600}
.tc-chat-body{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
.tc-msg{max-width:85%;padding:8px 12px;border-radius:12px;white-space:pre-wrap;line-height:1.5}
.tc-msg.user{align-self:flex-end;background:var(--tc-primary,#0b6b3a);color:var(--tc-on-primary,#fff)}
.tc-msg.assistant{align-self:flex-start;background:var(--tc-bg-muted,#f0f2f1)}
.tc-card{align-self:stretch;border:1px solid var(--tc-border,#ddd);border-radius:10px;padding:8px 10px;font-size:14px}
.tc-card b{color:var(--tc-primary,#0b6b3a)}
.tc-err{color:var(--tc-danger,#b00020);font-size:13px}
.tc-chat-form{display:flex;gap:6px;padding:8px;border-top:1px solid var(--tc-border,#ddd)}
.tc-chat-form input{flex:1;padding:8px;border:1px solid var(--tc-border,#ccc);border-radius:8px;font:inherit}
.tc-chat-form button{padding:8px 14px;border:0;border-radius:8px;background:var(--tc-primary,#0b6b3a);color:var(--tc-on-primary,#fff);cursor:pointer}
.tc-chat-form button:disabled{opacity:.5;cursor:default}
`;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView?.({ behavior: 'smooth' }); }, [msgs, loading, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...msgs, { role: 'user', content }];
    setMsgs(next); setText(''); setError(''); setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setMsgs([...next, { role: 'assistant', content: data.reply || '…', flights: data.flights }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(false); }
  }

  return (
    <div className="tc-chat">
      <style>{css}</style>
      {open && (
        <div className="tc-chat-panel" role="dialog" aria-label="Tarhal assistant">
          <div className="tc-chat-head">مساعد ترحال · Tarhal Assistant</div>
          <div className="tc-chat-body">
            {msgs.length === 0 && <div className="tc-msg assistant">مرحباً! اسألني عن السفر أو ابحث عن رحلة (مثال: الرياض إلى جدة 2026-12-01).</div>}
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <div className={`tc-msg ${m.role}`}>{m.content}</div>
                {m.flights?.map((f) => (
                  <div className="tc-card" key={f.id}>
                    <b>{f.flightNumber}</b> · {f.from} → {f.to}<br />
                    {new Date(f.departureTime).toLocaleString('en-GB', { timeZone: 'Asia/Riyadh' })}<br />
                    {f.priceSar} SAR · {f.availableSeats} seats
                  </div>
                ))}
              </div>
            ))}
            {loading && <div className="tc-msg assistant" aria-live="polite">…</div>}
            {error && <div className="tc-err" role="alert">{error}</div>}
            <div ref={end} />
          </div>
          <form className="tc-chat-form" onSubmit={send}>
            <input value={text} maxLength={MAX} onChange={(e) => setText(e.target.value)} placeholder="اكتب سؤالك…" aria-label="Message" />
            <button disabled={loading || !text.trim()}>إرسال</button>
          </form>
        </div>
      )}
      <button className="tc-chat-fab" onClick={() => setOpen(!open)} aria-label={open ? 'Close chat' : 'Open chat'}>{open ? '×' : '💬'}</button>
    </div>
  );
}
