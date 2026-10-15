import type { AdminEvent, AdminMember, DashboardStats, EventInput, ModerationReport, PrivacyRequest, Venue, VenueInput } from './types';

const day = 86_400_000;
const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * day).toISOString();
const delay = <T,>(value: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(value)), 150));

const names = ['Aisha Khan', 'Ben Carter', 'Chloe Martin', 'Dev Patel', 'Elena Rossi', 'Farah Ali', 'George Lee', 'Hana Suzuki', 'Ivan Petrov', 'Julia Costa', 'Kofi Mensah', 'Lina Haddad'];
const roles = ['Engineering', 'Product', 'Design', 'Sales', 'Marketing', 'Founder'];
const statuses: AdminMember['profileStatus'][] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'DRAFT', 'HIDDEN'];

const members: AdminMember[] = names.map((n, i) => ({
  memberId: `mbr_${(1000 + i).toString(36)}`,
  displayName: n,
  headline: `${roles[i % roles.length]} lead`,
  roleCategory: roles[i % roles.length],
  profileStatus: statuses[i % statuses.length],
  visibility: 'MEMBERS',
  completenessScore: 25 * (1 + (i % 4)),
  createdAt: iso(-60 + i * 3),
  updatedAt: iso(-10 + i),
}));

const venues: Venue[] = [
  { venueId: 'ven_olympia', name: 'Olympia London', countryCode: 'GB', region: null, city: 'London', timezoneId: 'Europe/London', status: 'ACTIVE', createdAt: iso(-90) },
];

const event = (eventId: string, name: string, start: number, status: AdminEvent['status'], attendeeCount: number): AdminEvent => ({
  eventId, communityId: 'olga', name, description: null, startsAt: iso(start), endsAt: iso(start + 0.2), status,
  liveModeEnabled: true, venueId: 'ven_olympia', venue: 'Olympia London', attendeeCount, liveCount: 0, createdAt: iso(-30), updatedAt: iso(-1),
});
const events: AdminEvent[] = [
  event('evt_london_tech', 'London Tech Week Mixer', 3, 'PUBLISHED', 184),
  event('evt_design', 'Design Leaders Meetup', 21, 'DRAFT', 0),
  event('evt_ai_summit', 'AI Summit Networking', -5, 'COMPLETED', 312),
];

const reports: ModerationReport[] = [
  { reportId: 'case-001', sourceType: 'MEMBER_REPORT', subjectMemberId: members[4].memberId, subjectDisplayName: members[4].displayName, resourceType: 'PROFILE', resourceId: members[4].memberId, priority: 'NORMAL', status: 'OPEN', createdAt: iso(-1), closedAt: null },
];

const privacyRequests: PrivacyRequest[] = [
  { privacyRequestId: 'prv_001', memberId: members[3].memberId, requestType: 'EXPORT', status: 'OPEN', createdAt: iso(-2), dueAt: iso(28), verifiedAt: null, completedAt: null },
];

const data = { members, events, venues, reports, privacyRequests };
type Data = typeof data;
type Row<K extends keyof Data> = Data[K][number];

export const list = <K extends keyof Data>(k: K) => delay(data[k]);

export function patch<K extends keyof Data>(k: K, key: keyof Row<K>, value: string, changes: Partial<Row<K>>) {
  const row = (data[k] as Row<K>[]).find((x) => x[key] === value);
  if (!row) throw new Error('Not found');
  Object.assign(row, changes, { updatedAt: new Date().toISOString() });
  return delay(row);
}

export function createEvent(input: EventInput, publish: boolean) {
  const now = new Date().toISOString();
  const row: AdminEvent = {
    ...input, eventId: `evt_${crypto.randomUUID().slice(0, 8)}`, communityId: 'olga', status: publish ? 'PUBLISHED' : 'DRAFT',
    venue: venues.find((v) => v.venueId === input.venueId)?.name ?? null, attendeeCount: 0, liveCount: 0, createdAt: now, updatedAt: now,
  };
  events.push(row);
  return delay(row);
}

export function createVenue(input: VenueInput) {
  const row: Venue = { ...input, venueId: `ven_${crypto.randomUUID().slice(0, 8)}`, status: 'ACTIVE', createdAt: new Date().toISOString() };
  venues.push(row);
  return delay(row);
}

export function stats(): Promise<DashboardStats> {
  const now = Date.now();
  return delay({
    totalMembers: members.length,
    activeMembers: members.filter((m) => m.profileStatus === 'ACTIVE').length,
    upcomingEvents: events.filter((e) => e.status === 'PUBLISHED' && Date.parse(e.startsAt) > now).length,
    openReports: reports.filter((r) => r.status === 'OPEN' || r.status === 'TRIAGED').length,
    pendingPrivacyRequests: privacyRequests.filter((p) => p.status !== 'COMPLETED' && p.status !== 'REJECTED').length,
    connectionsLast7Days: 57,
  });
}
