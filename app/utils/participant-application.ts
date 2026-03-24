import type { PublicHackathon, PublicHackathonState } from '~/composables/useHackathonPresentation'

export interface ParticipantSessionUser {
  sub: string
  email?: string | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
}

export interface ParticipantPlatformUserProfile {
  id: string
  email: string
  displayName: string
  isPlatformAdmin: boolean
  xProfileUrl?: string | null
  linkedinProfileUrl?: string | null
  githubProfileUrl?: string | null
  lumaUsername?: string | null
}

export type ParticipantActor
  = | {
    kind: 'anonymous'
    isAuthenticated: false
    hasPlatformAccount: false
    sessionUser: null
    platformUser: null
    isPlatformAdmin: false
    hackathonRoles: []
  }
  | {
    kind: 'authenticated_identity'
    isAuthenticated: true
    hasPlatformAccount: false
    sessionUser: ParticipantSessionUser
    platformUser: null
    isPlatformAdmin: false
    hackathonRoles: []
  }
  | {
    kind: 'platform_user'
    isAuthenticated: true
    hasPlatformAccount: true
    sessionUser: ParticipantSessionUser
    platformUser: ParticipantPlatformUserProfile
    isPlatformAdmin: boolean
    hackathonRoles: Array<{
      hackathonId: string
      role: 'hackathon_admin' | 'judge'
      isInJudgePool: boolean
      createdAt: string
    }>
  }

export interface ParticipantApplicationTermsDocument {
  id: string
  hackathonId: string
  documentType: 'application_terms' | 'winner_terms'
  version: number
  title: string
  content: string
  publishedAt: string
  createdAt: string
}

export interface ParticipantApplicationRecord {
  id: string
  hackathonId: string
  userId: string
  status: 'submitted' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt: string | null
  reviewedByUserId: string | null
  applicationTermsDocumentId: string
  applicationTermsAcceptedAt: string
  createdAt: string
  updatedAt: string
  applicationTermsDocument?: ParticipantApplicationTermsDocument
}

export interface VisibleHackathonRecord extends PublicHackathon {
  id: string
}

export interface ParticipantCurrentTermsResponse {
  application_terms: ParticipantApplicationTermsDocument | null
  winner_terms: ParticipantApplicationTermsDocument | null
}

export interface ParticipantApiDataResponse<T> {
  data: T
}

export interface ParticipantApiListResponse<T> {
  data: T[]
  meta?: {
    page?: number
    pageSize?: number
    total?: number
  }
}

export interface RequiredProfileField {
  key: 'xProfileUrl' | 'linkedinProfileUrl' | 'githubProfileUrl' | 'lumaUsername'
  label: string
}

export interface ParticipantApiErrorShape {
  code: string
  message: string
  details?: Record<string, unknown>
}

export function buildAnonymousParticipantActor(): ParticipantActor {
  return {
    kind: 'anonymous',
    isAuthenticated: false,
    hasPlatformAccount: false,
    sessionUser: null,
    platformUser: null,
    isPlatformAdmin: false,
    hackathonRoles: []
  }
}

export function buildAuthenticatedIdentityParticipantActor(sessionUser: ParticipantSessionUser): ParticipantActor {
  return {
    kind: 'authenticated_identity',
    isAuthenticated: true,
    hasPlatformAccount: false,
    sessionUser,
    platformUser: null,
    isPlatformAdmin: false,
    hackathonRoles: []
  }
}

export function listMissingRequiredProfileFields(
  hackathon: Pick<PublicHackathon, 'requireXProfile' | 'requireLinkedinProfile' | 'requireGithubProfile' | 'requireLumaProfile'>,
  platformUser: Pick<ParticipantPlatformUserProfile, 'xProfileUrl' | 'linkedinProfileUrl' | 'githubProfileUrl' | 'lumaUsername'>
) {
  const missingFields: RequiredProfileField[] = []

  if (hackathon.requireXProfile && !platformUser.xProfileUrl) {
    missingFields.push({
      key: 'xProfileUrl',
      label: 'X profile URL'
    })
  }

  if (hackathon.requireLinkedinProfile && !platformUser.linkedinProfileUrl) {
    missingFields.push({
      key: 'linkedinProfileUrl',
      label: 'LinkedIn profile URL'
    })
  }

  if (hackathon.requireGithubProfile && !platformUser.githubProfileUrl) {
    missingFields.push({
      key: 'githubProfileUrl',
      label: 'GitHub profile URL'
    })
  }

  if (hackathon.requireLumaProfile && !platformUser.lumaUsername) {
    missingFields.push({
      key: 'lumaUsername',
      label: 'Luma username'
    })
  }

  return missingFields
}

export function formatParticipantApplicationStatus(status: ParticipantApplicationRecord['status']) {
  switch (status) {
    case 'submitted':
      return 'Submitted'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
  }
}

export function getParticipantApplicationStatusColor(status: ParticipantApplicationRecord['status']) {
  switch (status) {
    case 'submitted':
      return 'warning'
    case 'approved':
      return 'success'
    case 'rejected':
      return 'error'
  }
}

export function summarizeParticipantApplicationStatus(
  status: ParticipantApplicationRecord['status'],
  hackathonState: PublicHackathonState
) {
  switch (status) {
    case 'submitted':
      return 'Your application is waiting for hackathon-admin review.'
    case 'approved':
      return hackathonState === 'registration_open' || hackathonState === 'submission_open'
        ? 'You are approved to create a team or request to join an open team in this hackathon.'
        : 'You are approved for this hackathon. Team actions now depend on the current hackathon lifecycle state.'
    case 'rejected':
      return 'This application was rejected. You cannot submit another application to the same hackathon.'
  }
}

export function getHackathonApplicationAvailabilityMessage(state: PublicHackathonState) {
  if (state === 'registration_open') {
    return 'Applications are open for this hackathon.'
  }

  if (state === 'draft') {
    return 'Applications are not available until registration opens.'
  }

  return 'Applications are closed for this hackathon.'
}

export function normalizeParticipantApiError(error: unknown): ParticipantApiErrorShape {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      data?: {
        error?: ParticipantApiErrorShape
      }
      response?: {
        _data?: {
          error?: ParticipantApiErrorShape
        }
      }
      message?: string
      statusMessage?: string
    }

    const apiError = maybeError.data?.error ?? maybeError.response?._data?.error

    if (apiError?.code && apiError.message) {
      return apiError
    }

    if (typeof maybeError.statusMessage === 'string' && maybeError.statusMessage.length > 0) {
      return {
        code: 'request_failed',
        message: maybeError.statusMessage
      }
    }

    if (typeof maybeError.message === 'string' && maybeError.message.length > 0) {
      return {
        code: 'request_failed',
        message: maybeError.message
      }
    }
  }

  return {
    code: 'request_failed',
    message: 'The request failed unexpectedly.'
  }
}
