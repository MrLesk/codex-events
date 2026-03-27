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
  chatgptEmail?: string | null
  openaiOrgId?: string | null
  lumaUsername?: string | null
  profileIconUpdatedAt?: string | null
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

export const participantRegistrationTeamIntentValues = ['solo', 'team', 'unknown'] as const

export type ParticipantRegistrationTeamIntent = typeof participantRegistrationTeamIntentValues[number]

export interface ParticipantRegistrationTeamMemberHint {
  fullName: string
  email: string
}

export interface ParticipantRegistrationDetails {
  teamIntent: ParticipantRegistrationTeamIntent
  teamMembers: ParticipantRegistrationTeamMemberHint[]
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
  registrationDetailsJson: string
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
  key: 'xProfileUrl' | 'linkedinProfileUrl' | 'githubProfileUrl' | 'chatgptEmail' | 'openaiOrgId' | 'lumaUsername'
  label: string
}

export interface HackathonProfileField extends RequiredProfileField {
  required: boolean
  visible: boolean
}

const requiredProfileFieldRules: Array<{
  key: RequiredProfileField['key']
  label: RequiredProfileField['label']
  isRequired: (hackathon: Pick<PublicHackathon, 'requireXProfile' | 'requireLinkedinProfile' | 'requireGithubProfile' | 'requireChatgptEmail' | 'requireOpenaiOrgId' | 'requireLumaProfile' | 'lumaEventUrl'>) => boolean
  isVisible: (hackathon: Pick<PublicHackathon, 'requireChatgptEmail' | 'requireOpenaiOrgId' | 'lumaEventUrl'>) => boolean
  hasValue: (platformUser: Pick<ParticipantPlatformUserProfile, 'xProfileUrl' | 'linkedinProfileUrl' | 'githubProfileUrl' | 'chatgptEmail' | 'openaiOrgId' | 'lumaUsername'>) => boolean
}> = [
  {
    key: 'xProfileUrl',
    label: 'X profile URL',
    isRequired: hackathon => hackathon.requireXProfile,
    isVisible: () => true,
    hasValue: platformUser => Boolean(platformUser.xProfileUrl)
  },
  {
    key: 'linkedinProfileUrl',
    label: 'LinkedIn profile URL',
    isRequired: hackathon => hackathon.requireLinkedinProfile,
    isVisible: () => true,
    hasValue: platformUser => Boolean(platformUser.linkedinProfileUrl)
  },
  {
    key: 'githubProfileUrl',
    label: 'GitHub profile URL',
    isRequired: hackathon => hackathon.requireGithubProfile,
    isVisible: () => true,
    hasValue: platformUser => Boolean(platformUser.githubProfileUrl)
  },
  {
    key: 'chatgptEmail',
    label: 'ChatGPT email',
    isRequired: hackathon => hackathon.requireChatgptEmail,
    isVisible: hackathon => hackathon.requireChatgptEmail,
    hasValue: platformUser => Boolean(platformUser.chatgptEmail)
  },
  {
    key: 'openaiOrgId',
    label: 'OpenAI org ID',
    isRequired: hackathon => hackathon.requireOpenaiOrgId,
    isVisible: hackathon => hackathon.requireOpenaiOrgId,
    hasValue: platformUser => Boolean(platformUser.openaiOrgId)
  },
  {
    key: 'lumaUsername',
    label: 'Luma username',
    isRequired: hackathon => hackathon.requireLumaProfile && Boolean(hackathon.lumaEventUrl?.trim()),
    isVisible: hackathon => Boolean(hackathon.lumaEventUrl?.trim()),
    hasValue: platformUser => Boolean(platformUser.lumaUsername)
  }
]

export function listRequiredProfileFields(
  hackathon: Pick<PublicHackathon, 'requireXProfile' | 'requireLinkedinProfile' | 'requireGithubProfile' | 'requireChatgptEmail' | 'requireOpenaiOrgId' | 'requireLumaProfile' | 'lumaEventUrl'>
) {
  return requiredProfileFieldRules
    .filter(rule => rule.isVisible(hackathon) && rule.isRequired(hackathon))
    .map(rule => ({
      key: rule.key,
      label: rule.label
    }))
}

