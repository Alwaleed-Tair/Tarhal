import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { initialResources, type ResourceRow, type Service } from '@/data/demoData';
import { DataTable, type Column } from '@/components/data-table';
import { Layout } from '@/components/layout';
import { ContextBadge, PageHeader } from '@/components/page-header';
import { SuggestSearch } from '@/components/suggest-search';
import { EmptyState } from '@/components/empty-state';
import { Ltr } from '@/components/ltr';
import { ErrorState } from '@/components/error-state';
import { Money } from '@/components/money';
import { StatusBadge } from '@/components/status-badge';
import { TableSkeleton } from '@/components/skeleton';
import { StatCard } from '@/components/stat-card';
import { useAdminBookings } from '@/hooks/use-admin-bookings';
import { useLiveData } from '@/hooks/use-live-data';
import { bookingMetrics, monthlyMetrics } from '@/lib/booking-stats';
import { parseApiError } from '@/services/api';
import { flightService, TICKET_CLASSES, type Airline, type FlightUpdateInput, type TicketClass } from '@/services/flightService';
import { hotelService } from '@/services/hotelService';
import { carService } from '@/services/carService';
import type { Language, TranslationKey } from '@/i18n/translations';
import { statusLabel, translateValue } from '@/i18n/labels';
import { isoToRiyadhLocal, riyadhLocalToIso, type Formatters } from '@/i18n/format';
import { useFormat, useT } from '@/i18n/use-i18n';
import { notify } from '@/store/notificationStore';
import { useDemoState } from '@/store/demoStore';

// Stored values stay in English; labels are translated on display (see `translateValue`).
const OPTIONS = {
  airline: ['Saudia', 'Flynas', 'Flyadeal', 'Emirates', 'Qatar Airways'],
  city: ['Riyadh', 'Jeddah', 'Dubai', 'Amman', 'Doha', 'Cairo'],
  room: ['King Suite', 'Deluxe', 'Twin Room', 'Standard Room'],
  availability: ['Available Now', 'Limited', 'Booked'],
  hotelName: ['Hilton Garden', 'The Boulevard', 'Mövenpick'],
  carModel: ['Toyota Camry', 'Kia Carnival', 'BMW 3 Series', 'Nissan Patrol', 'Hyundai Sonata'],
  status: ['Available', 'Limited', 'Scheduled', 'Boarding', 'Booked'],
};

type Kind = Service;

const loaders: Record<Kind, () => Promise<{ rows: ResourceRow[]; total: number }>> = {
  flight: () => flightService.adminList().then((rows) => ({ rows, total: rows.length })),
  hotel: () => hotelService.list({ page: 1, pageSize: 100 }).then((r) => ({ rows: r.rows, total: r.pagination?.total ?? r.rows.length })),
  car: () => carService.list({ page: 1, pageSize: 100 }).then((r) => ({ rows: r.rows, total: r.pagination?.total ?? r.rows.length })),
};
type ModalMode = 'add' | 'edit' | 'remove';
type SeatDraft = { key: number; seatCode: string; ticketClass: TicketClass; priceMultiplier: string };
type ResourceDraft = { id: string; airline: string; from: string; to: string; departureTime: string; arrivalTime: string; seats: SeatDraft[]; city: string; room: string; location: string; availability: string; price: string; status: string };

/**
 * Which buttons each table offers. Only what the real API has (checked against app/api):
 * flights have POST and PATCH /api/admin/flights but no DELETE; hotels and cars only have GET.
 * Turn these on when POST and PATCH /api/admin/hotels and /api/admin/cars (and a DELETE) exist.
 */
const WRITE_ACTIONS: Record<Kind, Record<ModalMode, boolean>> = {
  flight: { add: true, edit: true, remove: false },
  hotel: { add: false, edit: false, remove: false },
  car: { add: false, edit: false, remove: false },
};

