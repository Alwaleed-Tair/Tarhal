'use client';
import { useEffect, useRef, useState } from 'react';
import './ChatWidget.css';
import { formatReply } from './formatReply.ts';

type Card = { id: string; flightNumber: string; airline?: string; from: string; to: string; departureTime: string; lowestPrice: number; availableSeats: number };
type Hotel = { id: string; name: string; city: string; pricePerNight: number; rating: number; roomType: string };
type Car = { id: string; make: string; model: string; year: number; seats: number; category: string; city: string; pricePerDay: number };
type Msg = { role: 'user' | 'assistant'; content: string; flights?: Card[]; hotels?: Hotel[]; cars?: Car[] };

const MAX_CHARS = 1000;
const QUICK = ['ابي رحلة من الرياض إلى جدة', 'فنادق في الدمام', 'سيارات في الرياض', 'ميزانية رحلة تركيا', 'الفيزا لليابان'];
const HELLO: Msg = { role: 'assistant', content: 'مرحباً! أنا مساعد ترحال. اسألني عن الرحلات والوجهات.\nHi! Ask me about flights and destinations.' };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([HELLO]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, loading, open]);

  async function send(override?: string) {
    const content = (override ?? text).trim();
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
      setMsgs([...next, { role: 'assistant', content: data.reply, flights: data.flights, hotels: data.hotels, cars: data.cars }]);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh' });

  return (
    <div className="tarhal-chat">
      {open && (
        <section className="tc-panel" role="dialog" aria-label="Tarhal assistant">
          <header className="tc-header">
            <img className="tc-panel-logo" src="/tarhal-camel.png" alt="" />
            <div className="tc-heading"><strong>مساعد ترحال · Tarhal Assistant</strong><span>رحلات، فنادق، سيارات ونصائح سفر</span></div>
            <button className="tc-close" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </header>
          <div className="tc-messages" role="log" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`tc-msg ${m.role}`}>
                <div className="tc-bubble">{formatReply(m.content).map((b, j) => b.type === 'gap' ? <div key={j} className="tc-gap" /> : (
                  <div key={j} dir="auto" className={b.type === 'li' ? 'tc-li' : b.type === 'h' ? 'tc-h' : undefined}>
                    {b.parts.map((p, k) => p.bold ? <strong key={k}>{p.text}</strong> : <span key={k}>{p.text}</span>)}
                  </div>))}</div>
                {m.flights?.map((f) => (
                  <div key={f.id} className="tc-card" dir="ltr">
                    <strong>{f.from} → {f.to} · {f.airline ? `${f.airline} ` : ''}{f.flightNumber}</strong>
                    <div>{fmt(f.departureTime)}</div>
                    <div className="tc-price">From {f.lowestPrice} SAR · {f.availableSeats} {f.availableSeats === 1 ? 'seat' : 'seats'} left</div>
                  </div>
                ))}
                {m.hotels?.map((h) => (
                  <div key={h.id} className="tc-card" dir="ltr">
                    <strong>{h.name} · {h.city}</strong>
                    <div>★ {h.rating} · {h.roomType}</div>
                    <div className="tc-price">{h.pricePerNight} SAR / night</div>
                  </div>
                ))}
                {m.cars?.map((c) => (
                  <div key={c.id} className="tc-card" dir="ltr">
                    <strong>{c.make} {c.model} {c.year} · {c.city}</strong>
                    <div>{c.category} · {c.seats} seats</div>
                    <div className="tc-price">{c.pricePerDay} SAR / day</div>
                  </div>
                ))}
              </div>
            ))}
            {loading && <div className="tc-status" aria-live="polite">Typing…</div>}
            {error && <div role="alert" className="tc-error">{error}</div>}
            <div ref={end} />
          </div>
          {msgs.length === 1 && !loading && (
            <div className="tc-quick">{QUICK.map((q) => <button key={q} type="button" onClick={() => send(q)}>{q}</button>)}</div>
          )}
          <form className="tc-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input className="tc-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_CHARS} placeholder="اكتب سؤالك… / Ask anything…" dir="auto" disabled={loading} aria-label="Message" />
            <button className="tc-send" type="submit" disabled={loading || !text.trim()} aria-label="Send">➤</button>
          </form>
        </section>
      )}
      <button className="tc-launcher" onClick={() => setOpen(!open)} aria-label={open ? 'Close chat' : 'Open chat'} aria-expanded={open}>
        <img className="tc-logo" src="/tarhal-camel.png" alt="" /><span>المساعد</span>
      </button>
    </div>
  );
}
