// Admin data access against Olga.Core /v1/admin/*. With useMocks (local only) the same
// functions run against in-memory data; mocks are imported lazily so they never ship otherwise.
import { mocksEnabled, request } from './client';
import type {
  AdminEvent, AdminMember, Attendee, DashboardStats, EventInput, ModerationReport, PrivacyRequest,
  PrivacyStatus, ProfileStatus, ReportStatus, Venue, VenueInput,
} from './types';

const mock = () => import('./mock');
const itemPath = (resource: string, id: string) => `/v1/admin/${resource}/${encodeURIComponent(id)}`;

export async function getDashboardStats(): Promise<DashboardStats> {
  return mocksEnabled() ? (await mock()).stats() : request('GET', '/v1/admin/stats');
}

export async function getMembers(): Promise<AdminMember[]> {
  return mocksEnabled() ? (await mock()).list('members') : request('GET', '/v1/admin/members');
}

export async function setMemberStatus(memberId: string, profileStatus: ProfileStatus): Promise<AdminMember> {
  if (mocksEnabled()) return (await mock()).patch('members', 'memberId', memberId, { profileStatus });
  return request('PATCH', itemPath('members', memberId), { profileStatus });
}

export async function getEvents(): Promise<AdminEvent[]> {
  return mocksEnabled() ? (await mock()).list('events') : request('GET', '/v1/admin/events');
}

export async function createEvent(input: EventInput, publish: boolean): Promise<AdminEvent> {
  if (mocksEnabled()) return (await mock()).createEvent(input, publish);
  return request('POST', '/v1/admin/events', { ...input, publish });
}

export async function updateEvent(eventId: string, input: EventInput): Promise<AdminEvent> {
  if (mocksEnabled()) return (await mock()).patch('events', 'eventId', eventId, input);
  return request('PUT', itemPath('events', eventId), input);
}

export async function publishEvent(eventId: string): Promise<AdminEvent> {
  if (mocksEnabled()) return (await mock()).patch('events', 'eventId', eventId, { status: 'PUBLISHED' });
  return request('POST', `${itemPath('events', eventId)}/publish`);
}

export async function cancelEvent(eventId: string): Promise<AdminEvent> {
  if (mocksEnabled()) return (await mock()).patch('events', 'eventId', eventId, { status: 'CANCELLED' });
  return request('POST', `${itemPath('events', eventId)}/cancel`);
}

export async function getAttendees(eventId: string): Promise<Attendee[]> {
  return mocksEnabled() ? [] : request('GET', `${itemPath('events', eventId)}/attendees`);
}

export async function getVenues(): Promise<Venue[]> {
  return mocksEnabled() ? (await mock()).list('venues') : request('GET', '/v1/admin/venues');
}

export async function createVenue(input: VenueInput): Promise<Venue> {
  if (mocksEnabled()) return (await mock()).createVenue(input);
  return request('POST', '/v1/admin/venues', input);
}

export async function getReports(): Promise<ModerationReport[]> {
  return mocksEnabled() ? (await mock()).list('reports') : request('GET', '/v1/admin/reports');
}

export async function setReportStatus(reportId: string, status: ReportStatus): Promise<ModerationReport> {
  if (mocksEnabled()) return (await mock()).patch('reports', 'reportId', reportId, { status });
  return request('PATCH', itemPath('reports', reportId), { status });
}

export async function getPrivacyRequests(): Promise<PrivacyRequest[]> {
  return mocksEnabled() ? (await mock()).list('privacyRequests') : request('GET', '/v1/admin/privacy-requests');
}

export async function setPrivacyRequestStatus(privacyRequestId: string, status: PrivacyStatus): Promise<PrivacyRequest> {
  if (mocksEnabled()) return (await mock()).patch('privacyRequests', 'privacyRequestId', privacyRequestId, { status });
  return request('PATCH', itemPath('privacy-requests', privacyRequestId), { status });
}
