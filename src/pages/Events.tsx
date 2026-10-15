import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { cancelEvent, createEvent, getAttendees, getEvents, getVenues, publishEvent, updateEvent } from '../api/admin';
import { EVENT_STATUSES, type AdminEvent, type EventInput, type EventStatus } from '../api/types';
import { Pagination, usePagination } from '../components/Pagination';
import { useConfirm, useToast } from '../components/feedback';
import { Icon } from '../components/icons';
import { VenueForm } from './Venues';
import { Badge, Modal, PageHeader, QueryState, errorMessage, fmtDate, fromLocalInput, toLocalInput } from '../components/ui';

export function Events() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EventStatus | ''>('');
  const [editing, setEditing] = useState<AdminEvent | null>(null);
  const [viewing, setViewing] = useState<AdminEvent | null>(null);
  const creating = params.get('new') === '1';
  const events = useQuery({ queryKey: ['events'], queryFn: getEvents });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['events'] }); qc.invalidateQueries({ queryKey: ['stats'] }); };
  const transition = useMutation({
    mutationFn: ({ e, action }: { e: AdminEvent; action: 'publish' | 'cancel' }) => (action === 'publish' ? publishEvent : cancelEvent)(e.eventId),
    onSuccess: (_, { e, action }) => { toast('success', `${e.name} ${action === 'publish' ? 'published' : 'cancelled'}`); refresh(); },
    onError: (err) => toast('error', `Update failed: ${errorMessage(err)}`),
  });

  const q = search.trim().toLowerCase();
  const rows = [...(events.data ?? [])]
    .filter((e) => (!status || e.status === status) && (!q || e.name.toLowerCase().includes(q) || (e.venue ?? '').toLowerCase().includes(q)))
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
  const { pageRows, ...pager } = usePagination(rows);

  const publish = async (e: AdminEvent) => {
    const ok = await confirm({ title: `Publish ${e.name}?`, message: 'It becomes visible in the app and members can register.', confirmLabel: 'Publish' });
    if (ok) transition.mutate({ e, action: 'publish' });
  };
  const cancel = async (e: AdminEvent) => {
    const ok = await confirm({ title: `Cancel ${e.name}?`, message: 'It disappears from the app and everyone live at the event is switched off. This cannot be undone.', confirmLabel: 'Cancel event', danger: true });
    if (ok) transition.mutate({ e, action: 'cancel' });
  };
  const closeForm = () => { setEditing(null); if (creating) setParams({}, { replace: true }); };

  return (
    <>
      <PageHeader title="Events" subtitle="Create, publish and manage networking events"
        actions={<button className="btn btn-primary" onClick={() => setParams({ new: '1' })}><Icon name="plus" /> New event</button>} />
      <section className="card">
        <div className="toolbar">
          <input type="search" aria-label="Search events" placeholder="Search by name or venue" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="tabs" role="group" aria-label="Filter by status">
            {(['', ...EVENT_STATUSES] as const).map((s) => (
              <button key={s || 'all'} aria-pressed={status === s} onClick={() => setStatus(s)}>{s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All'}</button>
            ))}
          </div>
        </div>
        <QueryState isLoading={events.isLoading} error={events.error} empty={events.isSuccess && rows.length === 0}
          emptyText={events.data?.length ? 'No events match these filters.' : 'No events yet. Create your first one.'} emptyIcon="calendar" />
        {rows.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Event</th><th>When</th><th>Attendees</th><th>Live mode</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {pageRows.map((e) => {
                  const editable = e.status !== 'CANCELLED' && e.status !== 'COMPLETED';
                  return (
                    <tr key={e.eventId}>
                      <td><strong>{e.name}</strong><span className="sub">{e.venue ?? 'Venue TBC'}</span></td>
                      <td>{fmtDate(e.startsAt)}<span className="sub">until {fmtDate(e.endsAt)}</span></td>
                      <td>{e.attendeeCount}{e.liveCount > 0 && <span className="sub"><span className="live-dot" />{e.liveCount} live</span>}</td>
                      <td>{e.liveModeEnabled ? 'Enabled' : 'Off'}</td>
                      <td><Badge value={e.status} /></td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-sm" onClick={() => setViewing(e)}><Icon name="eye" /> View</button>
                          {editable && <button className="btn btn-sm" onClick={() => setEditing(e)}><Icon name="edit" /> Edit</button>}
                          {e.status === 'DRAFT' && <button className="btn btn-sm btn-primary" disabled={transition.isPending} onClick={() => void publish(e)}><Icon name="send" /> Publish</button>}
                          {editable && <button className="btn btn-sm btn-danger" disabled={transition.isPending} onClick={() => void cancel(e)}><Icon name="ban" /> Cancel</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...pager} />
      </section>
      {(creating || editing) && <EventForm event={editing} onClose={closeForm} onSaved={refresh} />}
      {viewing && <EventDetail event={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

function EventForm({ event, onClose, onSaved }: { event: AdminEvent | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const venues = useQuery({ queryKey: ['venues'], queryFn: getVenues });
  const [form, setForm] = useState(() => {
    // New events default to 09:00-17:00 one week out.
    const start = new Date(Date.now() + 7 * 86_400_000); start.setHours(9, 0, 0, 0);
    return {
      name: event?.name ?? '',
      description: event?.description ?? '',
      startsAt: toLocalInput(event?.startsAt ?? start.toISOString()),
      endsAt: toLocalInput(event?.endsAt ?? new Date(start.getTime() + 8 * 3_600_000).toISOString()),
      venueId: event?.venueId ?? '',
      liveModeEnabled: event?.liveModeEnabled ?? true,
    };
  });
  const [error, setError] = useState<string | null>(null);
  const [addingVenue, setAddingVenue] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: ({ input, publish }: { input: EventInput; publish: boolean }) => (event ? updateEvent(event.eventId, input) : createEvent(input, publish)),
    onSuccess: (saved, { publish }) => {
      toast('success', event ? `${saved.name} updated` : `${saved.name} ${publish ? 'published' : 'saved as draft'}`);
      onSaved();
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const submit = (e: FormEvent, publish = false) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError('Event name is required.'); return; }
    if (new Date(form.endsAt) <= new Date(form.startsAt)) { setError('End time must be after the start time.'); return; }
    save.mutate({
      publish,
      input: {
        name: form.name.trim(), description: form.description.trim() || null,
        startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt),
        venueId: form.venueId || null, liveModeEnabled: form.liveModeEnabled,
      },
    });
  };

  return (
    <Modal title={event ? 'Edit event' : 'New event'} subtitle={event ? event.eventId : 'Save as a draft, or publish straight to the app'} onClose={onClose} wide>
      <form className="form" onSubmit={(e) => submit(e)} noValidate>
        <label className="full">Event name
          <input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={250} required autoFocus placeholder="e.g. Pune Founders Mixer" />
        </label>
        <label className="full">Description <span className="hint">Optional, up to 2000 characters</span>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} />
        </label>
        <label>Starts
          <input type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} required />
        </label>
        <label>Ends
          <input type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} required />
        </label>
        <label className="full">Venue <span className="hint">Missing one? <button type="button" className="link-btn" style={{ padding: 0 }} onClick={() => setAddingVenue(true)}>Add a venue</button></span>
          <select value={form.venueId} onChange={(e) => set('venueId', e.target.value)}>
            <option value="">Venue to be confirmed</option>
            {(venues.data ?? []).filter((v) => v.status === 'ACTIVE').map((v) => (
              <option key={v.venueId} value={v.venueId}>{v.name}{v.city ? `, ${v.city}` : ''}</option>
            ))}
          </select>
        </label>
        <label className="full check">
          <input type="checkbox" checked={form.liveModeEnabled} onChange={(e) => set('liveModeEnabled', e.target.checked)} />
          Allow Live Mode (members can go live and get matched at this event)
        </label>
        {error && <p className="form-error full" role="alert">{error}</p>}
        <div className="dialog-actions full">
          <button type="button" className="btn" onClick={onClose}>Close</button>
          {event ? (
            <button type="submit" className="btn btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</button>
          ) : <>
            <button type="submit" className="btn" disabled={save.isPending}>Save draft</button>
            <button type="button" className="btn btn-primary" disabled={save.isPending} onClick={(e) => submit(e, true)}><Icon name="send" /> Publish now</button>
          </>}
        </div>
      </form>
      {addingVenue && <VenueForm onClose={() => setAddingVenue(false)} onCreated={(v) => set('venueId', v.venueId)} />}
    </Modal>
  );
}

function EventDetail({ event, onClose }: { event: AdminEvent; onClose: () => void }) {
  const attendees = useQuery({ queryKey: ['attendees', event.eventId], queryFn: () => getAttendees(event.eventId) });
  return (
    <Modal title={event.name} subtitle={event.venue ?? 'Venue TBC'} onClose={onClose} wide>
      <div className="detail-grid">
        <div><span>Status</span><Badge value={event.status} /></div>
        <div><span>Starts</span><strong>{fmtDate(event.startsAt)}</strong></div>
        <div><span>Ends</span><strong>{fmtDate(event.endsAt)}</strong></div>
        <div><span>Attendees</span><strong>{event.attendeeCount}</strong></div>
        <div><span>Live now</span><strong>{event.liveCount}</strong></div>
      </div>
      {event.description && <p className="muted">{event.description}</p>}
      <div className="card">
        <div className="card-head"><h2>Attendees</h2></div>
        <QueryState isLoading={attendees.isLoading} error={attendees.error} empty={attendees.isSuccess && attendees.data.length === 0}
          emptyText="Nobody has registered yet." emptyIcon="users" />
        {!!attendees.data?.length && (
          <div className="table-wrap" style={{ maxHeight: 320 }}>
            <table>
              <thead><tr><th>Member</th><th>Registered</th><th>Status</th></tr></thead>
              <tbody>
                {attendees.data.map((a) => (
                  <tr key={a.memberId}>
                    <td>{a.isLive && <span className="live-dot" title="Live now" />}<strong>{a.displayName}</strong><span className="sub">{a.headline ?? a.memberId}</span></td>
                    <td>{fmtDate(a.registeredAt)}</td>
                    <td><Badge value={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
