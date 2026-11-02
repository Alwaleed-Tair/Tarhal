'use client';
import { useEffect, useRef, useState } from 'react';

type Card = { id: string; flightNumber: string; from: string; to: string; departureTime: string; lowestPrice: number; availableSeats: number };
type Msg = { role: 'user' | 'assistant'; content: string; flights?: Card[] };

const MAX_CHARS = 1000;
const HELLO: Msg = { role: 'assistant', content: 'مرحباً! أنا مساعد ترحال. اسألني عن الرحلات والوجهات.\nHi! Ask me about flights and destinations.' };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([HELLO]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, loading, open]);

  async function send() {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...msgs, { role: 'user' as const, content }];
    setMsgs(next); setText(''); setError(''); setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // History is sent with every request; the greeting is UI-only.
        body: JSON.stringify({ messages: next.slice(1).map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Request failed');
      setMsgs([...next, { role: 'assistant', content: data.reply, flights: data.flights }]);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh' });

  return (
    <div style={{ position: 'fixed', bottom: 20, insetInlineEnd: 20, zIndex: 1000, fontFamily: 'system-ui, sans-serif' }}>
      {open && (
        <div role="dialog" aria-label="Tarhal assistant" style={{ width: 'min(360px, calc(100vw - 40px))', height: 'min(520px, 70vh)', background: '#fff', color: '#111', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 12px 32px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ background: '#0f766e', color: '#fff', padding: '12px 16px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
            <span>ترحال • Assistant</span>
            <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: 'none', border: 0, color: '#fff', fontSize: 18, cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                <div dir="auto" style={{ background: m.role === 'user' ? '#0f766e' : '#f1f5f9', color: m.role === 'user' ? '#fff' : '#111', padding: '8px 12px', borderRadius: 12, whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.5 }}>{m.content}</div>
                {m.flights?.map((f) => (
                  <div key={f.id} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: 10, marginTop: 6, background: '#fff', fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{f.from} → {f.to} · {f.flightNumber}</div>
                    <div>{fmt(f.departureTime)}</div>
                    <div>From {f.lowestPrice} SAR · {f.availableSeats} {f.availableSeats === 1 ? 'seat' : 'seats'} left</div>
                  </div>
                ))}
              </div>
            ))}
            {loading && <div style={{ alignSelf: 'flex-start', color: '#64748b', fontSize: 14 }} aria-live="polite">Typing…</div>}
            {error && <div role="alert" style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #e2e8f0' }}>
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_CHARS} placeholder="اكتب سؤالك… / Ask anything…" dir="auto" disabled={loading}
              style={{ flex: 1, padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }} />
            <button type="submit" disabled={loading || !text.trim()} style={{ background: '#0f766e', color: '#fff', border: 0, borderRadius: 8, padding: '0 14px', cursor: 'pointer', opacity: loading || !text.trim() ? 0.5 : 1 }}>Send</button>
          </form>
        </div>
      )}
      <button onClick={() => setOpen(!open)} aria-label={open ? 'Close chat' : 'Open chat'} style={{ width: 56, height: 56, borderRadius: '50%', background: '#0f766e', color: '#fff', border: 0, fontSize: 24, cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,0,0,.25)', display: 'block', marginInlineStart: 'auto' }}>{open ? '×' : '💬'}</button>
    </div>
  );
}
