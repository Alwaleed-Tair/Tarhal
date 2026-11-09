import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Field, SelectField } from '@/components/form-fields';
import { SarSymbol } from '@/components/money';
import type { ResourceRow, Service } from '@/data/demoData';
import type { TranslationKey } from '@/i18n/translations';
import { useT } from '@/i18n/use-i18n';
import { carBody, changedFields, createDraft, flightBody, flightChanges, hotelBody, newSeat, rowKey, validateDraft, type FieldErrors, type ModalMode, type ResourceDraft, type SeatDraft } from '@/lib/resource-draft';
import { friendlyWriteError } from '@/lib/write-error';
import { carService, TRANSMISSIONS, type Transmission } from '@/services/carService';
import { flightService, TICKET_CLASSES, type Airline, type TicketClass } from '@/services/flightService';
import { hotelService } from '@/services/hotelService';
import { translateValue } from '@/i18n/labels';
import { notify } from '@/store/notificationStore';
import { useDemoState } from '@/store/demoStore';

const heading: Record<Service, TranslationKey> = { flight: 'flightManagement', hotel: 'hotelManagement', car: 'carManagement' };
const singular: Record<Service, TranslationKey> = { flight: 'flightSingular', hotel: 'hotelSingular', car: 'carSingular' };
const actionKey: Record<ModalMode, TranslationKey> = { add: 'add', edit: 'edit', remove: 'remove' };
const noticeKeys: Record<ModalMode, { title: TranslationKey; message: TranslationKey }> = {
  add: { title: 'recordAddedTitle', message: 'recordAdded' },
  edit: { title: 'recordUpdatedTitle', message: 'recordUpdated' },
  remove: { title: 'recordRemovedTitle', message: 'recordRemoved' },
};

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

type Props = {
  kind: Service;
  mode: ModalMode;
  /** The row whose Edit or Remove button was pressed. */
  initialKey: string;
  rows: ResourceRow[];
  airlines: Airline[];
  onClose: () => void;
  /** A save reached the server: the page reloads its table. */
  onSaved: () => void;
};