export function listHackathonProfileFields(
  hackathon: Pick<PublicHackathon, 'requireXProfile' | 'requireLinkedinProfile' | 'requireGithubProfile' | 'requireChatgptEmail' | 'requireOpenaiOrgId' | 'requireLumaProfile' | 'lumaEventUrl'>
): HackathonProfileField[] {
  return requiredProfileFieldRules.map(rule => ({
    key: rule.key,
    label: rule.label,
    required: rule.isRequired(hackathon),
    visible: rule.isVisible(hackathon)
  }))
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
  hackathon: Pick<PublicHackathon, 'requireXProfile' | 'requireLinkedinProfile' | 'requireGithubProfile' | 'requireChatgptEmail' | 'requireOpenaiOrgId' | 'requireLumaProfile' | 'lumaEventUrl'>,
  platformUser: Pick<ParticipantPlatformUserProfile, 'xProfileUrl' | 'linkedinProfileUrl' | 'githubProfileUrl' | 'chatgptEmail' | 'openaiOrgId' | 'lumaUsername'>
) {
  return requiredProfileFieldRules
    .filter(rule => rule.isVisible(hackathon) && rule.isRequired(hackathon) && !rule.hasValue(platformUser))
    .map(rule => ({
      key: rule.key,
      label: rule.label
    }))
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

export function createParticipantTeamMemberHintRows(maxTeamMembers: number): ParticipantRegistrationTeamMemberHint[] {
  return Array.from({ length: Math.max(0, maxTeamMembers) }, () => ({
    fullName: '',
    email: ''
  }))
}

export function parseParticipantRegistrationDetailsJson(value: string | null | undefined): ParticipantRegistrationDetails {
  if (!value) {
    return {
      teamIntent: 'unknown',
      teamMembers: []
    }
  }

  try {
    const parsed = JSON.parse(value) as Partial<ParticipantRegistrationDetails>

    const teamIntent = parsed.teamIntent && participantRegistrationTeamIntentValues.includes(parsed.teamIntent)
      ? parsed.teamIntent
      : 'unknown'

    const teamMembers = Array.isArray(parsed.teamMembers)
      ? parsed.teamMembers
          .map((member) => {
            const fullName = typeof member?.fullName === 'string' ? member.fullName : ''
            const email = typeof member?.email === 'string' ? member.email : ''

            return {
              fullName,
              email
            }
          })
      : []

    return {
      teamIntent,
      teamMembers
    }
  } catch {
    return {
      teamIntent: 'unknown',
      teamMembers: []
    }
  }
}

export function normalizeParticipantTeamMemberHintsForSubmission(
  teamMembers: ParticipantRegistrationTeamMemberHint[],
  maxTeamMembers: number
) {
  return teamMembers
    .slice(0, Math.max(0, maxTeamMembers))
    .map(member => ({
      fullName: member.fullName.trim().length > 0 ? member.fullName.trim() : null,
      email: member.email.trim().length > 0 ? member.email.trim() : null
    }))
}

export interface ParticipantApplicationSubmissionPolicy {
  isAllowed: boolean
  reason?: string
}

export function getParticipantApplicationSubmissionPolicy(options: {
  hackathonState: PublicHackathonState
  applicationStatus: ParticipantApplicationRecord['status'] | null
  missingRequiredProfileFieldCount: number
  hasCurrentApplicationTerms: boolean
  hasAcceptedCurrentTerms: boolean
}): ParticipantApplicationSubmissionPolicy {
  if (options.hackathonState !== 'registration_open') {
    return {
      isAllowed: false,
      reason: getHackathonApplicationAvailabilityMessage(options.hackathonState)
    }
  }

  if (options.applicationStatus === 'submitted') {
    return {
      isAllowed: false,
      reason: 'Your application is already submitted and waiting for review.'
    }
  }

  if (options.applicationStatus === 'approved') {
    return {
      isAllowed: false,
      reason: 'Your application is already approved for this hackathon.'
    }
  }

  if (options.applicationStatus === 'rejected') {
    return {
      isAllowed: false,
      reason: 'Rejected applicants cannot submit another application to the same hackathon.'
    }
  }

  if (options.missingRequiredProfileFieldCount > 0) {
    return {
      isAllowed: false,
      reason: 'Complete the required profile fields before submitting this application.'
    }
  }

  if (!options.hasCurrentApplicationTerms) {
    return {
      isAllowed: false,
      reason: 'The current application terms are unavailable for this hackathon.'
    }
  }

  if (!options.hasAcceptedCurrentTerms) {
    return {
      isAllowed: false,
      reason: 'Accept the current application terms before submitting.'
    }
  }

  return {
    isAllowed: true
  }
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
