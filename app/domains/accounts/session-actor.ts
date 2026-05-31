import type { EventScopedRole } from '~/domains/events/roles'

export interface SessionUserIdentity {
  sub: string
  email?: string | null
  email_verified?: boolean | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
  githubProfileUrl?: string | null
}

export interface PlatformUserProfile {
  id: string
  email: string
  displayName: string
  firstName: string
  familyName: string
  company?: string | null
  bio?: string | null
  isPlatformAdmin: boolean
  isEventOrganizer: boolean
  xProfileUrl?: string | null
  linkedinProfileUrl?: string | null
  githubProfileUrl?: string | null
  chatgptEmail?: string | null
  openaiOrgId?: string | null
  lumaEmail?: string | null
  lumaUsername?: string | null
  profileIconUpdatedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  deletedAt?: string | null
}

export interface OperationalUserSummary {
  id: string
  email: string
  displayName: string
  xProfileUrl?: string | null
  linkedinProfileUrl?: string | null
  githubProfileUrl?: string | null
  chatgptEmail?: string | null
  openaiOrgId?: string | null
  lumaEmail?: string | null
  lumaUsername?: string | null
  profileIconUpdatedAt?: string | null
}

export interface EventRoleSummary {
  eventId: string
  role: EventScopedRole
  isInJudgePool: boolean
  isStaff: boolean
  createdAt: string
}

export interface AnonymousSessionActor {
  kind: 'anonymous'
  isAuthenticated: false
  hasPlatformAccount: false
  hasAcceptedCurrentPlatformDocuments: false
  sessionUser: null
  platformUser: null
  isPlatformAdmin: false
  isEventOrganizer: false
  eventRoles: []
}

export interface AuthenticatedIdentitySessionActor {
  kind: 'authenticated_identity'
  isAuthenticated: true
  hasPlatformAccount: false
  hasAcceptedCurrentPlatformDocuments: false
  canCreateFirstPlatformAdminSetupAccount: boolean
  sessionUser: SessionUserIdentity
  platformUser: null
  isPlatformAdmin: false
  isEventOrganizer: false
  eventRoles: []
}

export interface PlatformSessionActor {
  kind: 'platform_user'
  isAuthenticated: true
  hasPlatformAccount: true
  hasAcceptedCurrentPlatformDocuments: boolean
  sessionUser: SessionUserIdentity
  platformUser: PlatformUserProfile
  isPlatformAdmin: boolean
  isEventOrganizer: boolean
  eventRoles: EventRoleSummary[]
}

export type SessionActor = AnonymousSessionActor | AuthenticatedIdentitySessionActor | PlatformSessionActor

export interface SessionActorResponse {
  data: {
    actor: AuthenticatedIdentitySessionActor | PlatformSessionActor
  }
}

export function buildAnonymousSessionActor(): AnonymousSessionActor {
  return {
    kind: 'anonymous',
    isAuthenticated: false,
    hasPlatformAccount: false,
    hasAcceptedCurrentPlatformDocuments: false,
    sessionUser: null,
    platformUser: null,
    isPlatformAdmin: false,
    isEventOrganizer: false,
    eventRoles: []
  }
}

export function buildAuthenticatedIdentitySessionActor(sessionUser: SessionUserIdentity): AuthenticatedIdentitySessionActor {
  return {
    kind: 'authenticated_identity',
    isAuthenticated: true,
    hasPlatformAccount: false,
    hasAcceptedCurrentPlatformDocuments: false,
    canCreateFirstPlatformAdminSetupAccount: false,
    sessionUser,
    platformUser: null,
    isPlatformAdmin: false,
    isEventOrganizer: false,
    eventRoles: []
  }
}