const heading: Record<Kind, TranslationKey> = { flight: 'flightManagement', hotel: 'hotelManagement', car: 'carManagement' };
const singular: Record<Kind, TranslationKey> = { flight: 'flightSingular', hotel: 'hotelSingular', car: 'carSingular' };
const sectionKey: Record<Kind, TranslationKey> = { flight: 'flights', hotel: 'hotels', car: 'cars' };
const emptyKey: Record<Kind, TranslationKey> = { flight: 'noFlightsYet', hotel: 'noHotelsYet', car: 'noCarsYet' };
const subtitleKey: Record<Kind, TranslationKey> = { flight: 'flightsSubtitle', hotel: 'hotelsSubtitle', car: 'carsSubtitle' };
const actionKey: Record<ModalMode, TranslationKey> = { add: 'add', edit: 'edit', remove: 'remove' };
const noticeKeys: Record<ModalMode, { title: TranslationKey; message: TranslationKey }> = {
  add: { title: 'recordAddedTitle', message: 'recordAdded' },
  edit: { title: 'recordUpdatedTitle', message: 'recordUpdated' },
  remove: { title: 'recordRemovedTitle', message: 'recordRemoved' },
};

let seatKey = 0;
const newSeat = (): SeatDraft => ({ key: ++seatKey, seatCode: '', ticketClass: 'ECONOMY', priceMultiplier: '1' });

function createDraft(row?: ResourceRow): ResourceDraft {
  return { id: row?.id ?? '', airline: row?.airlineId ?? '', from: '', to: '', departureTime: isoToRiyadhLocal(row?.departureTime ?? ''), arrivalTime: isoToRiyadhLocal(row?.arrivalTime ?? ''), seats: [newSeat()], city: row?.city ?? '', room: row?.room ?? '', location: row?.location ?? '', availability: row?.availability ?? '', price: String(row?.price ?? ''), status: row?.status ?? '' };
}

function toRow(kind: Kind, draft: ResourceDraft, airlines: Airline[]): ResourceRow {
  const base = { id: draft.id.trim(), price: Number(draft.price), status: draft.status.trim() || 'Available' };
  if (kind === 'flight') {
    const airline = airlines.find((a) => a.id === draft.airline);
    return {
      ...base, status: '', airlineId: draft.airline, airline: airline?.name ?? '', airlineAr: airline?.nameAr,
      route: `${draft.from.trim().toUpperCase()} → ${draft.to.trim().toUpperCase()}`,
      departureTime: draft.departureTime ? riyadhLocalToIso(draft.departureTime) : undefined,
      arrivalTime: draft.arrivalTime ? riyadhLocalToIso(draft.arrivalTime) : undefined,
    };
  }
  if (kind === 'hotel') return { ...base, city: draft.city.trim(), room: draft.room.trim() };
  return { ...base, location: draft.location.trim(), availability: draft.availability.trim() };
}

function getRowDetails(kind: Kind, row: ResourceRow, language: Language): string {
  if (kind === 'flight') return translateValue(row.route ?? '', language);
  if (kind === 'hotel') return `${translateValue(row.city ?? '', language)} · ${translateValue(row.room ?? '', language)}`;
  return `${translateValue(row.location ?? '', language)} · ${translateValue(row.availability ?? '', language)}`;
}

type FieldName = keyof ResourceDraft | 'selectedId' | `seatCode${number}` | `priceMultiplier${number}`;
type FieldErrors = Partial<Record<FieldName, string>>;

