// Mirrors Olga.Core.Contracts admin records (camelCased by the API client).
// Status values match the database check constraints.

export type ProfileStatus = 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'HIDDEN';
export const PROFILE_STATUSES: ProfileStatus[] = ['ACTIVE', 'DRAFT', 'PENDING_REVIEW', 'HIDDEN'];

export interface AdminMember {
  memberId: string;
  displayName: string;
  headline: string | null;
  roleCategory: string | null;
  profileStatus: ProfileStatus;
  visibility: string;
  completenessScore: number;
  createdAt: string;
  updatedAt: string;
}

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export const EVENT_STATUSES: EventStatus[] = ['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

export interface AdminEvent {
  eventId: string;
  communityId: string;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  liveModeEnabled: boolean;
  venueId: string | null;
  venue: string | null;
  attendeeCount: number;
  liveCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventInput {
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  venueId: string | null;
  liveModeEnabled: boolean;
}

export interface Attendee {
  memberId: string;
  displayName: string;
  headline: string | null;
  status: string;
  registeredAt: string;
  checkedInAt: string | null;
  isLive: boolean;
}

export interface Venue {
  venueId: string;
  name: string;
  countryCode: string;
  region: string | null;
  city: string | null;
  timezoneId: string;
  status: string;
  createdAt: string;
}

export interface VenueInput {
  name: string;
  countryCode: string;
  timezoneId: string;
  city: string | null;
  region: string | null;
}

export type ReportStatus = 'OPEN' | 'TRIAGED' | 'ACTIONED' | 'CLOSED';

export interface ModerationReport {
  reportId: string;
  sourceType: string;
  subjectMemberId: string | null;
  subjectDisplayName: string | null;
  resourceType: string | null;
  resourceId: string | null;
  priority: string;
  status: ReportStatus;
  createdAt: string;
  closedAt: string | null;
}

export type PrivacyStatus = 'OPEN' | 'VERIFIED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

export interface PrivacyRequest {
  privacyRequestId: string;
  memberId: string;
  requestType: string;
  status: PrivacyStatus;
  createdAt: string;
  dueAt: string | null;
  verifiedAt: string | null;
  completedAt: string | null;
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  upcomingEvents: number;
  openReports: number;
  pendingPrivacyRequests: number;
  connectionsLast7Days: number;
}
