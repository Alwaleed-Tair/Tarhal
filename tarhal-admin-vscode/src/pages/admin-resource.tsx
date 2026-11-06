import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { CABIN_CLASSES, initialResources, type CabinClass, type ResourceRow, type Service } from '@/data/demoData';
import { DataTable, type Column } from '@/components/data-table';
import { Layout } from '@/components/layout';
import { ContextBadge, PageHeader } from '@/components/page-header';
import { SuggestSearch } from '@/components/suggest-search';
import { EmptyState } from '@/components/empty-state';
import { Ltr } from '@/components/ltr';
import { ErrorState } from '@/components/error-state';
import { Money } from '@/components/money';
import { StatusBadge } from '@/components/status-badge';
import { Spinner } from '@/components/spinner';
import { useLiveData } from '@/hooks/use-live-data';
import { parseApiError } from '@/services/api';
import { flightService } from '@/services/flightService';
import { hotelService } from '@/services/hotelService';
import { carService } from '@/services/carService';
import type { Language, TranslationKey } from '@/i18n/translations';
import { statusLabel, translateValue } from '@/i18n/labels';
import type { Formatters } from '@/i18n/format';
import { useFormat, useT } from '@/i18n/use-i18n';
import { notify } from '@/store/notificationStore';
import { useDemoState } from '@/store/demoStore';

// Stored values stay in English; labels are translated on display (see `translateValue`).
const OPTIONS = {
  airline: ['Saudia', 'Flynas', 'Flyadeal', 'Emirates', 'Qatar Airways'],
  route: ['RUH → JED', 'RUH → DXB', 'JED → CAI', 'RUH → AMM'],
  city: ['Riyadh', 'Jeddah', 'Dubai', 'Amman', 'Doha', 'Cairo'],
  room: ['King Suite', 'Deluxe', 'Twin Room', 'Standard Room'],
  availability: ['Available Now', 'Limited', 'Booked'],
  hotelName: ['Hilton Garden', 'The Boulevard', 'Mövenpick'],
  carModel: ['Toyota Camry', 'Kia Carnival', 'BMW 3 Series', 'Nissan Patrol', 'Hyundai Sonata'],
  status: ['Available', 'Limited', 'Scheduled', 'Boarding', 'Booked'],
};

type Kind = Service;

const loaders: Record<Kind, () => Promise<ResourceRow[]>> = {
  flight: () => flightService.adminList(),
  hotel: () => hotelService.list({ page: 1, pageSize: 100 }).then((r) => r.rows),
  car: () => carService.list({ page: 1, pageSize: 100 }).then((r) => r.rows),
};
type ModalMode = 'add' | 'edit' | 'remove';
type ResourceDraft = { id: string; airline: string; cabinClass: string; route: string; city: string; room: string; location: string; availability: string; price: string; status: string };

const heading: Record<Kind, TranslationKey> = { flight: 'flightManagement', hotel: 'hotelManagement', car: 'carManagement' };
const singular: Record<Kind, TranslationKey> = { flight: 'flightSingular', hotel: 'hotelSingular', car: 'carSingular' };
const sectionKey: Record<Kind, TranslationKey> = { flight: 'flights', hotel: 'hotels', car: 'cars' };
const subtitleKey: Record<Kind, TranslationKey> = { flight: 'flightsSubtitle', hotel: 'hotelsSubtitle', car: 'carsSubtitle' };
const actionKey: Record<ModalMode, TranslationKey> = { add: 'add', edit: 'edit', remove: 'remove' };
const noticeKeys: Record<ModalMode, { title: TranslationKey; message: TranslationKey }> = {
  add: { title: 'recordAddedTitle', message: 'recordAdded' },
  edit: { title: 'recordUpdatedTitle', message: 'recordUpdated' },
  remove: { title: 'recordRemovedTitle', message: 'recordRemoved' },
};

function createDraft(row?: ResourceRow): ResourceDraft {
  return { id: row?.id ?? '', airline: row?.airline ?? '', cabinClass: row?.cabinClass ?? 'Economy', route: row?.route ?? '', city: row?.city ?? '', room: row?.room ?? '', location: row?.location ?? '', availability: row?.availability ?? '', price: String(row?.price ?? 150), status: row?.status ?? '' };
}

function toRow(kind: Kind, draft: ResourceDraft): ResourceRow {
  const base = { id: draft.id.trim(), price: Number(draft.price), status: draft.status.trim() || 'Available' };
  if (kind === 'flight') return { ...base, airline: draft.airline.trim(), route: draft.route.trim(), cabinClass: (draft.cabinClass || 'Economy') as CabinClass };
  if (kind === 'hotel') return { ...base, city: draft.city.trim(), room: draft.room.trim() };
  return { ...base, location: draft.location.trim(), availability: draft.availability.trim() };
}

