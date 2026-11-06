import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send, X } from 'lucide-react';
import { useT } from '@/components/layout';
import type { TranslationKey } from '@/i18n/translations';
import { brand } from '@/config/branding';

type ChatMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
};

const quickTopics: Array<{ label: TranslationKey; reply: TranslationKey }> = [
  { label: 'bookings', reply: 'chatBookingHelp' },
  { label: 'revenue', reply: 'chatRevenueHelp' },
  { label: 'flights', reply: 'chatFlightsHelp' },
  { label: 'hotels', reply: 'chatHotelsHelp' },
  { label: 'cars', reply: 'chatCarsHelp' },
];

let nextMessageId = 0;

function getReplyKey(message: string): TranslationKey {
  const value = message.toLocaleLowerCase();

  if (/book|reserv|حجز|الحجوز/.test(value)) return 'chatBookingHelp';
  if (/revenue|income|إيراد|الايراد/.test(value)) return 'chatRevenueHelp';
  if (/flight|رحل/.test(value)) return 'chatFlightsHelp';
  if (/hotel|فندق|الفناد/.test(value)) return 'chatHotelsHelp';
  if (/car|rental|سيار|تأجير/.test(value)) return 'chatCarsHelp';

  return 'chatFallback';
}

export default function ChatAssistant() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  function sendMessage(text: string, replyKey = getReplyKey(text)) {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      { id: ++nextMessageId, role: 'user', text: trimmed },
      { id: ++nextMessageId, role: 'assistant', text: t(replyKey) },
    ]);
    setDraft('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(draft);
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
              <div
                className={`chat-message ${message.role}`}
                key={message.id}
              >
                {message.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 0 && (
            <div className="chat-quick-prompts" aria-label={t('chatbot')}>
              {quickTopics.map((topic) => (
                <button
                  key={topic.label}
                  type="button"
                  onClick={() => sendMessage(t(topic.label), topic.reply)}
                >
                  {t(topic.label)}
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
            />
            <button
              className="chat-send"
              type="submit"
              disabled={!draft.trim()}
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