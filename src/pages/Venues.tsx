import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { createVenue, getVenues } from '../api/admin';
import type { Venue } from '../api/types';
import { Pagination, usePagination } from '../components/Pagination';
import { useToast } from '../components/feedback';
import { Icon } from '../components/icons';
import { Badge, Modal, PageHeader, QueryState, errorMessage, fmtDate } from '../components/ui';

const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const zones: string[] = (Intl as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [browserZone, 'UTC'];

export function Venues() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const venues = useQuery({ queryKey: ['venues'], queryFn: getVenues });
  const q = search.trim().toLowerCase();
  const rows = (venues.data ?? []).filter((v) => !q || [v.name, v.city, v.region, v.countryCode].some((x) => x?.toLowerCase().includes(q)));
  const { pageRows, ...pager } = usePagination(rows);

  return (
    <>
      <PageHeader title="Venues" subtitle="Locations that events can be hosted at"
        actions={<button className="btn btn-primary" onClick={() => setParams({ new: '1' })}><Icon name="plus" /> New venue</button>} />
      <section className="card">
        <div className="toolbar">
          <input type="search" aria-label="Search venues" placeholder="Search name, city or country" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <QueryState isLoading={venues.isLoading} error={venues.error} empty={venues.isSuccess && rows.length === 0}
          emptyText="No venues yet. Add one to attach it to events." emptyIcon="pin" />
        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Venue</th><th>Location</th><th>Time zone</th><th>Status</th><th>Added</th></tr></thead>
              <tbody>
                {pageRows.map((v) => (
                  <tr key={v.venueId}>
                    <td><strong>{v.name}</strong><span className="sub">{v.venueId}</span></td>
                    <td>{[v.city, v.region].filter(Boolean).join(', ') || '—'}<span className="sub">{v.countryCode}</span></td>
                    <td>{v.timezoneId}</td>
                    <td><Badge value={v.status} /></td>
                    <td>{fmtDate(v.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pager} />
      </section>
      {params.get('new') === '1' && <VenueForm onClose={() => setParams({}, { replace: true })} />}
    </>
  );
}

/** Also opened from the event form, which passes onCreated to select the new venue. */
export function VenueForm({ onClose, onCreated }: { onClose: () => void; onCreated?: (venue: Venue) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', city: '', region: '', countryCode: 'IN', timezoneId: browserZone });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = useMutation({
    mutationFn: () => createVenue({
      name: form.name.trim(), countryCode: form.countryCode.trim().toUpperCase(), timezoneId: form.timezoneId,
      city: form.city.trim() || null, region: form.region.trim() || null,
    }),
    onSuccess: async (v) => {
      toast('success', `${v.name} added`);
      await qc.invalidateQueries({ queryKey: ['venues'] });
      onCreated?.(v);
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError('Venue name is required.'); return; }
    if (!/^[a-z]{2}$/i.test(form.countryCode.trim())) { setError('Country must be a 2-letter code, e.g. IN or GB.'); return; }
    save.mutate();
  };

  return (
    <Modal title="New venue" subtitle="Venues can be picked when creating events" onClose={onClose} wide>
      <form className="form" onSubmit={submit} noValidate>
        <label className="full">Venue name
          <input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={200} autoFocus placeholder="e.g. Pune Convention Centre" />
        </label>
        <label>City<input value={form.city} onChange={(e) => set('city', e.target.value)} maxLength={120} /></label>
        <label>Region / state<input value={form.region} onChange={(e) => set('region', e.target.value)} maxLength={120} /></label>
        <label>Country code <span className="hint">ISO 2-letter</span>
          <input value={form.countryCode} onChange={(e) => set('countryCode', e.target.value)} maxLength={2} />
        </label>
        <label>Time zone
          <select value={form.timezoneId} onChange={(e) => set('timezoneId', e.target.value)}>
            {zones.map((z) => <option key={z}>{z}</option>)}
          </select>
        </label>
        {error && <p className="form-error full" role="alert">{error}</p>}
        <div className="dialog-actions full">
          <button type="button" className="btn" onClick={onClose}>Close</button>
          <button type="submit" className="btn btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Add venue'}</button>
        </div>
      </form>
    </Modal>
  );
}