/** Client-side checks that run before anything is sent. Returns one message per invalid field. */
function validateDraft(kind: Kind, mode: ModalMode, draft: ResourceDraft, selectedId: string, rows: ResourceRow[], airlineCount: number, t: ReturnType<typeof useT>): FieldErrors {
  const errors: FieldErrors = {};
  const required = t('fieldRequired');
  if (mode !== 'add' && !selectedId) errors.selectedId = t('selectRecordFirst');
  if (mode === 'remove') return errors;
  if (mode === 'add') {
    if (!draft.id.trim()) errors.id = required;
    else if (rows.some((row) => row.id.toLowerCase() === draft.id.trim().toLowerCase())) errors.id = t('duplicateRecord');
  }
  if (kind === 'flight') {
    if (!draft.departureTime) errors.departureTime = required;
    if (mode === 'add') {
      if (!draft.airline) errors.airline = airlineCount > 0 ? required : t('airlinesUnavailable');
      const from = draft.from.trim().toUpperCase(), to = draft.to.trim().toUpperCase();
      if (!from) errors.from = required; else if (!/^[A-Z]{3}$/.test(from)) errors.from = t('airportInvalid');
      if (!to) errors.to = required; else if (!/^[A-Z]{3}$/.test(to)) errors.to = t('airportInvalid'); else if (to === from) errors.to = t('airportsSame');
      if (!draft.arrivalTime) errors.arrivalTime = required;
      else if (draft.departureTime && draft.arrivalTime <= draft.departureTime) errors.arrivalTime = t('arrivalAfterDeparture');
      if (draft.seats.length === 0) errors.seats = t('seatsRequired');
      const seen = new Set<string>();
      draft.seats.forEach((seat, index) => {
        const code = seat.seatCode.trim().toUpperCase();
        if (!code) errors[`seatCode${index}`] = required;
        else if (seen.has(code)) errors[`seatCode${index}`] = t('seatDuplicate');
        seen.add(code);
        const multiplier = Number(seat.priceMultiplier);
        if (!seat.priceMultiplier.trim() || !(multiplier > 0) || multiplier > 99.99) errors[`priceMultiplier${index}`] = t('multiplierInvalid');
      });
    } else {
      // PATCH cannot change the arrival time, so a new departure has to stay before the existing arrival.
      const arrival = rows.find((row) => row.id === selectedId)?.arrivalTime;
      if (draft.departureTime && arrival && Date.parse(riyadhLocalToIso(draft.departureTime)) >= Date.parse(arrival)) errors.departureTime = t('arrivalAfterDeparture');
    }
  } else if (kind === 'hotel') {
    if (!draft.city) errors.city = required;
    if (!draft.room) errors.room = required;
  } else {
    if (!draft.location) errors.location = required;
    if (!draft.availability) errors.availability = required;
  }
  if (!draft.price.trim()) errors.price = required;
  else if (!Number.isFinite(Number(draft.price)) || Number(draft.price) < 0 || Number(draft.price) > 99999999.99) errors.price = t('priceInvalid');
  if (kind !== 'flight' && !draft.status.trim()) errors.status = required;
  return errors;
}

/** The backend's own message when it sent one (e.g. "Flight number already exists at this time"), otherwise a translated reason for the status. */
function serverErrorText(error: unknown, t: ReturnType<typeof useT>): string {
  const { status, kind, message } = parseApiError(error);
  if (message) return message;
  if (kind === 'timeout') return t('errTimeout');
  if (kind === 'network') return t('errNetwork');
  if (status === 400 || status === 422) return t('errBadRequest');
  if (status === 401) return t('errUnauthorized');
  if (status === 403) return t('errForbidden');
  if (status === 404) return t('errNotFound');
  if (status === 409) return t('errConflict');
  if (status && status >= 500) return t('errServer');
  return t('errGeneric');
}

