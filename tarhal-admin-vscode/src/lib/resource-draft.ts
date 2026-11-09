import type { ResourceRow, Service } from '@/data/demoData';
import { isoToRiyadhLocal, riyadhLocalToIso } from '@/i18n/format';
import type { useT } from '@/i18n/use-i18n';
import type { CarInput, Transmission } from '@/services/carService';
import type { FlightCreateInput, FlightUpdateInput, TicketClass } from '@/services/flightService';
import type { HotelInput } from '@/services/hotelService';

// The text an admin is typing in the Add/Edit form, the checks on it, and the request bodies built from it.
// Every field comes from prisma/schema.prisma; the limits copy its column types: Decimal(10,2) prices, Decimal(4,2) seat multipliers.

export type ModalMode = 'add' | 'edit' | 'remove';
export type SeatDraft = { key: number; seatCode: string; ticketClass: TicketClass; priceMultiplier: string };
export type ResourceDraft = {
  flightNumber: string; airlineId: string; from: string; to: string; departureTime: string; arrivalTime: string; seats: SeatDraft[];
  price: string; city: string; imageUrl: string;
  name: string; address: string; roomType: string; rating: string;
  make: string; model: string; year: string; seatCount: string; category: string; transmission: Transmission; insurance: string; isAvailable: boolean;
};
export type FieldName = Exclude<keyof ResourceDraft, 'isAvailable'> | 'selectedId' | `seatCode${number}` | `priceMultiplier${number}`;
export type FieldErrors = Partial<Record<FieldName, string>>;

let seatKey = 0;
export const newSeat = (): SeatDraft => ({ key: ++seatKey, seatCode: '', ticketClass: 'ECONOMY', priceMultiplier: '1' });

/** Stable identity of a table row: flight numbers are unique, hotel and car names are not. */
export const rowKey = (row: ResourceRow) => String(row.apiId ?? row.id);

export function createDraft(row?: ResourceRow): ResourceDraft {
  return {
    flightNumber: row?.id ?? '', airlineId: row?.airlineId ?? '', from: '', to: '',
    departureTime: isoToRiyadhLocal(row?.departureTime ?? ''), arrivalTime: isoToRiyadhLocal(row?.arrivalTime ?? ''), seats: [newSeat()],
    price: row ? String(row.price) : '', city: row?.city ?? '', imageUrl: row?.imageUrl ?? '',
    name: row?.id ?? '', address: row?.address ?? '', roomType: row?.roomType ?? '', rating: row?.rating === undefined ? '' : String(row.rating),
    make: row?.make ?? '', model: row?.model ?? '', year: row?.year === undefined ? '' : String(row.year), seatCount: row?.seats === undefined ? '' : String(row.seats),
    category: row?.category ?? '', transmission: row?.transmission === 'MANUAL' ? 'MANUAL' : 'AUTOMATIC',
    insurance: row?.insurancePricePerDay === undefined ? '0' : String(row.insurancePricePerDay), isAvailable: row?.isAvailable ?? true,
  };
}

const PRICE = /^\d{1,8}(\.\d{1,2})?$/;
const validPrice = (value: string) => PRICE.test(value.trim()) && Number(value) > 0;

/** Checks that run before anything is sent. Returns one message per invalid field. */
export function validateDraft(kind: Service, mode: ModalMode, draft: ResourceDraft, selected: ResourceRow | undefined, rows: ResourceRow[], airlineCount: number, t: ReturnType<typeof useT>): FieldErrors {
  const errors: FieldErrors = {};
  const required = t('fieldRequired');
  const need = (field: FieldName & keyof ResourceDraft) => { if (!String(draft[field]).trim()) errors[field] = required; };
  if (mode !== 'add' && !selected) errors.selectedId = t('selectRecordFirst');
  if (mode === 'remove') return errors;

  if (!draft.price.trim()) errors.price = required;
  else if (!validPrice(draft.price)) errors.price = t('priceInvalid');

  if (kind === 'flight') {
    validateFlight(mode, draft, selected, rows, airlineCount, errors, t);
  } else if (kind === 'hotel') {
    need('name'); need('city'); need('roomType');
    if (!draft.rating.trim()) errors.rating = required;
    else if (!(Number(draft.rating) >= 1 && Number(draft.rating) <= 5)) errors.rating = t('ratingInvalid');
  } else {
    need('make'); need('model'); need('category'); need('city');
    const maxYear = new Date().getFullYear() + 1, year = Number(draft.year);
    if (!draft.year.trim()) errors.year = required;
    else if (!Number.isInteger(year) || year < 1900 || year > maxYear) errors.year = t('yearInvalid', { max: maxYear });
    const seats = Number(draft.seatCount);
    if (!draft.seatCount.trim()) errors.seatCount = required;
    else if (!Number.isInteger(seats) || seats < 1 || seats > 100) errors.seatCount = t('seatCountInvalid');
    if (!PRICE.test(draft.insurance.trim())) errors.insurance = t('insuranceInvalid');
  }
  return errors;
}

