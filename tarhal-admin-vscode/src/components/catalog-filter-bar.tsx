import { X } from 'lucide-react';
import { Field, SelectField } from '@/components/form-fields';
import { SarSymbol } from '@/components/money';
import type { Service } from '@/data/demoData';
import { useT } from '@/i18n/use-i18n';
import type { CatalogFilters, FilterKey, FilterProblems } from '@/lib/catalog-query';
import { TRANSMISSIONS } from '@/services/carService';

type Props = {
  kind: Exclude<Service, 'flight'>;
  filters: CatalogFilters;
  problems: FilterProblems;
  /** Cities seen so far, offered as suggestions. The API only matches a full city name. */
  cities: string[];
  onChange: (key: FilterKey, value: string) => void;
  onClear: () => void;
};

/** Filter inputs of the admin Hotels and Cars pages. The page sends them to the API; nothing is filtered in the browser. */
export function CatalogFilterBar({ kind, filters, problems, cities, onChange, onClear }: Props) {
  const t = useT();
  const active = Object.values(filters).some(Boolean);
  const error = (key: FilterKey) => { const problem = problems[key]; return problem && t(problem); };
  const priceLabel = (text: string) => <span className="label-with-symbol">{text} <SarSymbol /></span>;
  const listId = `filter-cities-${kind}`;
  const field = (key: FilterKey) => ({ value: filters[key], onChange: (value: string) => onChange(key, value), error: error(key), testId: `filter-${key}` });

  return (
    <form className="filter-bar" role="search" aria-label={t('filtersLabel')} onSubmit={(event) => event.preventDefault()}>
      <Field label={t('city')} list={listId} maxLength={100} hint={t('cityHint')} {...field('city')} />
      <datalist id={listId}>{cities.map((city) => <option key={city} value={city} />)}</datalist>
      <Field label={priceLabel(t('filterMinPrice'))} inputMode="decimal" ltr {...field('minPrice')} />
      <Field label={priceLabel(t('filterMaxPrice'))} inputMode="decimal" ltr {...field('maxPrice')} />
      {kind === 'hotel' && <Field label={t('filterMinRating')} inputMode="decimal" ltr {...field('minRating')} />}
      {kind === 'car' && <>
        <SelectField label={t('filterTransmission')} options={[...TRANSMISSIONS]} getLabel={(value) => t(value === 'MANUAL' ? 'manual' : 'automatic')} placeholder={t('anyOption')} {...field('transmission')} />
        <Field label={t('filterMinSeats')} inputMode="numeric" ltr {...field('minSeats')} />
      </>}
      {active && <button type="button" className="button button-ghost filter-bar-clear" onClick={onClear} data-testid="button-clear-filters"><X size={14} aria-hidden="true" />{t('clearFilters')}</button>}
    </form>
  );
}
