import { useState } from 'react';
import { Minus, Plus, Sparkles } from 'lucide-react';
import { useFormat, useT } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/translations';
import { aiErrorKey, aiService, INTERESTS, type CityGuideAi, type Interest, type ItineraryDay } from '@/services/aiService';
import { useDemoState } from '@/store/demoStore';

const INTEREST_KEY: Record<Interest, TranslationKey> = {
  culture: 'tpInterestCulture', history: 'tpInterestHistory', nature: 'tpInterestNature', food: 'tpInterestFood', shopping: 'tpInterestShopping',
  beach: 'tpInterestBeach', adventure: 'tpInterestAdventure', family: 'tpInterestFamily', religious: 'tpInterestReligious',
};

type Load<T> = { status: 'idle' } | { status: 'loading' } | { status: 'error'; message: TranslationKey } | { status: 'ready'; data: T };

/**
 * Alwaleed's destination guide and day-by-day plan (POST /api/ai/guide, /api/ai/itinerary) on Tariq's city page,
 * in his section style. Every answer is marked AI-generated; nothing here replaces his own city text.
 * `city` is the English name the API knows (his data/cities.ts names); `name` is how the page shows it.
 */
export function AiCityGuide({ city, name }: { city: string; name: string }) {
  const t = useT();
  const format = useFormat();
  const { language } = useDemoState().settings;
  const [guide, setGuide] = useState<Load<CityGuideAi>>({ status: 'idle' });
  const [plan, setPlan] = useState<Load<ItineraryDay[]>>({ status: 'idle' });
  const [days, setDays] = useState(3);
  const [interests, setInterests] = useState<Interest[]>(['culture', 'food']);

  const loadGuide = async () => {
    setGuide({ status: 'loading' });
    try { setGuide({ status: 'ready', data: await aiService.guide(city, language) }); }
    catch (error) { setGuide({ status: 'error', message: aiErrorKey(error) }); }
  };
  const loadPlan = async () => {
    setPlan({ status: 'loading' });
    try { setPlan({ status: 'ready', data: await aiService.itinerary(city, days, interests, language) }); }
    catch (error) { setPlan({ status: 'error', message: aiErrorKey(error) }); }
  };
  const toggle = (interest: Interest) => setInterests((list) => (list.includes(interest) ? list.filter((i) => i !== interest) : list.length >= 5 ? list : [...list, interest]));
  const aiLabel = <p className="ai-label"><Sparkles size={13} aria-hidden="true" /> {t('tpAiGenerated')}</p>;

  return (
    <>
      <section className="city-guide-recommendations ai-guide" aria-labelledby="ai-guide-title" data-testid="ai-guide">
        <div className="city-guide-section-heading">
          <div>
            <h2 id="ai-guide-title">{t('tpAiGuideTitle')}</h2>
            <p>{t('tpAiGenerated')}</p>
          </div>
          {guide.status !== 'ready' && (
            <button type="button" className="bookings-button" onClick={() => void loadGuide()} disabled={guide.status === 'loading'} data-testid="button-ai-guide">
              <Sparkles size={15} aria-hidden="true" /> {guide.status === 'loading' ? t('tpAiLoading') : t('tpAiGuideButton', { city: name })}
            </button>
          )}
        </div>
        <div aria-live="polite">
          {guide.status === 'loading' && <div className="ai-skeleton" role="status" aria-label={t('tpAiLoading')}><span /><span /><span /></div>}
          {guide.status === 'error' && <p className="ai-error" role="alert" data-testid="ai-guide-error">{t(guide.message)}</p>}
          {guide.status === 'ready' && (
            <div className="ai-result" dir="auto" data-testid="ai-guide-result">
              {aiLabel}
              <p className="ai-summary">{guide.data.summary}</p>
              <h3>{t('tpBestTime')}</h3>
              <p>{guide.data.bestTime}</p>
              <h3>{t('tpPlacesToVisit')}</h3>
              <ul className="ai-places">{guide.data.places.map((place) => <li key={place.name}><strong>{place.name}</strong><span>{place.description}</span></li>)}</ul>
              <h3>{t('tpTips')}</h3>
              <ul className="ai-tips">{guide.data.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
            </div>
          )}
        </div>
      </section>

      <section className="city-guide-recommendations ai-guide" aria-labelledby="ai-plan-title" data-testid="ai-plan">
        <div className="city-guide-section-heading">
          <div>
            <h2 id="ai-plan-title">{t('tpAiPlanTitle')}</h2>
            <p>{t('tpAiPlanIntro')}</p>
          </div>
        </div>
        <div className="ai-plan-form">
          <div>
            <span className="field-label">{t('tpDaysLabel')}</span>
            <div className="hotel-stepper">
              <button type="button" aria-label={t('tpFewerNights')} disabled={days <= 1} onClick={() => setDays(days - 1)}><Minus size={14} /></button>
              <strong aria-live="polite" data-testid="text-ai-days">{format.number(days)}</strong>
              <button type="button" aria-label={t('tpMoreNights')} disabled={days >= 7} onClick={() => setDays(days + 1)}><Plus size={14} /></button>
            </div>
          </div>
          <div className="ai-interests" role="group" aria-label={t('tpInterestsLabel')}>
            <span className="field-label">{t('tpInterestsLabel')}</span>
            <div>
              {INTERESTS.map((interest) => (
                <button key={interest} type="button" className={`ai-chip${interests.includes(interest) ? ' chosen' : ''}`} aria-pressed={interests.includes(interest)} onClick={() => toggle(interest)} data-testid={`chip-interest-${interest}`}>
                  {t(INTEREST_KEY[interest])}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="bookings-button" onClick={() => void loadPlan()} disabled={plan.status === 'loading'} data-testid="button-ai-plan">
            <Sparkles size={15} aria-hidden="true" /> {plan.status === 'loading' ? t('tpAiLoading') : t('tpMakePlan')}
          </button>
        </div>
        <div aria-live="polite">
          {plan.status === 'loading' && <div className="ai-skeleton" role="status" aria-label={t('tpAiLoading')}><span /><span /><span /></div>}
          {plan.status === 'error' && <p className="ai-error" role="alert" data-testid="ai-plan-error">{t(plan.message)}</p>}
          {plan.status === 'ready' && (
            <div className="ai-result" dir="auto" data-testid="ai-plan-result">
              {aiLabel}
              <ol className="ai-days">
                {plan.data.map((d) => (
                  <li key={d.day} className="ai-day">
                    <p className="field-label">{t('tpDayN', { n: format.number(d.day) })}</p>
                    <h3>{d.title}</h3>
                    <dl>
                      <div><dt>{t('tpMorning')}</dt><dd>{d.morning}</dd></div>
                      <div><dt>{t('tpAfternoon')}</dt><dd>{d.afternoon}</dd></div>
                      <div><dt>{t('tpEvening')}</dt><dd>{d.evening}</dd></div>
                      {d.tip && <div><dt>{t('tpTip')}</dt><dd>{d.tip}</dd></div>}
                    </dl>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