/** Add / Edit / Remove form of the Flights, Hotels and Cars tables. Which of them a table offers is decided by WRITE_ACTIONS in pages/admin-resource.tsx. */
export function ResourceModal({ kind, mode, initialKey, rows, airlines, onClose, onSaved }: Props) {
  const t = useT();
  const lang = useDemoState().settings.language;
  const [selectedKey, setSelectedKey] = useState(initialKey);
  const selected = rows.find((row) => rowKey(row) === selectedKey);
  const [draft, setDraft] = useState<ResourceDraft>(() => createDraft(mode === 'add' ? undefined : selected));
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  const closed = useRef(false); // A late response must not touch a form that is gone.
  const closeTimer = useRef<number | undefined>(undefined);

  function close() {
    closed.current = true;
    // A short fade out; nothing to wait for when the user prefers reduced motion.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onClose(); return; }
    setClosing(true);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(onClose, 130);
  }

  // Focus moves into the dialog when it opens, and goes back to the button that opened it when it closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>('.modal-form :is(input, select)')?.focus();
    return () => { window.clearTimeout(closeTimer.current); opener?.focus?.(); };
  }, []);

  // Listens on the window so Escape and Tab still work if focus ever leaves the dialog.
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { closeRef.current(); return; }
      if (event.key !== 'Tab' || !dialog.current) return;
      const items = dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1], active = document.activeElement;
      if (!dialog.current.contains(active)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The form scrolls on phones: a server's answer must not stay out of sight.
  useEffect(() => {
    if (formError) dialog.current?.querySelector('.form-error')?.scrollIntoView({ block: 'nearest' });
  }, [formError]);

  function chooseRecord(key: string) {
    setFieldErrors({});
    setSelectedKey(key);
    setDraft(createDraft(rows.find((row) => rowKey(row) === key)));
    setFormError('');
  }

  function update(field: Exclude<keyof ResourceDraft, 'seats' | 'isAvailable'>, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined })); // This field's message goes as soon as it is edited.
    setFormError('');
  }

  function updateSeat(index: number, change: Partial<SeatDraft>) {
    setDraft((current) => ({ ...current, seats: current.seats.map((seat, i) => (i === index ? { ...seat, ...change } : seat)) }));
    setFieldErrors((current) => ({ ...current, [`seatCode${index}`]: undefined, [`priceMultiplier${index}`]: undefined }));
    setFormError('');
  }

  /** Adding or removing a row shifts the seat indexes, so the seat messages are cleared until the next submit. */
  function changeSeats(seats: SeatDraft[]) {
    setDraft((current) => ({ ...current, seats }));
    setFieldErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !/^(seats|seatCode|priceMultiplier)/.test(key))));
    setFormError('');
  }

  /** Sends the change. Returns false when an edit changed nothing, so there is nothing to announce. */
  async function send(): Promise<boolean> {
    const apiId = selected?.apiId ?? selected?.id ?? '';
    if (mode === 'remove') { await flightService.remove(apiId); return true; }
    if (kind === 'flight') {
      if (mode === 'add') { await flightService.create(flightBody(draft)); return true; }
      const changes = flightChanges(draft, selected!);
      if (Object.keys(changes).length === 0) return false;
      await flightService.update(apiId, changes);
      return true;
    }
    if (kind === 'hotel') {
      if (mode === 'add') { await hotelService.create(hotelBody(draft)); return true; }
      const changes = changedFields(hotelBody(draft), hotelBody(createDraft(selected)));
      if (Object.keys(changes).length === 0) return false;
      await hotelService.update(apiId, changes);
      return true;
    }
    if (mode === 'add') { await carService.create(carBody(draft)); return true; }
    const changes = changedFields(carBody(draft), carBody(createDraft(selected)));
    if (Object.keys(changes).length === 0) return false;
    await carService.update(apiId, changes);
    return true;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    // Nothing is sent while a required field is empty or invalid.
    const errors = validateDraft(kind, mode, draft, selected, rows, airlines.length, t);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError(t('requiredField'));
      window.setTimeout(() => dialog.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setFormError('');
    setSubmitting(true);
    const label = mode === 'add' ? (kind === 'flight' ? draft.flightNumber.trim().toUpperCase() : kind === 'hotel' ? draft.name.trim() : `${draft.make.trim()} ${draft.model.trim()}`) : selected?.id ?? '';
    try {
      const changed = await send();
      if (changed) {
        notify({ tone: mode === 'remove' ? 'warning' : 'success', titleKey: noticeKeys[mode].title, messageKey: noticeKeys[mode].message, params: { noun: { key: singular[kind] }, id: label } });
        onSaved();
      }
      if (!closed.current) close();
    } catch (error) {
      // The form stays open with the admin's input, and says why.
      if (closed.current) return;
      setFormError(friendlyWriteError(error, t));
      setSubmitting(false);
    }
  }

  const priceLabel = (text: string) => <span className="label-with-symbol">{text} <SarSymbol /></span>;
  const options = (values: readonly string[]) => [...values];

  return (
    <div className={`modal-backdrop${closing ? ' is-closing' : ''}`} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section ref={dialog} className="modal-card" role="dialog" aria-modal="true" aria-labelledby="resource-modal-title">
        <div className="modal-header">
          <div><span className="modal-eyebrow">{t(heading[kind])}</span><h2 id="resource-modal-title">{t(actionKey[mode])} {t(singular[kind])}</h2></div>
          <button type="button" className="modal-close" onClick={close} aria-label={t('close')}>×</button>
        </div>
        <form className="modal-form" onSubmit={save} noValidate aria-busy={submitting}>
          {mode !== 'add' && (
            <label className="modal-field">
              <span>{t('chooseRecord')}</span>
              <select className="select-control" value={selectedKey} onChange={(event) => chooseRecord(event.target.value)} aria-invalid={Boolean(fieldErrors.selectedId)} disabled={submitting} data-testid={`select-${mode}-${kind}-record`}>
                <option value="">{t('selectRecord')}</option>
                {rows.map((row) => <option value={rowKey(row)} key={rowKey(row)}>{translateValue(row.id, lang)}</option>)}
              </select>
              {fieldErrors.selectedId && <small className="field-error" role="alert">{fieldErrors.selectedId}</small>}
            </label>
          )}

          {mode !== 'remove' && kind === 'flight' && <>
            {mode === 'add' && (
              <section className="modal-section">
                <h3>{t('sectionFlight')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label={t('flightNumber')} value={draft.flightNumber} onChange={(value) => update('flightNumber', value)} error={fieldErrors.flightNumber} required ltr testId="input-flight-number" />
                  <SelectField label={t('airline')} value={draft.airlineId} onChange={(value) => update('airlineId', value)} options={airlines.map((a) => a.id)} getLabel={(id) => { const a = airlines.find((x) => x.id === id); return (lang === 'ar' ? a?.nameAr : a?.name) ?? id; }} placeholder={t('select')} error={fieldErrors.airlineId} required testId="select-flight-airline" />
                  <Field label={t('fromAirport')} value={draft.from} onChange={(value) => update('from', value)} error={fieldErrors.from} maxLength={3} required ltr testId="input-flight-from" />
                  <Field label={t('toAirport')} value={draft.to} onChange={(value) => update('to', value)} error={fieldErrors.to} maxLength={3} required ltr testId="input-flight-to" />
                </div>
              </section>
            )}
            <section className="modal-section">
              <h3>{t('sectionSchedule')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={`${t('departureTime')} (${t('riyadhTime')})`} type="datetime-local" value={draft.departureTime} onChange={(value) => update('departureTime', value)} error={fieldErrors.departureTime} required ltr testId="input-flight-departure" />
                {mode === 'add' && <Field label={`${t('arrivalTime')} (${t('riyadhTime')})`} type="datetime-local" value={draft.arrivalTime} onChange={(value) => update('arrivalTime', value)} error={fieldErrors.arrivalTime} required ltr testId="input-flight-arrival" />}
              </div>
            </section>
            <section className="modal-section">
              <h3>{t('sectionPrice')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={priceLabel(t('basePrice'))} inputMode="decimal" value={draft.price} onChange={(value) => update('price', value)} error={fieldErrors.price} required ltr testId="input-record-price" />
              </div>
            </section>
            {mode === 'add' && (
              <fieldset className="modal-section modal-seats">
                <legend>{t('flightSeats')} *</legend>
                {draft.seats.map((seat, index) => (
                  <div className="modal-seat-row" key={seat.key}>
                    <Field label={t('seatCode')} value={seat.seatCode} onChange={(value) => updateSeat(index, { seatCode: value })} error={fieldErrors[`seatCode${index}`]} required ltr testId={`input-seat-code-${index}`} />
                    <SelectField label={t('ticketClass')} value={seat.ticketClass} onChange={(value) => updateSeat(index, { ticketClass: value as TicketClass })} options={options(TICKET_CLASSES)} getLabel={(v) => t(`ticket${v as TicketClass}`)} required testId={`select-seat-class-${index}`} />
                    <Field label={t('priceMultiplier')} inputMode="decimal" value={seat.priceMultiplier} onChange={(value) => updateSeat(index, { priceMultiplier: value })} error={fieldErrors[`priceMultiplier${index}`]} required ltr testId={`input-seat-multiplier-${index}`} />
                    <button type="button" className="button button-ghost button-ghost-danger modal-seat-remove" onClick={() => changeSeats(draft.seats.filter((_, i) => i !== index))} aria-label={`${t('removeSeat')} ${seat.seatCode}`} title={t('removeSeat')} data-testid={`button-remove-seat-${index}`}><Trash2 size={14} aria-hidden="true" /></button>
                  </div>
                ))}
                {fieldErrors.seats && <small className="field-error" role="alert">{fieldErrors.seats}</small>}
                <button type="button" className="button button-ghost modal-seat-add" onClick={() => changeSeats([...draft.seats, newSeat()])} data-testid="button-add-seat"><Plus size={14} aria-hidden="true" />{t('addSeat')}</button>
              </fieldset>
            )}
          </>}

          {mode !== 'remove' && kind === 'hotel' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('hotelName')} value={draft.name} onChange={(value) => update('name', value)} error={fieldErrors.name} required testId="input-hotel-name" />
              <Field label={t('city')} value={draft.city} onChange={(value) => update('city', value)} error={fieldErrors.city} required testId="input-record-city" />
              <Field label={t('address')} value={draft.address} onChange={(value) => update('address', value)} testId="input-hotel-address" />
              <Field label={t('roomType')} value={draft.roomType} onChange={(value) => update('roomType', value)} error={fieldErrors.roomType} required testId="input-hotel-room" />
              <Field label={priceLabel(t('nightlyPrice'))} inputMode="decimal" value={draft.price} onChange={(value) => update('price', value)} error={fieldErrors.price} required ltr testId="input-record-price" />
              <Field label={t('ratingField')} inputMode="decimal" value={draft.rating} onChange={(value) => update('rating', value)} error={fieldErrors.rating} required ltr testId="input-hotel-rating" />
              <Field label={t('imageUrl')} value={draft.imageUrl} onChange={(value) => update('imageUrl', value)} ltr testId="input-record-image" />
            </div>
          )}

          {mode !== 'remove' && kind === 'car' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('make')} value={draft.make} onChange={(value) => update('make', value)} error={fieldErrors.make} required testId="input-car-make" />
              <Field label={t('model')} value={draft.model} onChange={(value) => update('model', value)} error={fieldErrors.model} required testId="input-car-model" />
              <Field label={t('year')} inputMode="numeric" value={draft.year} onChange={(value) => update('year', value)} error={fieldErrors.year} required ltr testId="input-car-year" />
              <Field label={t('seatCount')} inputMode="numeric" value={draft.seatCount} onChange={(value) => update('seatCount', value)} error={fieldErrors.seatCount} required ltr testId="input-car-seats" />
              <Field label={t('category')} value={draft.category} onChange={(value) => update('category', value)} error={fieldErrors.category} required testId="input-car-category" />
              <SelectField label={t('filterTransmission')} value={draft.transmission} onChange={(value) => update('transmission', value as Transmission)} options={options(TRANSMISSIONS)} getLabel={(v) => t(v === 'MANUAL' ? 'manual' : 'automatic')} required testId="select-car-transmission" />
              <Field label={t('city')} value={draft.city} onChange={(value) => update('city', value)} error={fieldErrors.city} required testId="input-record-city" />
              <Field label={priceLabel(t('dailyPrice'))} inputMode="decimal" value={draft.price} onChange={(value) => update('price', value)} error={fieldErrors.price} required ltr testId="input-record-price" />
              <Field label={priceLabel(t('dailyInsurance'))} inputMode="decimal" value={draft.insurance} onChange={(value) => update('insurance', value)} error={fieldErrors.insurance} ltr testId="input-car-insurance" />
              <Field label={t('imageUrl')} value={draft.imageUrl} onChange={(value) => update('imageUrl', value)} ltr testId="input-record-image" />
              <label className="modal-check"><input type="checkbox" checked={draft.isAvailable} onChange={(event) => setDraft((current) => ({ ...current, isAvailable: event.target.checked }))} data-testid="input-car-available" />{t('availableForRent')}</label>
            </div>
          )}

          {mode === 'remove' && <p className="modal-warning">{selected ? <>{t('removeRecordConfirm')} <bdi>{translateValue(selected.id, lang)}</bdi></> : t('selectRecordFirst')}</p>}
          {formError && <p className="form-error" role="alert" data-testid="modal-form-error">{formError}</p>}
          <div className="modal-actions">
            <button type="button" className="button button-ghost" onClick={close}>{t('cancel')}</button>
            {/* aria-disabled, not disabled: a disabled button would drop keyboard focus out of the dialog. save() ignores a second press. */}
            <button type="submit" className={`button ${mode === 'remove' ? 'button-danger' : 'button-primary'}`} aria-disabled={submitting} data-testid={`button-confirm-${mode}-${kind}`}>{submitting ? t('saving') : mode === 'remove' ? t('remove') : mode === 'add' ? t('add') : t('saveChanges')}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
