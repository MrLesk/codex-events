import type { PublicHackathon, PublicHackathonState } from '~/domains/hackathons/presentation'
import type {
  ApiDataResponse,
  ApiErrorShape,
  ApiListResponse
} from '~/lib/api'
import type {
  PlatformUserProfile,
  SessionActor,
  SessionUserIdentity
} from '~/domains/accounts/session-actor'

import { buildAccountRegisterHref, buildAuthLoginHref } from '#shared/domains/accounts/auth-navigation'
import { normalizeApiError } from '~/lib/api'
import {
  buildAnonymousSessionActor,
  buildAuthenticatedIdentitySessionActor
} from '~/domains/accounts/session-actor'

export {
  isProofOfExecutionLinksValid,
  normalizeProofOfExecutionLinks,
  parseProofOfExecutionLinks
} from '#proof-of-execution-links'

export type ParticipantSessionUser = SessionUserIdentity
export type ParticipantPlatformUserProfile = PlatformUserProfile
export type ParticipantActor = SessionActor

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
  inPersonAttendanceCommitment: boolean
  whyThisHackathon: string
  proofOfExecutionUrl: string
}

export interface ParticipantApplicationRecord {
  id: string
  hackathonId: string
  userId: string
  status: 'submitted' | 'approved' | 'rejected' | 'withdrawn'
  submittedAt: string
  withdrawnAt: string | null
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

export type ParticipantApiDataResponse<T> = ApiDataResponse<T>
export type ParticipantApiListResponse<T> = ApiListResponse<T>

export interface ParticipantApplicationActionAvailability {
  isAllowed: boolean
  reason?: string
}

export interface RequiredProfileField {
  key: 'xProfileUrl' | 'linkedinProfileUrl' | 'githubProfileUrl' | 'chatgptEmail' | 'openaiOrgId' | 'lumaEmail'
  label: string
}

export interface HackathonProfileField extends RequiredProfileField {
  required: boolean
  visible: boolean
}

const requiredProfileFieldRules: Array<{
  key: RequiredProfileField['key']
  label: RequiredProfileField['label']
  isRequired: (hackathon: Pick<PublicHackathon, 'requireXProfile' | 'requireLinkedinProfile' | 'requireGithubProfile' | 'requireChatgptEmail' | 'requireOpenaiOrgId' | 'requireLumaEmail'>) => boolean
  isVisible: (hackathon: Pick<PublicHackathon, 'requireChatgptEmail' | 'requireOpenaiOrgId' | 'requireLumaEmail'>) => boolean
  hasValue: (platformUser: Pick<ParticipantPlatformUserProfile, 'xProfileUrl' | 'linkedinProfileUrl' | 'githubProfileUrl' | 'chatgptEmail' | 'openaiOrgId' | 'lumaEmail'>) => boolean
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
    key: 'lumaEmail',
    label: 'Luma email',
    isRequired: hackathon => hackathon.requireLumaEmail,
    isVisible: hackathon => hackathon.requireLumaEmail,
    hasValue: platformUser => Boolean(platformUser.lumaEmail)
  }
]

export function listRequiredProfileFields(
  hackathon: Pick<PublicHackathon, 'requireXProfile' | 'requireLinkedinProfile' | 'requireGithubProfile' | 'requireChatgptEmail' | 'requireOpenaiOrgId' | 'requireLumaEmail'>
) {
  return requiredProfileFieldRules
    .filter(rule => rule.isVisible(hackathon) && rule.isRequired(hackathon))
    .map(rule => ({
      key: rule.key,
      label: rule.label
    }))
}

export function listHackathonProfileFields(
  hackathon: Pick<PublicHackathon, 'requireXProfile' | 'requireLinkedinProfile' | 'requireGithubProfile' | 'requireChatgptEmail' | 'requireOpenaiOrgId' | 'requireLumaEmail'>
): HackathonProfileField[] {
  return requiredProfileFieldRules.map(rule => ({
    key: rule.key,
    label: rule.label,
    required: rule.isRequired(hackathon),
    visible: rule.isVisible(hackathon)
  }))
}