function validateFlight(mode: ModalMode, draft: ResourceDraft, selected: ResourceRow | undefined, rows: ResourceRow[], airlineCount: number, errors: FieldErrors, t: ReturnType<typeof useT>) {
  const required = t('fieldRequired');
  const departure = draft.departureTime ? Date.parse(riyadhLocalToIso(draft.departureTime)) : NaN;
  const departureChanged = mode === 'add' || draft.departureTime !== isoToRiyadhLocal(selected?.departureTime ?? '');
  if (!draft.departureTime) errors.departureTime = required;
  else if (departureChanged && departure <= Date.now()) errors.departureTime = t('departureInFuture'); // Flight search refuses past dates.
  if (mode !== 'add') {
    // PATCH cannot change the arrival time, so a new departure has to stay before the existing arrival.
    if (!errors.departureTime && selected?.arrivalTime && departure >= Date.parse(selected.arrivalTime)) errors.departureTime = t('arrivalAfterDeparture');
    return;
  }
  const number = draft.flightNumber.trim().toUpperCase();
  if (!number) errors.flightNumber = required;
  else if (!/^[A-Z0-9-]+$/.test(number)) errors.flightNumber = t('flightNumberInvalid');
  else if (rows.some((row) => row.id.toUpperCase() === number)) errors.flightNumber = t('errDuplicateFlightNumber');
  if (!draft.airlineId) errors.airlineId = airlineCount > 0 ? required : t('airlinesUnavailable');
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
    else if (!/^[A-Z0-9-]{1,10}$/.test(code)) errors[`seatCode${index}`] = t('seatCodeInvalid');
    else if (seen.has(code)) errors[`seatCode${index}`] = t('seatDuplicate');
    seen.add(code);
    const multiplier = Number(seat.priceMultiplier);
    if (!/^\d{1,2}(\.\d{1,2})?$/.test(seat.priceMultiplier.trim()) || multiplier <= 0) errors[`priceMultiplier${index}`] = t('multiplierInvalid');
  });
}

/** Body of POST /api/admin/flights, exactly as Omar's task lists it. */
export function flightBody(draft: ResourceDraft): FlightCreateInput {
  return {
    flightNumber: draft.flightNumber.trim().toUpperCase(), airlineId: draft.airlineId, from: draft.from.trim().toUpperCase(), to: draft.to.trim().toUpperCase(),
    departureTime: riyadhLocalToIso(draft.departureTime), arrivalTime: riyadhLocalToIso(draft.arrivalTime), basePrice: Number(draft.price),
    seats: draft.seats.map((seat) => ({ seatCode: seat.seatCode.trim().toUpperCase(), ticketClass: seat.ticketClass, priceMultiplier: Number(seat.priceMultiplier) })),
  };
}

/** Body of PATCH /api/admin/flights/:id: the API only updates these two fields, so send whichever changed. */
export function flightChanges(draft: ResourceDraft, row: ResourceRow): FlightUpdateInput {
  const changes: FlightUpdateInput = {};
  if (Number(draft.price) !== row.price) changes.basePrice = Number(draft.price);
  if (draft.departureTime !== isoToRiyadhLocal(row.departureTime ?? '')) changes.departureTime = riyadhLocalToIso(draft.departureTime);
  return changes;
}

export function hotelBody(draft: ResourceDraft): HotelInput {
  return {
    name: draft.name.trim(), city: draft.city.trim(), roomType: draft.roomType.trim(), pricePerNight: Number(draft.price), rating: Number(draft.rating),
    ...(draft.address.trim() && { address: draft.address.trim() }), ...(draft.imageUrl.trim() && { imageUrl: draft.imageUrl.trim() }),
  };
}

export function carBody(draft: ResourceDraft): CarInput {
  return {
    make: draft.make.trim(), model: draft.model.trim(), year: Number(draft.year), seats: Number(draft.seatCount), category: draft.category.trim(), transmission: draft.transmission,
    city: draft.city.trim(), pricePerDay: Number(draft.price), insurancePricePerDay: Number(draft.insurance), isAvailable: draft.isAvailable,
    ...(draft.imageUrl.trim() && { imageUrl: draft.imageUrl.trim() }),
  };
}

/** Only the fields that differ from the saved record: what a PATCH needs to send. */
export function changedFields<T extends object>(next: T, saved: T): Partial<T> {
  return Object.fromEntries(Object.entries(next).filter(([key, value]) => value !== saved[key as keyof T])) as Partial<T>;
}
