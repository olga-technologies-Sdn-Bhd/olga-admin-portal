import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDashboardStats, getEvents } from '../api/admin';
import { Icon } from '../components/icons';
import { Badge, PageHeader, QueryState, StatCard, fmtDate, useNow } from '../components/ui';

export function Dashboard() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: getDashboardStats });
  const events = useQuery({ queryKey: ['events'], queryFn: getEvents });
  const now = useNow();
  const upcoming = (events.data ?? [])
    .filter((e) => (e.status === 'PUBLISHED' || e.status === 'DRAFT') && Date.parse(e.endsAt) > now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, 5);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="What's happening across OL-GA today"
        actions={<Link to="/events?new=1" className="btn btn-primary"><Icon name="plus" /> New event</Link>} />
      <QueryState isLoading={stats.isLoading} error={stats.error} />
      {stats.data && (
        <div className="grid">
          <StatCard label="Total members" value={stats.data.totalMembers} icon="users" />
          <StatCard label="Active members" value={stats.data.activeMembers} icon="activity" tone="ok" />
          <StatCard label="Upcoming events" value={stats.data.upcomingEvents} icon="calendar" tone="info" />
          <StatCard label="Connections (7 days)" value={stats.data.connectionsLast7Days} icon="link" tone="primary" />
          <StatCard label="Open reports" value={stats.data.openReports} icon="flag" tone={stats.data.openReports ? 'bad' : 'ok'} />
          <StatCard label="Pending privacy requests" value={stats.data.pendingPrivacyRequests} icon="lock" tone={stats.data.pendingPrivacyRequests ? 'warn' : 'ok'} />
        </div>
      )}

      <section className="card">
        <div className="card-head"><h2>Quick actions</h2></div>
        <div className="quick-actions">
          <Link to="/events?new=1" className="quick-action"><span className="stat-icon tone-primary"><Icon name="calendar" /></span><div><strong>Create event</strong><span className="sub">Draft or publish a new event</span></div></Link>
          <Link to="/venues?new=1" className="quick-action"><span className="stat-icon tone-info"><Icon name="pin" /></span><div><strong>Add venue</strong><span className="sub">Register a new location</span></div></Link>
          <Link to="/moderation" className="quick-action"><span className="stat-icon tone-bad"><Icon name="shield" /></span><div><strong>Review reports</strong><span className="sub">Handle flagged members</span></div></Link>
          <Link to="/members" className="quick-action"><span className="stat-icon tone-ok"><Icon name="users" /></span><div><strong>Manage members</strong><span className="sub">Approve, hide or restore</span></div></Link>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>Upcoming events</h2><Link to="/events">View all</Link></div>
        <QueryState isLoading={events.isLoading} error={events.error} empty={events.isSuccess && upcoming.length === 0}
          emptyText="No upcoming events. Create one to get started." emptyIcon="calendar" />
        {upcoming.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Event</th><th>Starts</th><th>Attendees</th><th>Live now</th><th>Status</th></tr></thead>
              <tbody>
                {upcoming.map((e) => (
                  <tr key={e.eventId}>
                    <td><strong>{e.name}</strong><span className="sub">{e.venue ?? 'Venue TBC'}</span></td>
                    <td>{fmtDate(e.startsAt)}</td>
                    <td>{e.attendeeCount}</td>
                    <td>{e.liveCount > 0 ? <><span className="live-dot" />{e.liveCount}</> : '—'}</td>
                    <td><Badge value={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
