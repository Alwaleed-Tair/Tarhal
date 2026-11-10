import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send, X } from 'lucide-react';
import { Money } from '@/components/money';
import { useT } from '@/components/layout';
import { brand } from '@/config/branding';
import { formatReply } from '@/lib/format-reply';
import { useFormat } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { api } from '@/services/api';

// Real assistant: POST /api/ai/chat (docs/api-documentation.md, section 6). The conversation is sent every time
// (the API uses the last 24 messages, each up to 1000 characters). Flights, hotels and cars it found come back as cards.
// Their prices are SAR, like everywhere in the API, and <Money sar> shows them in the currency the visitor picked.
type FlightCard = { id: string; flightNumber: string; airline?: string; from: string; to: string; departureTime: string; lowestPrice: number; availableSeats: number };
type HotelCard = { id: string; name: string; city: string; pricePerNight: number; rating: number; roomType: string };
type CarCard = { id: string; make: string; model: string; year: number; seats: number; city: string; pricePerDay: number };

type ChatMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  flights?: FlightCard[];
  hotels?: HotelCard[];
  cars?: CarCard[];
};

const MAX_CHARS = 1000;
const quickTopics: TranslationKey[] = ['chatQuick1', 'chatQuick2', 'chatQuick3', 'chatQuick4', 'chatQuick5'];

let nextMessageId = 0;

export default function ChatAssistant() {
  const t = useT();
  const format = useFormat();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // "From {price}" with the price drawn by <Money>, in the order of the page language.
  const [fromBefore, fromAfter = ''] = t('fromPrice', { price: '\u0000' }).replace(/[\u2068\u2069]/g, '').split('\u0000');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next = [...messages, { id: ++nextMessageId, role: 'user' as const, text: trimmed }];
    setMessages(next);
    setDraft('');
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/ai/chat', { messages: next.map(({ role, text: content }) => ({ role, content })) }, { timeout: 60_000 });
      if (!data?.success) throw new Error(data?.error || 'Request failed');
      setMessages([...next, { id: ++nextMessageId, role: 'assistant', text: String(data.reply ?? ''), flights: data.flights, hotels: data.hotels, cars: data.cars }]);
    } catch (err) {
      const apiError = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(apiError || t('errorMessage'));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  return (
    <>
      <button
        className="chat-launcher"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={t('chatbot')}
        aria-expanded={open}
        aria-controls="tarhal-chat-panel"
      >
        <img className="chat-launcher-logo" src={brand.chatbotLogoSrc} alt="" />
        <span>{t('chatbot')}</span>
      </button>

      <button
        className="chat-launcher chat-launcher-mobile"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={t('chatbot')}
        aria-expanded={open}
        aria-controls="tarhal-chat-panel"
      >
        <img className="chat-launcher-logo" src={brand.chatbotLogoSrc} alt="" />
      </button>

      {open && (
        <section
          className="chat-panel"
          id="tarhal-chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="tarhal-chat-title"
        >
          <header className="chat-panel-header">
            <img className="chat-panel-logo" src={brand.chatbotLogoSrc} alt="" />
            <div className="chat-panel-heading">
              <strong id="tarhal-chat-title">{t('chatTitle')}</strong>
              <span>{t('chatDemoNote')}</span>
            </div>
            <button
              className="chat-close"
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('chatClose')}
            >
              <X size={19} />
            </button>
          </header>

          <div className="chat-messages" role="log" aria-live="polite">
            <div className="chat-message assistant">{t('chatGreeting')}</div>
            {messages.map((message) => (
              <div className="chat-entry" data-role={message.role} key={message.id}>
                <div className={`chat-message ${message.role}`}>
                  {message.role === 'user' ? message.text : formatReply(message.text).map((block, index) => block.type === 'gap'
                    ? <div key={index} className="chat-gap" />
                    : <div key={index} dir="auto" className={block.type === 'li' ? 'chat-li' : block.type === 'h' ? 'chat-h' : undefined}>
                        {block.parts.map((part, i) => part.bold ? <strong key={i}>{part.text}</strong> : <span key={i}>{part.text}</span>)}
                      </div>)}
                </div>
                {message.flights?.map((f) => (
                  <div key={f.id} className="chat-card">
                    <strong dir="ltr">{f.from} → {f.to} · {f.airline ? `${f.airline} ` : ''}{f.flightNumber}</strong>
                    <span>{format.dateTime(f.departureTime)}</span>
                    <span>{fromBefore}<Money sar={f.lowestPrice} />{fromAfter} · {t('seatsCount', { count: format.number(f.availableSeats) })}</span>
                  </div>
                ))}
                {message.hotels?.map((h) => (
                  <div key={h.id} className="chat-card">
                    <strong>{h.name} · {h.city}</strong>
                    <span>★ {format.rating(h.rating)} · {h.roomType}</span>
                    <span><Money sar={h.pricePerNight} /> {t('perNight')}</span>
                  </div>
                ))}
                {message.cars?.map((c) => (
                  <div key={c.id} className="chat-card">
                    <strong dir="ltr">{c.make} {c.model} {format.year(c.year)} · {c.city}</strong>
                    <span>{t('seatsCount', { count: format.number(c.seats) })}</span>
                    <span><Money sar={c.pricePerDay} /> {t('perDay')}</span>
                  </div>
                ))}
              </div>
            ))}
            {loading && <div className="chat-status" aria-live="polite">{t('chatTyping')}</div>}
            {error && <div className="chat-error" role="alert">{error}</div>}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 0 && !loading && (
            <div className="chat-quick-prompts" aria-label={t('chatbot')}>
              {quickTopics.map((topic) => (
                <button key={topic} type="button" onClick={() => void sendMessage(t(topic))}>
                  {t(topic)}
                </button>
              ))}
            </div>
          )}

          <form className="chat-form" onSubmit={handleSubmit}>
            <input
              className="chat-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('chatPlaceholder')}
              aria-label={t('chatPlaceholder')}
              maxLength={MAX_CHARS}
              disabled={loading}
            />
            <button
              className="chat-send"
              type="submit"
              disabled={!draft.trim() || loading}
              aria-label={t('chatSend')}
            >
              <Send size={17} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