function getRowDetails(kind: Kind, row: ResourceRow, language: Language): string {
  if (kind === 'flight') return translateValue(row.route ?? '', language);
  if (kind === 'hotel') return `${translateValue(row.city ?? '', language)} · ${translateValue(row.room ?? '', language)}`;
  return `${translateValue(row.location ?? '', language)} · ${translateValue(row.availability ?? '', language)}`;
}

type FieldName = keyof ResourceDraft | 'selectedId';
type FieldErrors = Partial<Record<FieldName, string>>;

/** Client-side checks that run before anything is sent. Returns one message per invalid field. */
function validateDraft(kind: Kind, mode: ModalMode, draft: ResourceDraft, selectedId: string, rows: ResourceRow[], t: ReturnType<typeof useT>): FieldErrors {
  const errors: FieldErrors = {};
  const required = t('fieldRequired');
  if (mode !== 'add' && !selectedId) errors.selectedId = t('selectRecordFirst');
  if (mode === 'remove') return errors;
  if (mode === 'add') {
    if (!draft.id.trim()) errors.id = required;
    else if (rows.some((row) => row.id.toLowerCase() === draft.id.trim().toLowerCase())) errors.id = t('duplicateRecord');
  }
  if (kind === 'flight') {
    if (!draft.airline) errors.airline = required;
    if (!draft.route) errors.route = required;
    if (!draft.cabinClass) errors.cabinClass = required;
  } else if (kind === 'hotel') {
    if (!draft.city) errors.city = required;
    if (!draft.room) errors.room = required;
  } else {
    if (!draft.location) errors.location = required;
    if (!draft.availability) errors.availability = required;
  }
  if (!draft.price.trim()) errors.price = required;
  else if (!Number.isFinite(Number(draft.price)) || Number(draft.price) < 0) errors.price = t('priceInvalid');
  if (!draft.status.trim()) errors.status = required;
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
  const { data: fetched, status: loadStatus, offline, reason, reload } = useLiveData(() => loaders[kind](), () => initialResources[kind], kind);
  const { data: airlineDirectory } = useLiveData(() => flightService.airlineDirectory(), () => OPTIONS.airline.map((name) => ({ id: undefined as string | number | undefined, name })), 'airlines');
  const airlineOptions = airlineDirectory.map((airline) => airline.name);
  const [rows, setRows] = useState<ResourceRow[]>(fetched);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState<ResourceDraft>(() => createDraft());
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const attempt = useRef(0); // bumped when the modal closes/changes, so a late response cannot write into a newer modal

  const labels = kind === 'flight' ? [t('totalFlights'), t('flightRevenue'), t('activeUsers')] : kind === 'hotel' ? [t('totalRooms'), t('hotelRevenue'), t('guests')] : [t('totalCars'), t('carsRevenue'), t('availableCars')];
  const needle = query.toLowerCase();
  const filtered = rows.filter((row) => `${row.id} ${translateValue(row.id, lang)} ${translateValue(row.airline ?? '', lang)} ${row.airline ?? ''} ${row.cabinClass ?? ''} ${getRowDetails(kind, row, lang)}`.toLowerCase().includes(needle));
  const displayId = (row: ResourceRow) => kind === 'flight' ? <Ltr>{row.id}</Ltr> : translateValue(row.id, lang);
  const columns = resourceColumns({
    kind, t, lang, format, displayId,
    onEdit: (id) => openModal('edit', id),
    onRemove: (id) => openModal('remove', id),
  });

  useEffect(() => { setRows(fetched); }, [fetched]);

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
    setModal(null);
    setSelectedId('');
    setFormError('');
    setFieldErrors({});
    setSubmitting(false);
  }

  function openModal(mode: ModalMode, id = '') {
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

  function updateDraft(field: keyof ResourceDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined })); // clear this field's message as soon as it is edited
    setFormError('');
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal || submitting) return;
    const mode = modal;

    // 1. Client-side validation: nothing is sent while a required field is empty or invalid.
    const errors = validateDraft(kind, mode, draft, selectedId, rows, t);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError(t('requiredField'));
      document.querySelector<HTMLElement>('.modal-form [aria-invalid="true"]')?.focus();
      return;
    }
    setFormError('');

    const recordId = mode === 'add' ? draft.id.trim() : selectedId;
    const row = toRow(kind, { ...draft, id: recordId });
    const existing = rows.find((r) => r.id === selectedId);
    const apiId = existing?.apiId ?? selectedId;
    const ticket = ++attempt.current;
    let created: string | number | undefined;

    // 2. Call the backend. In demo mode (no server reachable) the change stays local, as before.
    if (!offline) {
      setSubmitting(true);
      try {
        if (kind === 'flight') {
          const input = { flightNumber: row.id, airline: row.airline ?? '', airlineId: airlineDirectory.find((a) => a.name === row.airline)?.id, route: row.route ?? '', cabinClass: row.cabinClass ?? 'Economy', price: row.price, status: row.status };
          if (mode === 'add') created = (await flightService.create(input)).apiId;
          else if (mode === 'edit') await flightService.update(apiId, input);
          else await flightService.remove(apiId);
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
            <ContextBadge>{t('recordsCount', { count: format.number(rows.length) })}</ContextBadge>
            {offline && <ContextBadge tone="warning">{t('demoBadge')} · {reason}</ContextBadge>}
          </>}
          actions={
            <SuggestSearch value={query} onChange={setQuery} placeholder={t('search')} testId={`input-${kind}-search`}
              matches={filtered} getKey={(row) => row.id} pickValue={(row) => row.id}
              renderItem={(row) => <><span className="search-suggestion-id">{displayId(row)}</span><span className="search-suggestion-details">{getRowDetails(kind, row, lang)}</span></>} />
          }
        />

        <div className="metric-grid">
          <Metric label={labels[0]} value={format.number(1284)} />
          <Metric label={labels[1]} value={<Money usd={142670} />} />
          <Metric label={labels[2]} value={format.number(3280)} />
        </div>

        <div className="action-row">
          <button className="button button-soft" onClick={() => openModal('add')} data-testid={`button-add-${kind}`}><Plus size={15} aria-hidden="true" />{t('add')} {noun}</button>
          <button className="button button-soft" onClick={() => openModal('edit')} data-testid={`button-edit-${kind}`}><Pencil size={15} aria-hidden="true" />{t('edit')} {noun}</button>
          <button className="button button-soft" onClick={() => openModal('remove')} data-testid={`button-remove-${kind}`}><Trash2 size={15} aria-hidden="true" />{t('remove')} {noun}</button>
        </div>

        <section className="section-card">
          <div className="table-wrap overflow-x-auto w-full rounded-xl" tabIndex={0} role="region" aria-label={t(heading[kind])}>
            {loadStatus === 'loading' ? <Spinner /> : loadStatus === 'error' ? <ErrorState onRetry={reload} /> : <>
            <DataTable caption={t(heading[kind])} columns={columns} rows={filtered} getKey={(row) => row.id} minWidth={kind === 'flight' ? 1100 : 1000} />
            {filtered.length === 0 && <EmptyState message={t('noResults')} actionLabel={query ? t('clearSearch') : undefined} onAction={() => setQuery('')} />}
            </>}
          </div>
        </section>
      </section>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
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
              {modal !== 'remove' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {modal === 'add' && (kind === 'flight'
                    ? <Field label={t('flightNumber')} value={draft.id} onChange={(value) => updateDraft('id', value)} error={fieldErrors.id} required ltr />
                    : <SelectField label={kind === 'hotel' ? t('hotelName') : t('carModel')} value={draft.id} onChange={(value) => updateDraft('id', value)} options={kind === 'hotel' ? OPTIONS.hotelName : OPTIONS.carModel} getLabel={(v) => translateValue(v, lang)} placeholder={t('select')} error={fieldErrors.id} required />)}
                  {kind === 'flight' && <SelectField label={t('airline')} value={draft.airline} onChange={(value) => updateDraft('airline', value)} options={airlineOptions} getLabel={(v) => translateValue(v, lang)} placeholder={t('select')} error={fieldErrors.airline} required />}
                  {kind === 'flight' && <SelectField label={t('route')} value={draft.route} onChange={(value) => updateDraft('route', value)} options={OPTIONS.route} getLabel={(v) => translateValue(v, lang)} placeholder={t('select')} error={fieldErrors.route} required />}
                  {kind === 'flight' && <SelectField label={t('cabinClass')} value={draft.cabinClass} onChange={(value) => updateDraft('cabinClass', value)} options={CABIN_CLASSES} getLabel={(v) => translateValue(v, lang)} placeholder={t('select')} error={fieldErrors.cabinClass} required />}
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
                  <Field label={`${t('price')} (USD)`} type="number" min="0" value={draft.price} onChange={(value) => updateDraft('price', value)} error={fieldErrors.price} required ltr />
                  <SelectField label={t('status')} value={draft.status} onChange={(value) => updateDraft('status', value)} options={OPTIONS.status} getLabel={(v) => statusLabel(v, t)} placeholder={t('select')} error={fieldErrors.status} required />
                </div>
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
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
};

/** Edit / Remove buttons of one row. */
function RowActions({ kind, row, t, onEdit, onRemove }: Pick<ColumnOptions, 'kind' | 't' | 'onEdit' | 'onRemove'> & { row: ResourceRow }) {
  return (
    <div className="row-actions flex flex-row items-center justify-center gap-3">
      <button className="button button-ghost" onClick={() => onEdit(row.id)} data-testid={`button-edit-${kind}-${row.id}`}><Pencil size={14} aria-hidden="true" />{t('edit')}</button>
      <button className="button button-ghost button-ghost-danger" onClick={() => onRemove(row.id)} data-testid={`button-remove-${kind}-${row.id}`}><Trash2 size={14} aria-hidden="true" />{t('remove')}</button>
    </div>
  );
}

/**
 * Columns of the Flights / Hotels / Cars tables. Each table has exactly 5 columns:
 * name or number | details | price | status | actions. The header and the cells come from this one list.
 * Flights have a dedicated Airline column; the cabin class is a small second line under the route.
 */
function resourceColumns({ kind, t, lang, displayId, onEdit, onRemove }: ColumnOptions): Column<ResourceRow>[] {
  const isFlight = kind === 'flight';
  const nameHeader = isFlight ? t('flightNumber') : kind === 'hotel' ? t('hotelName') : t('carModel');
  const detailsHeader = isFlight ? t('route') : kind === 'hotel' ? t('cityRoom') : t('locationAvailability');
  // Flights: number | airline | route | price | status | actions. Hotels / Cars: name | details | price | status | actions.
  const width = isFlight ? ['14%', '16%', '20%', '12%', '13%', '25%'] : ['20%', '24%', '14%', '14%', '28%'];

  const columns: Column<ResourceRow>[] = [{ key: 'name', width: width[0], header: nameHeader, cell: (row) => displayId(row) }];
  if (isFlight) columns.push({ key: 'airline', width: width[1], header: t('airline'), cell: (row) => (row.airline ? translateValue(row.airline, lang) : '—') });

  const i = isFlight ? 2 : 1; // index of the "details" width
  columns.push(
    {
      key: 'details', width: width[i], header: detailsHeader,
      cell: (row) => isFlight
        ? <>{getRowDetails(kind, row, lang)}{row.cabinClass && <span className="cell-sub">{translateValue(row.cabinClass, lang)}</span>}</>
        : getRowDetails(kind, row, lang),
    },
    { key: 'price', width: width[i + 1], header: t('price'), align: 'end', cell: (row) => <Money usd={row.price} /> },
    { key: 'status', width: width[i + 2], header: t('status'), align: 'center', cell: (row) => <StatusBadge status={row.status} /> },
    { key: 'actions', width: width[i + 3], header: t('actions'), align: 'end', cell: (row) => <RowActions kind={kind} row={row} t={t} onEdit={onEdit} onRemove={onRemove} /> },
  );
  return columns;
}

function Field({ label, value, onChange, type = 'text', min, required = false, ltr = false, error }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; required?: boolean; ltr?: boolean; error?: string }) {
  return (
    <label className="modal-field">
      <span>{label}{required && ' *'}</span>
      <input className="input-control" type={type} min={min} value={value} onChange={(event) => onChange(event.target.value)} aria-required={required} aria-invalid={Boolean(error)} dir={ltr ? 'ltr' : undefined} />
      {error && <small className="field-error" role="alert">{error}</small>}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return <div className="metric-card h-auto overflow-visible py-6"><span className="metric-label">{label}</span><strong className="metric-value block leading-tight">{value}</strong></div>;
}

function SelectField({ label, value, onChange, options, getLabel, placeholder, required = false, error }: { label: string; value: string; onChange: (value: string) => void; options: string[]; getLabel: (value: string) => string; placeholder: string; required?: boolean; error?: string }) {
  return (
    <label className="modal-field">
      <span>{label}{required && ' *'}</span>
      <select className="select-control" value={value} onChange={(event) => onChange(event.target.value)} aria-required={required} aria-invalid={Boolean(error)}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{getLabel(option)}</option>)}
      </select>
      {error && <small className="field-error" role="alert">{error}</small>}
    </label>
  );
}