export type ParticipantApiErrorShape = ApiErrorShape

export const buildAnonymousParticipantActor = buildAnonymousSessionActor
export const buildAuthenticatedIdentityParticipantActor = buildAuthenticatedIdentitySessionActor

export function listMissingRequiredProfileFields(
  hackathon: Pick<PublicHackathon, 'requireXProfile' | 'requireLinkedinProfile' | 'requireGithubProfile' | 'requireChatgptEmail' | 'requireOpenaiOrgId' | 'requireLumaEmail'>,
  platformUser: Pick<ParticipantPlatformUserProfile, 'xProfileUrl' | 'linkedinProfileUrl' | 'githubProfileUrl' | 'chatgptEmail' | 'openaiOrgId' | 'lumaEmail'>
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
    case 'withdrawn':
      return 'Withdrawn'
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
    case 'withdrawn':
      return 'neutral'
  }
}

export function summarizeParticipantApplicationStatus(
  status: ParticipantApplicationRecord['status'],
  hackathonState: PublicHackathonState
) {
  switch (status) {
    case 'submitted':
      return 'Your application is under review. Team setup and project submission will appear here after approval.'
    case 'approved':
      return hackathonState === 'registration_open' || hackathonState === 'submission_open'
        ? 'You are approved to create a team or request to join an open team in this hackathon.'
        : 'You are approved for this hackathon. Team actions now depend on the current hackathon lifecycle state.'
    case 'rejected':
      return 'This application was rejected. You cannot submit another application to the same hackathon.'
    case 'withdrawn':
      return 'You withdrew from this hackathon. You are no longer eligible to participate or attend in person through this application.'
  }
}

export function shouldShowParticipantOverviewStatusBanner(
  status: ParticipantApplicationRecord['status'] | null,
  hackathonState: PublicHackathonState
) {
  if (!status) {
    return false
  }

  if (status !== 'approved') {
    return true
  }

  return hackathonState === 'registration_open'
}

export function getParticipantApplicationWithdrawalAvailability(options: {
  applicationStatus: ParticipantApplicationRecord['status'] | null
  hasActiveTeamMembership: boolean
}): ParticipantApplicationActionAvailability {
  if (!options.applicationStatus) {
    return {
      isAllowed: false,
      reason: 'No application is available to withdraw for this hackathon.'
    }
  }

  if (options.hasActiveTeamMembership) {
    return {
      isAllowed: false,
      reason: 'Leave your active team before withdrawing from this hackathon.'
    }
  }

  if (options.applicationStatus === 'withdrawn') {
    return {
      isAllowed: false,
      reason: 'This application is already withdrawn.'
    }
  }

  if (options.applicationStatus === 'rejected') {
    return {
      isAllowed: false,
      reason: 'Rejected applications cannot be withdrawn.'
    }
  }

  return {
    isAllowed: true
  }
}

export function isHackathonRegistrationOpen(
  state: PublicHackathonState,
  registrationOpensAt: string,
  registrationClosesAt: string,
  now = new Date()
) {
  if (state !== 'registration_open') {
    return false
  }

  const registrationOpensAtTimestamp = Date.parse(registrationOpensAt)
  const registrationClosesAtTimestamp = Date.parse(registrationClosesAt)
  const nowTimestamp = now.getTime()

  return nowTimestamp >= registrationOpensAtTimestamp && nowTimestamp < registrationClosesAtTimestamp
}

export function getHackathonApplicationAvailabilityMessage(
  state: PublicHackathonState,
  registrationOpensAt: string,
  registrationClosesAt: string,
  now = new Date()
) {
  if (isHackathonRegistrationOpen(state, registrationOpensAt, registrationClosesAt, now)) {
    return 'Applications are open for this hackathon.'
  }

  if (state === 'draft' || now.getTime() < Date.parse(registrationOpensAt)) {
    return 'Applications are not available until registration opens.'
  }

  return 'Applications are closed for this hackathon.'
}