export default function AdminResource({ kind }: { kind: Kind }) {
  const t = useT();
  const format = useFormat();
  const { settings } = useDemoState();
  const lang = settings.language;
  // TODO / INTEGRATION POINT
  // INTEGRATION POINT: Connect Saud's Flight & Booking APIs here
  // Flights = Saud. Hotels and Cars = Mohammed (INTEGRATION POINT: Connect Mohammed's Auth, Hotel & Car APIs here). Add/Edit/Remove below should call the matching endpoints.
  const { data: fetched, status: loadStatus, offline, reason, reload } = useLiveData(() => loaders[kind](), () => ({ rows: initialResources[kind], total: initialResources[kind].length }), kind);
  const { bookings, status: bookingsStatus, offline: bookingsOffline } = useAdminBookings();
  const { data: airlineDirectory, offline: airlinesOffline } = useLiveData<Airline[]>(() => flightService.airlineDirectory(), () => OPTIONS.airline.map((name) => ({ id: name, name, nameAr: translateValue(name, 'ar') })), 'airlines');
  // The demo airlines have no real ids: never offer them while the API is working.
  const airlines = airlinesOffline && !offline ? [] : airlineDirectory;
  const can = WRITE_ACTIONS[kind];
  const [rows, setRows] = useState<ResourceRow[]>(fetched.rows);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<ResourceDraft>(() => createDraft());
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const attempt = useRef(0); // bumped when the modal closes/changes, so a late response cannot write into a newer modal
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);

  // Computed from the API. Hotel and car booking APIs do not exist yet, and GET /api/cars only returns available cars,
  // so everything it cannot answer is labelled, never shown as zero.
  const flightStats = useMemo(() => bookingMetrics(bookings, 'flight'), [bookings]);
  const flightTrends = useMemo(() => monthlyMetrics(bookings, new Date().getFullYear(), 'flight'), [bookings]);
  const flightState = { loading: bookingsStatus === 'loading', noData: bookingsOffline && !offline };
  const count = (value: number) => format.number(value);
  const metrics = kind === 'flight'
    ? [
        { label: t('totalFlights'), value: flightStats.bookings, render: count, series: flightTrends.bookings, ...flightState },
        { label: t('flightRevenue'), value: flightStats.revenue, render: (value: number) => <Money sar={value} />, series: flightTrends.revenue, ...flightState },
        { label: t('activeUsers'), value: flightStats.users, render: count, series: flightTrends.users, ...flightState },
      ]
    : kind === 'hotel'
      ? [{ label: t('totalRooms'), noData: true }, { label: t('hotelRevenue'), noData: true }, { label: t('guests'), noData: true }]
      : [{ label: t('totalCars'), noData: true }, { label: t('carsRevenue'), noData: true }, { label: t('availableCars'), value: fetched.total, render: count, loading: loadStatus === 'loading' }];
  const needle = query.toLowerCase();
  const filtered = useMemo(() => rows.filter((row) => `${row.id} ${translateValue(row.id, lang)} ${translateValue(row.airline ?? '', lang)} ${row.airline ?? ''} ${row.airlineAr ?? ''} ${getRowDetails(kind, row, lang)}`.toLowerCase().includes(needle)), [rows, needle, lang, kind]);
  const displayId = (row: ResourceRow) => kind === 'flight' ? <Ltr>{row.id}</Ltr> : translateValue(row.id, lang);
  const columns = resourceColumns({
    kind, t, lang, format, displayId, can,
    onEdit: (id) => openModal('edit', id),
    onRemove: (id) => openModal('remove', id),
  });

  useEffect(() => { setRows(fetched.rows); }, [fetched]);

  useEffect(() => {
    setQuery('');
    setModal(null);
    setSelectedId('');
    setFormError('');
  }, [kind]);

  useEffect(() => {
    if (!modal) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [modal]);

  function closeModal() {
    attempt.current += 1;
    setSubmitting(false);
    const finish = () => {
      setClosing(false);
      setModal(null);
      setSelectedId('');
      setFormError('');
      setFieldErrors({});
    };
    // A short fade out; nothing to wait for when the user prefers reduced motion.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }
    setClosing(true);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(finish, 130);
  }

  function openModal(mode: ModalMode, id = '') {
    window.clearTimeout(closeTimer.current);
    setClosing(false);
    attempt.current += 1;
    setSubmitting(false);
    setFieldErrors({});
    setModal(mode);
    setSelectedId(id);
    setDraft(createDraft(rows.find((row) => row.id === id)));
    setFormError('');
  }

  function selectRow(id: string) {
    setFieldErrors({});
    setSelectedId(id);
    setDraft(createDraft(rows.find((row) => row.id === id)));
    setFormError('');
  }

  function updateDraft(field: Exclude<keyof ResourceDraft, 'seats'>, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined })); // clear this field's message as soon as it is edited
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

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal || submitting) return;
    const mode = modal;

    // 1. Client-side validation: nothing is sent while a required field is empty or invalid.
    const errors = validateDraft(kind, mode, draft, selectedId, rows, airlines.length, t);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError(t('requiredField'));
      document.querySelector<HTMLElement>('.modal-form [aria-invalid="true"]')?.focus();
      return;
    }
    setFormError('');

    const recordId = mode === 'add' ? draft.id.trim() : selectedId;
    const row = toRow(kind, { ...draft, id: recordId }, airlines);
    const existing = rows.find((r) => r.id === selectedId);
    const apiId = existing?.apiId ?? selectedId;
    const ticket = ++attempt.current;
    let created: string | number | undefined;

    // 2. Call the backend. In demo mode (no server reachable) the change stays local, as before.
    if (!offline) {
      setSubmitting(true);
      try {
        if (kind === 'flight') {
          if (mode === 'add') {
            created = (await flightService.create({
              flightNumber: row.id, airlineId: draft.airline, from: draft.from.trim().toUpperCase(), to: draft.to.trim().toUpperCase(),
              departureTime: row.departureTime ?? '', arrivalTime: row.arrivalTime ?? '', basePrice: row.price,
              seats: draft.seats.map((seat) => ({ seatCode: seat.seatCode.trim().toUpperCase(), ticketClass: seat.ticketClass, priceMultiplier: Number(seat.priceMultiplier) })),
            })).apiId;
          } else if (mode === 'edit') {
            // PATCH only accepts basePrice and departureTime: send whichever of the two changed.
            const changes: FlightUpdateInput = {};
            if (row.price !== existing?.price) changes.basePrice = row.price;
            if (draft.departureTime !== isoToRiyadhLocal(existing?.departureTime ?? '')) changes.departureTime = row.departureTime;
            if (Object.keys(changes).length > 0) await flightService.update(apiId, changes);
          } else await flightService.remove(apiId);
        } else if (kind === 'hotel') {
          const input = { name: row.id, city: row.city ?? '', room: row.room ?? '', price: row.price, status: row.status };
          if (mode === 'add') created = (await hotelService.create(input)).apiId;
          else if (mode === 'edit') await hotelService.update(apiId, input);
          else await hotelService.remove(apiId);
        } else {
          const input = { name: row.id, location: row.location ?? '', availability: row.availability ?? '', price: row.price, status: row.status };
          if (mode === 'add') created = (await carService.create(input)).apiId;
          else if (mode === 'edit') await carService.update(apiId, input);
          else await carService.remove(apiId);
        }
      } catch (error) {
        // 3. Failure (400, 409, 5xx, network...): keep the modal open with the admin's input intact and say exactly why.
        const message = serverErrorText(error, t);
        console.warn('[api] save failed:', parseApiError(error), error);
        notify({ tone: 'error', titleKey: mode === 'remove' ? 'removeFailedTitle' : 'actionFailedTitle', messageKey: 'actionFailed', params: { message } });
        if (attempt.current === ticket) { setFormError(message); setSubmitting(false); }
        return;
      }
    }

    if (mode === 'remove') setRows((current) => current.filter((r) => r.id !== selectedId));
    else if (mode === 'add') setRows((current) => [...current, created !== undefined ? { ...row, apiId: created } : row]);
    else if (kind === 'flight') setRows((current) => current.map((r) => r.id === selectedId ? { ...r, price: row.price, departureTime: row.departureTime } : r));
    else setRows((current) => current.map((r) => r.id === selectedId ? { ...r, ...row } : r));

    // The admin action succeeded: show the toast (and add it to the bell menu).
    notify({
      tone: mode === 'remove' ? 'warning' : 'success',
      titleKey: noticeKeys[mode].title,
      messageKey: noticeKeys[mode].message,
      params: { noun: { key: singular[kind] }, id: recordId },
    });
    if (attempt.current === ticket) closeModal();
  }

  const noun = t(singular[kind]);
  const title = modal ? `${t(actionKey[modal])} ${noun}` : '';

  return (
    <Layout>
      <section className="page-panel">
        <PageHeader
          section={t(sectionKey[kind])}
          title={t(heading[kind])}
          subtitle={t(subtitleKey[kind])}
          badges={<>
            <ContextBadge>{t('recordsCount', { count: format.number(Math.max(fetched.total, rows.length)) })}</ContextBadge>
            {offline && <ContextBadge tone="warning">{t('demoBadge')} · {reason}</ContextBadge>}
          </>}
          actions={
            <>
              <SuggestSearch value={query} onChange={setQuery} placeholder={t('search')} testId={`input-${kind}-search`}
              matches={filtered} getKey={(row) => row.id} pickValue={(row) => row.id}
              renderItem={(row) => <><span className="search-suggestion-id">{displayId(row)}</span><span className="search-suggestion-details">{getRowDetails(kind, row, lang)}</span></>} />
              {can.add && <button className="button button-primary" onClick={() => openModal('add')} data-testid={`button-add-${kind}`}><Plus size={15} aria-hidden="true" />{t('add')} {noun}</button>}
            </>
          }
        />

        <div className="metric-grid">
          {metrics.map((metric) => <StatCard key={metric.label} {...metric} />)}
        </div>

        {/* Add sits by the title and Edit on each row (the edit form keeps its record chooser). Remove returns here once a DELETE route exists. */}
        {can.remove && <div className="action-row">
          {can.remove && <button className="button button-soft" onClick={() => openModal('remove')} data-testid={`button-remove-${kind}`}><Trash2 size={15} aria-hidden="true" />{t('remove')} {noun}</button>}
        </div>}

        <section className="section-card">
          <div className="table-wrap overflow-x-auto w-full rounded-xl" tabIndex={0} role="region" aria-label={t(heading[kind])}>
            {loadStatus === 'loading' ? <TableSkeleton columns={columns.length} /> : loadStatus === 'error' ? <ErrorState onRetry={reload} /> : filtered.length === 0
              ? <EmptyState message={query ? t('noResults') : t(emptyKey[kind])} actionLabel={query ? t('clearSearch') : undefined} onAction={() => setQuery('')} />
              : <DataTable caption={t(heading[kind])} columns={columns} rows={filtered} getKey={(row) => row.id} minWidth={0} stackOnPhone />}
          </div>
        </section>
      </section>

      {modal && (
        <div className={`modal-backdrop${closing ? ' is-closing' : ''}`} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="resource-modal-title">
            <div className="modal-header">
              <div><span className="modal-eyebrow">{t(heading[kind])}</span><h2 id="resource-modal-title">{title}</h2></div>
              <button className="modal-close" onClick={closeModal} aria-label={t('close')}>×</button>
            </div>
            <form className="modal-form" onSubmit={saveRecord} noValidate aria-busy={submitting}>
              {modal !== 'add' && (
                <label className="modal-field">
                  <span>{t('chooseRecord')}</span>
                  <select className="select-control" value={selectedId} onChange={(event) => selectRow(event.target.value)} aria-label={t('chooseRecord')} aria-invalid={Boolean(fieldErrors.selectedId)} disabled={submitting} data-testid={`select-${modal}-${kind}-record`}>
                    <option value="">{t('selectRecord')}</option>
                    {rows.map((row) => <option value={row.id} key={row.id}>{translateValue(row.id, lang)} — {getRowDetails(kind, row, lang)}</option>)}
                  </select>
                  {fieldErrors.selectedId && <small className="field-error" role="alert">{fieldErrors.selectedId}</small>}
                </label>
              )}
              {modal !== 'remove' && kind === 'flight' && (
                <>
                  {modal === 'add' && (
                    <section className="modal-section">
                      <h3>{t('sectionFlight')}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label={t('flightNumber')} value={draft.id} onChange={(value) => updateDraft('id', value)} error={fieldErrors.id} required ltr />
                        <SelectField label={t('airline')} value={draft.airline} onChange={(value) => updateDraft('airline', value)} options={airlines.map((a) => a.id)} getLabel={(id) => { const a = airlines.find((x) => x.id === id); return (lang === 'ar' ? a?.nameAr : a?.name) ?? id; }} placeholder={t('select')} error={fieldErrors.airline} required testId="select-flight-airline" />
                        <Field label={t('fromAirport')} value={draft.from} onChange={(value) => updateDraft('from', value)} error={fieldErrors.from} required ltr testId="input-flight-from" />
                        <Field label={t('toAirport')} value={draft.to} onChange={(value) => updateDraft('to', value)} error={fieldErrors.to} required ltr testId="input-flight-to" />
                      </div>
                    </section>
                  )}
                  <section className="modal-section">
                    <h3>{t('sectionSchedule')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label={`${t('departureTime')} (${t('riyadhTime')})`} type="datetime-local" value={draft.departureTime} onChange={(value) => updateDraft('departureTime', value)} error={fieldErrors.departureTime} required ltr testId="input-flight-departure" />
                      {modal === 'add' && <Field label={`${t('arrivalTime')} (${t('riyadhTime')})`} type="datetime-local" value={draft.arrivalTime} onChange={(value) => updateDraft('arrivalTime', value)} error={fieldErrors.arrivalTime} required ltr testId="input-flight-arrival" />}
                    </div>
                  </section>
                  <section className="modal-section">
                    <h3>{t('sectionPrice')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label={t('basePrice')} type="number" min="0" value={draft.price} onChange={(value) => updateDraft('price', value)} error={fieldErrors.price} required ltr testId="input-record-price" />
                    </div>
                  </section>
                </>
              )}
              {modal !== 'remove' && kind !== 'flight' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {modal === 'add' && <SelectField label={kind === 'hotel' ? t('hotelName') : t('carModel')} value={draft.id} onChange={(value) => updateDraft('id', value)} options={kind === 'hotel' ? OPTIONS.hotelName : OPTIONS.carModel} getLabel={(v) => translateValue(v, lang)} placeholder={t('select')} error={fieldErrors.id} required />}
                  {kind === 'hotel' && (
                    <>
                      <SelectField label={t('city')} value={draft.city} onChange={(value) => updateDraft('city', value)} options={OPTIONS.city} getLabel={(v) => translateValue(v, lang)} placeholder={t('select')} error={fieldErrors.city} required />
                      <SelectField label={t('roomType')} value={draft.room} onChange={(value) => updateDraft('room', value)} options={OPTIONS.room} getLabel={(v) => translateValue(v, lang)} placeholder={t('select')} error={fieldErrors.room} required />
                    </>
                  )}
                  {kind === 'car' && (
                    <>
                      <SelectField label={t('location')} value={draft.location} onChange={(value) => updateDraft('location', value)} options={OPTIONS.city} getLabel={(v) => translateValue(v, lang)} placeholder={t('select')} error={fieldErrors.location} required />
                      <SelectField label={t('availability')} value={draft.availability} onChange={(value) => updateDraft('availability', value)} options={OPTIONS.availability} getLabel={(v) => translateValue(v, lang)} placeholder={t('select')} error={fieldErrors.availability} required />
                    </>
                  )}
                  <Field label={t('priceSar')} type="number" min="0" value={draft.price} onChange={(value) => updateDraft('price', value)} error={fieldErrors.price} required ltr testId="input-record-price" />
                  <SelectField label={t('status')} value={draft.status} onChange={(value) => updateDraft('status', value)} options={OPTIONS.status} getLabel={(v) => statusLabel(v, t)} placeholder={t('select')} error={fieldErrors.status} required />
                </div>
              )}
              {kind === 'flight' && modal === 'add' && (
                <fieldset className="modal-section modal-seats">
                  <legend>{t('flightSeats')} *</legend>
                  {draft.seats.map((seat, index) => (
                    <div className="modal-seat-row" key={seat.key}>
                      <Field label={t('seatCode')} value={seat.seatCode} onChange={(value) => updateSeat(index, { seatCode: value })} error={fieldErrors[`seatCode${index}`]} required ltr testId={`input-seat-code-${index}`} />
                      <SelectField label={t('ticketClass')} value={seat.ticketClass} onChange={(value) => updateSeat(index, { ticketClass: value as TicketClass })} options={[...TICKET_CLASSES]} getLabel={(v) => t(`ticket${v as TicketClass}`)} placeholder={t('select')} required testId={`select-seat-class-${index}`} />
                      <Field label={t('priceMultiplier')} type="number" min="0" step="0.01" value={seat.priceMultiplier} onChange={(value) => updateSeat(index, { priceMultiplier: value })} error={fieldErrors[`priceMultiplier${index}`]} required ltr testId={`input-seat-multiplier-${index}`} />
                      <button type="button" className="button button-ghost button-ghost-danger modal-seat-remove" onClick={() => changeSeats(draft.seats.filter((_, i) => i !== index))} aria-label={`${t('removeSeat')} ${seat.seatCode}`} title={t('removeSeat')} data-testid={`button-remove-seat-${index}`}><Trash2 size={14} aria-hidden="true" /></button>
                    </div>
                  ))}
                  {fieldErrors.seats && <small className="field-error" role="alert">{fieldErrors.seats}</small>}
                  <button type="button" className="button button-ghost modal-seat-add" onClick={() => changeSeats([...draft.seats, newSeat()])} data-testid="button-add-seat"><Plus size={14} aria-hidden="true" />{t('addSeat')}</button>
                </fieldset>
              )}
              {modal === 'remove' && <p className="modal-warning">{selectedId ? <>{t('removeRecordConfirm')} <bdi>{translateValue(selectedId, lang)}</bdi></> : t('selectRecordFirst')}</p>}
              {formError && <p className="form-error" role="alert" data-testid="modal-form-error">{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="button button-ghost" onClick={closeModal} disabled={submitting}>{t('cancel')}</button>
                <button type="submit" className={`button ${modal === 'remove' ? 'button-danger' : 'button-primary'}`} disabled={submitting} data-testid={`button-confirm-${modal}-${kind}`}>{submitting ? t('saving') : modal === 'remove' ? t('remove') : modal === 'add' ? t('add') : t('saveChanges')}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </Layout>
  );
}

type ColumnOptions = {
  kind: Kind;
  t: ReturnType<typeof useT>;
  lang: Language;
  format: Formatters;
  displayId: (row: ResourceRow) => ReactNode;
  can: Record<ModalMode, boolean>;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
};

/** Edit / Remove buttons of one row. */
function RowActions({ kind, row, t, can, onEdit, onRemove }: Pick<ColumnOptions, 'kind' | 't' | 'can' | 'onEdit' | 'onRemove'> & { row: ResourceRow }) {
  return (
    <div className="row-actions flex flex-row items-center justify-center gap-3">
      {can.edit && <button className="button button-ghost" onClick={() => onEdit(row.id)} data-testid={`button-edit-${kind}-${row.id}`}><Pencil size={14} aria-hidden="true" />{t('edit')}</button>}
      {can.remove && <button className="button button-ghost button-ghost-danger" onClick={() => onRemove(row.id)} data-testid={`button-remove-${kind}-${row.id}`}><Trash2 size={14} aria-hidden="true" />{t('remove')}</button>}
    </div>
  );
}

/**
 * Columns of the Flights / Hotels / Cars tables. The header and the cells come from this one list.
 * Flights: number | airline | route | departure | price | actions. Flights have no status or cabin class in the schema.
 * Hotels / Cars: name | details | price | status, plus actions once WRITE_ACTIONS allows them.
 */
function resourceColumns({ kind, t, lang, format, displayId, can, onEdit, onRemove }: ColumnOptions): Column<ResourceRow>[] {
  const actions: Column<ResourceRow> = { key: 'actions', width: '', header: t('actions'), align: 'end', cell: (row) => <RowActions kind={kind} row={row} t={t} can={can} onEdit={onEdit} onRemove={onRemove} /> };
  const hasActions = can.edit || can.remove;
  const details = (row: ResourceRow) => getRowDetails(kind, row, lang);
  const price: Column<ResourceRow> = { key: 'price', width: '', header: t('price'), align: 'end', cell: (row) => <Money sar={row.price} /> };

  if (kind === 'flight') {
    const airlineName = (row: ResourceRow) => (lang === 'ar' ? row.airlineAr || translateValue(row.airline ?? '', lang) : row.airline) || '—';
    return [
      { key: 'name', width: '14%', header: t('flightNumber'), cell: displayId },
      { key: 'airline', width: '18%', header: t('airline'), cell: airlineName },
      { key: 'details', width: '18%', header: t('route'), cell: details },
      { key: 'departure', width: '20%', header: t('departureTime'), muted: true, cell: (row) => (row.departureTime ? format.dateTime(isoToRiyadhLocal(row.departureTime)) : '—') },
      { ...price, width: '14%' },
      { ...actions, width: '16%' },
    ];
  }
  const columns: Column<ResourceRow>[] = [
    { key: 'name', width: hasActions ? '20%' : '28%', header: kind === 'hotel' ? t('hotelName') : t('carModel'), cell: displayId },
    { key: 'details', width: hasActions ? '24%' : '36%', header: kind === 'hotel' ? t('cityRoom') : t('locationAvailability'), cell: details },
    { ...price, width: hasActions ? '14%' : '18%' },
    { key: 'status', width: hasActions ? '14%' : '18%', header: t('status'), align: 'center', cell: (row) => <StatusBadge status={row.status} /> },
  ];
  if (hasActions) columns.push({ ...actions, width: '28%' });
  return columns;
}

function Field({ label, value, onChange, type = 'text', min, step, required = false, ltr = false, error, testId }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; step?: string; required?: boolean; ltr?: boolean; error?: string; testId?: string }) {
  return (
    <label className="modal-field">
      <span>{label}{required && ' *'}</span>
      <input className="input-control" type={type} min={min} step={step} data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} aria-required={required} aria-invalid={Boolean(error)} dir={ltr ? 'ltr' : undefined} />
      {error && <small className="field-error" role="alert">{error}</small>}
    </label>
  );
}

function SelectField({ label, value, onChange, options, getLabel, placeholder, required = false, error, testId }: { label: string; value: string; onChange: (value: string) => void; options: string[]; getLabel: (value: string) => string; placeholder: string; required?: boolean; error?: string; testId?: string }) {
  return (
    <label className="modal-field">
      <span>{label}{required && ' *'}</span>
      <select className="select-control" value={value} onChange={(event) => onChange(event.target.value)} aria-required={required} aria-invalid={Boolean(error)} data-testid={testId}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{getLabel(option)}</option>)}
      </select>
      {error && <small className="field-error" role="alert">{error}</small>}
    </label>
  );
}