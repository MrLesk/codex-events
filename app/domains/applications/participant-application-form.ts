import { z } from 'zod'

import type {
  AccountSocialProfileUrlKey
} from '~/domains/accounts/profile'
import type {
  ParticipantAiKnowledgeLevel,
  EventProfileField,
  ParticipantRegistrationTeamIntent
} from '~/domains/applications/participant-application'

import {
  isAccountProfileUrlValid,
  isAccountSocialProfileUrlValid,
  isOpenAiOrgIdFormatValid
} from '~/domains/accounts/profile'
import { isProofOfExecutionLinksValid } from '~/domains/applications/participant-application'
import {
  aiKnowledgeLevelValues
} from '#ai-knowledge'

const participantRegistrationProfileFormKeys = [
  'firstName',
  'familyName',
  'xProfileUrl',
  'linkedinProfileUrl',
  'githubProfileUrl',
  'chatgptEmail',
  'openaiOrgId',
  'lumaEmail'
] as const

export type ParticipantRegistrationProfileFormKey = typeof participantRegistrationProfileFormKeys[number]
export type ParticipantRegistrationProfileForm = Record<ParticipantRegistrationProfileFormKey, string>

const optionalEmailSchema = z.string().trim().refine(
  value => value.length === 0 || z.string().email().safeParse(value).success,
  'Enter a valid email address.'
)

function createOptionalProofOfExecutionLinksSchema(message: string) {
  return z.string().trim().refine(
    value => value.length === 0 || isProofOfExecutionLinksValid(value),
    message
  )
}

function createOptionalSocialProfileUrlSchema(
  key: AccountSocialProfileUrlKey,
  formatMessage: string,
  domainMessage: string
) {
  return z.string().trim()
    .refine(value => value.length === 0 || isAccountProfileUrlValid(value), formatMessage)
    .refine(value => value.length === 0 || isAccountSocialProfileUrlValid(key, value), domainMessage)
}

export function normalizeParticipantRegistrationProfileForm(
  value: Partial<Record<ParticipantRegistrationProfileFormKey, unknown>> | null | undefined
): ParticipantRegistrationProfileForm {
  const normalized = {} as ParticipantRegistrationProfileForm

  for (const key of participantRegistrationProfileFormKeys) {
    const fieldValue = value?.[key]
    normalized[key] = typeof fieldValue === 'string' ? fieldValue : ''
  }

  return normalized
}

export function buildParticipantRegistrationFormSchema(options: {
  profileFields: EventProfileField[]
  maxTeamMembers: number
  hasCurrentApplicationTerms: boolean
  isInPersonEvent: boolean
  showWhyThisEvent: boolean
  requireWhyThisEvent: boolean
  showProofOfExecution: boolean
  requireProofOfExecution: boolean
  showTeamIntent: boolean
  requireTeamIntent: boolean
  showAiKnowledge: boolean
}) {
  const visibleProfileKeys = new Set(options.profileFields
    .filter(field => field.visible)
    .map(field => field.key))
  const isProfileFieldVisible = (key: EventProfileField['key']) => visibleProfileKeys.has(key)

  return z.object({
    termsAccepted: z.boolean(),
    inPersonAttendanceCommitment: z.boolean(),
    teamIntent: z.enum(['solo', 'team', 'unknown'] as [ParticipantRegistrationTeamIntent, ParticipantRegistrationTeamIntent, ParticipantRegistrationTeamIntent]),
    teamMemberHints: z.array(z.object({
      fullName: z.string(),
      email: z.string()
    })),
    whyThisEvent: options.showWhyThisEvent
      ? z.string().trim().max(4000)
      : z.string(),
    proofOfExecutionUrl: options.showProofOfExecution
      ? createOptionalProofOfExecutionLinksSchema('Enter valid proof links. Separate multiple links with commas.')
      : z.string(),
    aiKnowledgeLevel: options.showAiKnowledge
      ? z.union([
          z.literal(''),
          z.enum(aiKnowledgeLevelValues as [ParticipantAiKnowledgeLevel, ParticipantAiKnowledgeLevel, ParticipantAiKnowledgeLevel])
        ])
      : z.string(),
    profileForm: z.object({
      firstName: z.string().trim().min(1).max(120),
      familyName: z.string().trim().min(1).max(120),
      xProfileUrl: isProfileFieldVisible('xProfileUrl')
        ? createOptionalSocialProfileUrlSchema(
            'xProfileUrl',
            'Enter a valid X profile URL.',
            'Use an x.com or twitter.com profile URL.'
          )
        : z.string(),
      linkedinProfileUrl: isProfileFieldVisible('linkedinProfileUrl')
        ? createOptionalSocialProfileUrlSchema(
            'linkedinProfileUrl',
            'Enter a valid LinkedIn profile URL.',
            'Use a linkedin.com profile URL.'
          )
        : z.string(),
      githubProfileUrl: isProfileFieldVisible('githubProfileUrl')
        ? createOptionalSocialProfileUrlSchema(
            'githubProfileUrl',
            'Enter a valid GitHub profile URL.',
            'Use a github.com profile URL.'
          )
        : z.string(),
      chatgptEmail: isProfileFieldVisible('chatgptEmail') ? optionalEmailSchema : z.string(),
      openaiOrgId: isProfileFieldVisible('openaiOrgId')
        ? z.string().trim().max(120).refine(
            value => value.length === 0 || isOpenAiOrgIdFormatValid(value),
            'Use an OpenAI org ID like org_123abc.'
          )
        : z.string(),
      lumaEmail: isProfileFieldVisible('lumaEmail') ? optionalEmailSchema : z.string()
    })
  }).superRefine((input, context) => {
    if (options.hasCurrentApplicationTerms && !input.termsAccepted) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['termsAccepted'],
        message: 'Accept Application Terms to submit.'
      })
    }

    if (options.isInPersonEvent && !input.inPersonAttendanceCommitment) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['inPersonAttendanceCommitment'],
        message: 'Confirm in-person attendance commitment to submit.'
      })
    }

    if (options.showTeamIntent && options.requireTeamIntent && input.teamIntent === 'unknown') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['teamIntent'],
        message: 'Choose how you plan to participate.'
      })
    }

    const maxHints = options.showTeamIntent ? Math.max(0, options.maxTeamMembers - 1) : 0

    if (options.showTeamIntent && input.teamMemberHints.length > maxHints) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['teamMemberHints'],
        message: `Add at most ${maxHints} teammates.`
      })
    }

    if (options.showTeamIntent) {
      input.teamMemberHints.forEach((member, index) => {
        const email = member.email.trim()

        if (email.length === 0) {
          return
        }

        if (!z.string().email().safeParse(email).success) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['teamMemberHints', index, 'email'],
            message: 'Enter a valid email address.'
          })
        }
      })
    }

    for (const field of options.profileFields) {
      if (!field.visible || !field.required) {
        continue
      }

      const value = input.profileForm[field.key].trim()

      if (value.length > 0) {
        continue
      }

      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['profileForm', field.key],
        message: `${field.label} is required.`
      })
    }

    if (options.showWhyThisEvent && options.requireWhyThisEvent && input.whyThisEvent.trim().length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['whyThisEvent'],
        message: 'Why this event is required.'
      })
    }

    if (options.showProofOfExecution && options.requireProofOfExecution && input.proofOfExecutionUrl.trim().length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proofOfExecutionUrl'],
        message: 'Proof of execution URL is required.'
      })
    }
  })
}