export function shouldShowPublicRegistrationEntry(
  state: PublicHackathonState,
  registrationOpensAt: string,
  registrationClosesAt: string,
  now = new Date()
) {
  return isHackathonRegistrationOpen(state, registrationOpensAt, registrationClosesAt, now)
}

export interface PublicHackathonPrimaryAction {
  label: 'Register' | 'Open workspace'
  to: string
  external: boolean
}

export function resolvePublicHackathonPrimaryAction(options: {
  actorKind: ParticipantActor['kind']
  hasAcceptedCurrentPlatformDocuments?: boolean
  hackathonSlug: string
  hackathonState: PublicHackathonState
  registrationOpensAt: string
  registrationClosesAt: string
  hasHackathonWorkspaceAccess: boolean
  now?: Date
}): PublicHackathonPrimaryAction | null {
  const registerHref = `/hackathons/${options.hackathonSlug}/register`
  const registerCompletionHref = buildAccountRegisterHref(registerHref)

  if (shouldShowPublicRegistrationEntry(
    options.hackathonState,
    options.registrationOpensAt,
    options.registrationClosesAt,
    options.now
  )) {
    if (options.actorKind === 'anonymous') {
      return {
        label: 'Register',
        to: buildAuthLoginHref(registerCompletionHref),
        external: true
      }
    }

    if (
      options.actorKind === 'authenticated_identity'
      || !options.hasAcceptedCurrentPlatformDocuments
    ) {
      return {
        label: 'Register',
        to: registerCompletionHref,
        external: false
      }
    }

    return {
      label: 'Register',
      to: registerHref,
      external: false
    }
  }

  if (!options.hasHackathonWorkspaceAccess) {
    return null
  }

  if (options.actorKind === 'platform_user' && !options.hasAcceptedCurrentPlatformDocuments) {
    return {
      label: 'Open workspace',
      to: buildAccountRegisterHref(`/account/hackathons/${options.hackathonSlug}`),
      external: false
    }
  }

  return {
    label: 'Open workspace',
    to: `/account/hackathons/${options.hackathonSlug}`,
    external: false
  }
}

export function resolveParticipantRegistrationEntry(options: {
  actorKind: ParticipantActor['kind']
  hasAcceptedCurrentPlatformDocuments?: boolean
  hackathonSlug: string
  hackathonState: PublicHackathonState
  registrationOpensAt: string
  registrationClosesAt: string
  hasExistingApplication: boolean
  now?: Date
}) {
  const registerHref = `/hackathons/${options.hackathonSlug}/register`
  const registerCompletionHref = buildAccountRegisterHref(registerHref)

  if (options.hasExistingApplication) {
    return {
      to: `/account/hackathons/${options.hackathonSlug}`,
      external: false
    }
  }

  if (!shouldShowPublicRegistrationEntry(
    options.hackathonState,
    options.registrationOpensAt,
    options.registrationClosesAt,
    options.now
  )) {
    return {
      to: `/hackathons/${options.hackathonSlug}`,
      external: false
    }
  }

  if (options.actorKind === 'anonymous') {
    return {
      to: buildAuthLoginHref(registerCompletionHref),
      external: true
    }
  }

  if (
    options.actorKind === 'authenticated_identity'
    || !options.hasAcceptedCurrentPlatformDocuments
  ) {
    return {
      to: registerCompletionHref,
      external: false
    }
  }

  return null
}

export interface ParticipantApplicationSubmittedTransition {
  title: string
  description: string
  eyebrow: string
  to: {
    path: string
    query: {
      notice: 'application_submitted'
    }
  }
}

export function resolveParticipantApplicationSubmittedTransition(
  hackathonSlug: string,
  options: {
    autoApproveApplications?: boolean
  } = {}
): ParticipantApplicationSubmittedTransition {
  if (options.autoApproveApplications) {
    return {
      title: 'Application approved',
      description: 'Opening your hackathon workspace so you can start team setup. This can take a moment.',
      eyebrow: 'Application approved',
      to: {
        path: `/account/hackathons/${hackathonSlug}`,
        query: {
          notice: 'application_submitted'
        }
      }
    }
  }

  return {
    title: 'Application submitted',
    description: 'Opening your hackathon workspace so you can track your application status. This can take a moment.',
    eyebrow: 'Application received',
    to: {
      path: `/account/hackathons/${hackathonSlug}`,
      query: {
        notice: 'application_submitted'
      }
    }
  }
}

