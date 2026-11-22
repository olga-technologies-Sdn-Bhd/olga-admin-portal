import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getAttendees, getEvents, getMembers, getPrivacyRequests, getReports, getSciApprovals } from '../api/admin';
import { Badge, PageHeader, QueryState, fmtDate } from '../components/ui';

const back = (to: string, label: string) => <Link className="btn" to={to}>← {label}</Link>;

function Missing({ loading, label }: { loading: boolean; label: string }) {
  return <QueryState isLoading={loading} error={null} empty={!loading} emptyText={`${label} could not be found.`} />;
}

export function EventDetails() {
  const { id = '' } = useParams();
  const events = useQuery({ queryKey: ['events'], queryFn: getEvents });
  const event = events.data?.find((value) => value.eventId === id);
  const attendees = useQuery({ queryKey: ['attendees', id], queryFn: () => getAttendees(id), enabled: Boolean(event) });
  if (!event) return <Missing loading={events.isLoading} label="Event" />;
  return <>
    <PageHeader title={event.name} subtitle={event.eventId} actions={back('/events', 'Back to events')} />
    <section className="card pad detail-page">
      <div className="detail-grid">
        <div><span>Status</span><Badge value={event.status} /></div><div><span>Venue</span><strong>{event.venue ?? 'To be confirmed'}</strong></div>
        <div><span>Starts</span><strong>{fmtDate(event.startsAt)}</strong></div><div><span>Ends</span><strong>{fmtDate(event.endsAt)}</strong></div>
        <div><span>Attendees</span><strong>{event.attendeeCount}</strong></div><div><span>Live now</span><strong>{event.liveCount}</strong></div>
      </div>
      {event.description && <p>{event.description}</p>}
    </section>
    <section className="card"><div className="card-head"><h2>Attendees</h2></div>
      <QueryState isLoading={attendees.isLoading} error={attendees.error} empty={attendees.isSuccess && attendees.data.length === 0} emptyText="Nobody has registered yet." emptyIcon="users" />
      {!!attendees.data?.length && <div className="table-wrap"><table><thead><tr><th>Member</th><th>Registered</th><th>Status</th></tr></thead><tbody>
        {attendees.data.map((value) => <tr key={value.memberId}><td><strong>{value.displayName}</strong><span className="sub">{value.headline ?? value.memberId}</span></td><td>{fmtDate(value.registeredAt)}</td><td><Badge value={value.status} /></td></tr>)}
      </tbody></table></div>}
    </section>
  </>;
}

export function MemberDetails() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['members'], queryFn: getMembers });
  const value = query.data?.find((item) => item.memberId === id);
  if (!value) return <Missing loading={query.isLoading} label="Person" />;
  return <><PageHeader title={value.displayName || 'Unnamed member'} subtitle={value.memberId} actions={back('/members', 'Back to people')} />
    <section className="card pad detail-page"><div className="detail-grid">
      <div><span>Status</span><Badge value={value.profileStatus} /></div><div><span>Role</span><strong>{value.roleCategory ?? '—'}</strong></div>
      <div><span>Visibility</span><strong>{value.visibility}</strong></div><div><span>Profile complete</span><strong>{Math.round(value.completenessScore)}%</strong></div>
      <div><span>Joined</span><strong>{fmtDate(value.createdAt)}</strong></div><div><span>Last updated</span><strong>{fmtDate(value.updatedAt)}</strong></div>
    </div>{value.headline && <p>{value.headline}</p>}</section></>;
}

export function ModerationDetails() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['reports'], queryFn: getReports });
  const value = query.data?.find((item) => item.reportId === id);
  if (!value) return <Missing loading={query.isLoading} label="Report" />;
  return <><PageHeader title="Moderation report" subtitle={value.reportId} actions={back('/moderation', 'Back to moderation')} />
    <section className="card pad detail-page"><div className="detail-grid">
      <div><span>Status</span><Badge value={value.status} /></div><div><span>Priority</span><Badge value={value.priority} /></div>
      <div><span>Subject</span><strong>{value.subjectDisplayName ?? value.subjectMemberId ?? 'Unknown'}</strong></div><div><span>Source</span><strong>{value.sourceType.replace(/_/g, ' ').toLowerCase()}</strong></div>
      <div><span>Resource</span><strong>{value.resourceType ?? '—'}</strong></div><div><span>Reported</span><strong>{fmtDate(value.createdAt)}</strong></div>
    </div></section></>;
}

export function PrivacyDetails() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['privacy'], queryFn: getPrivacyRequests });
  const value = query.data?.find((item) => item.privacyRequestId === id);
  if (!value) return <Missing loading={query.isLoading} label="Privacy request" />;
  return <><PageHeader title="Privacy request" subtitle={value.privacyRequestId} actions={back('/privacy', 'Back to requests')} />
    <section className="card pad detail-page"><div className="detail-grid">
      <div><span>Status</span><Badge value={value.status} /></div><div><span>Type</span><strong>{value.requestType.replace(/_/g, ' ').toLowerCase()}</strong></div>
      <div><span>Member</span><strong>{value.memberId}</strong></div><div><span>Received</span><strong>{fmtDate(value.createdAt)}</strong></div>
      <div><span>Due</span><strong>{fmtDate(value.dueAt)}</strong></div><div><span>Completed</span><strong>{fmtDate(value.completedAt)}</strong></div>
    </div></section></>;
}

export function SciChangeDetails() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['sci-approvals'], queryFn: getSciApprovals });
  const value = query.data?.items.find((item) => item.changeApprovalId === id);
  if (!value) return <Missing loading={query.isLoading} label="SCI change" />;
  return <><PageHeader title={value.changeType.replace(/_/g, ' ').toLowerCase()} subtitle={value.changeApprovalId} actions={back('/sci', 'Back to governance')} />
    <section className="card pad detail-page"><div className="detail-grid">
      <div><span>Status</span><Badge value={value.status} /></div><div><span>Resource</span><strong>{value.resourceId}</strong></div>
      <div><span>Requested by</span><strong>{value.requestedBy}</strong></div><div><span>Requested</span><strong>{fmtDate(value.requestedAt)}</strong></div>
      <div><span>Approved by</span><strong>{value.approvedBy ?? '—'}</strong></div><div><span>Applied</span><strong>{fmtDate(value.appliedAt)}</strong></div>
    </div><h2>Proposed payload</h2><pre className="payload-preview">{JSON.stringify(value.payload, null, 2)}</pre></section></>;
}
