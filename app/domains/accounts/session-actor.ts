import type { HackathonScopedRole } from '~/domains/hackathons/roles'

export interface SessionUserIdentity {
  sub: string
  email?: string | null
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

export interface HackathonRoleSummary {
  hackathonId: string
  role: HackathonScopedRole
  isInJudgePool: boolean
  isStaff: boolean
  createdAt: string
}

export interface SessionActorAccountLink {
  required: true
  email: string
  linkLoginHref: '/auth/link/login'
}

export interface AnonymousSessionActor {
  kind: 'anonymous'
  isAuthenticated: false
  hasPlatformAccount: false
  hasAcceptedCurrentPlatformDocuments: false
  sessionUser: null
  platformUser: null
  isPlatformAdmin: false
  hackathonRoles: []
}

export interface AuthenticatedIdentitySessionActor {
  kind: 'authenticated_identity'
  isAuthenticated: true
  hasPlatformAccount: false
  hasAcceptedCurrentPlatformDocuments: false
  accountLink: SessionActorAccountLink | null
  sessionUser: SessionUserIdentity
  platformUser: null
  isPlatformAdmin: false
  hackathonRoles: []
}

export interface PlatformSessionActor {
  kind: 'platform_user'
  isAuthenticated: true
  hasPlatformAccount: true
  hasAcceptedCurrentPlatformDocuments: boolean
  sessionUser: SessionUserIdentity
  platformUser: PlatformUserProfile
  isPlatformAdmin: boolean
  hackathonRoles: HackathonRoleSummary[]
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
    hackathonRoles: []
  }
}

export function buildAuthenticatedIdentitySessionActor(sessionUser: SessionUserIdentity): AuthenticatedIdentitySessionActor {
  return {
    kind: 'authenticated_identity',
    isAuthenticated: true,
    hasPlatformAccount: false,
    hasAcceptedCurrentPlatformDocuments: false,
    accountLink: null,
    sessionUser,
    platformUser: null,
    isPlatformAdmin: false,
    hackathonRoles: []
  }
}