export function isParticipantApplicationSubmittedNotice(
  notice: string | null | Array<string | null> | undefined
) {
  const firstNotice = Array.isArray(notice) ? notice[0] : notice

  if (typeof firstNotice !== 'string') {
    return false
  }

  return firstNotice.trim().toLowerCase() === 'application_submitted'
}

export function createParticipantTeamMemberHintRows(maxTeamMembers: number): ParticipantRegistrationTeamMemberHint[] {
  return Array.from({ length: Math.max(0, maxTeamMembers - 1) }, () => ({
    fullName: '',
    email: ''
  }))
}

export function areParticipantTeamMemberHintsEqual(
  left: ParticipantRegistrationTeamMemberHint[],
  right: ParticipantRegistrationTeamMemberHint[]
) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((leftMember, index) => {
    const rightMember = right[index]

    if (!rightMember) {
      return false
    }

    return leftMember.fullName === rightMember.fullName
      && leftMember.email === rightMember.email
  })
}

export function parseParticipantRegistrationDetailsJson(value: string | null | undefined): ParticipantRegistrationDetails {
  if (!value) {
    return {
      teamIntent: 'unknown',
      teamMembers: [],
      inPersonAttendanceCommitment: false,
      whyThisHackathon: '',
      proofOfExecutionUrl: ''
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

    const inPersonAttendanceCommitment = typeof parsed.inPersonAttendanceCommitment === 'boolean'
      ? parsed.inPersonAttendanceCommitment
      : false
    const whyThisHackathon = typeof parsed.whyThisHackathon === 'string'
      ? parsed.whyThisHackathon
      : ''
    const proofOfExecutionUrl = typeof parsed.proofOfExecutionUrl === 'string'
      ? parsed.proofOfExecutionUrl
      : ''

    return {
      teamIntent,
      teamMembers,
      inPersonAttendanceCommitment,
      whyThisHackathon,
      proofOfExecutionUrl
    }
  } catch {
    return {
      teamIntent: 'unknown',
      teamMembers: [],
      inPersonAttendanceCommitment: false,
      whyThisHackathon: '',
      proofOfExecutionUrl: ''
    }
  }
}

export function normalizeParticipantTeamMemberHintsForSubmission(
  teamMembers: ParticipantRegistrationTeamMemberHint[],
  maxTeamMembers: number
) {
  return teamMembers
    .slice(0, Math.max(0, maxTeamMembers - 1))
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
  registrationOpensAt: string
  registrationClosesAt: string
  now?: Date
  applicationStatus: ParticipantApplicationRecord['status'] | null
  missingRequiredProfileFieldCount: number
  hasCurrentApplicationTerms: boolean
  hasAcceptedCurrentTerms: boolean
  requiresInPersonAttendanceCommitment: boolean
  hasAcceptedInPersonAttendanceCommitment: boolean
}): ParticipantApplicationSubmissionPolicy {
  if (!isHackathonRegistrationOpen(
    options.hackathonState,
    options.registrationOpensAt,
    options.registrationClosesAt,
    options.now
  )) {
    return {
      isAllowed: false,
      reason: getHackathonApplicationAvailabilityMessage(
        options.hackathonState,
        options.registrationOpensAt,
        options.registrationClosesAt,
        options.now
      )
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

  if (options.applicationStatus === 'withdrawn') {
    return {
      isAllowed: false,
      reason: 'Withdrawn participants cannot submit another application to the same hackathon.'
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

  if (options.requiresInPersonAttendanceCommitment && !options.hasAcceptedInPersonAttendanceCommitment) {
    return {
      isAllowed: false,
      reason: 'Confirm in-person attendance commitment before submitting this application.'
    }
  }

  return {
    isAllowed: true
  }
}

export function normalizeParticipantApiError(error: unknown): ParticipantApiErrorShape {
  return normalizeApiError(error)
}
