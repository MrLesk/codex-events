import { z } from 'zod'

import type {
  AccountSocialProfileUrlKey
} from '~/domains/accounts/profile'
import type {
  HackathonProfileField,
  ParticipantRegistrationTeamIntent
} from '~/domains/applications/participant-application'

import {
  isAccountProfileUrlValid,
  isAccountSocialProfileUrlValid,
  isOpenAiOrgIdFormatValid
} from '~/domains/accounts/profile'
import { isProofOfExecutionLinksValid } from '~/domains/applications/participant-application'

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

export function buildParticipantRegistrationFormSchema(options: {
  profileFields: HackathonProfileField[]
  maxTeamMembers: number
  hasCurrentApplicationTerms: boolean
  isInPersonEvent: boolean
  requireWhyThisHackathon: boolean
  requireProofOfExecution: boolean
}) {
  return z.object({
    termsAccepted: z.boolean(),
    inPersonAttendanceCommitment: z.boolean(),
    teamIntent: z.enum(['solo', 'team', 'unknown'] as [ParticipantRegistrationTeamIntent, ParticipantRegistrationTeamIntent, ParticipantRegistrationTeamIntent]),
    teamMemberHints: z.array(z.object({
      fullName: z.string(),
      email: z.string()
    })),
    whyThisHackathon: z.string().trim().max(4000),
    proofOfExecutionUrl: createOptionalProofOfExecutionLinksSchema('Enter valid proof links. Separate multiple links with commas.'),
    profileForm: z.object({
      firstName: z.string().trim().min(1).max(120),
      familyName: z.string().trim().min(1).max(120),
      xProfileUrl: createOptionalSocialProfileUrlSchema(
        'xProfileUrl',
        'Enter a valid X profile URL.',
        'Use an x.com or twitter.com profile URL.'
      ),
      linkedinProfileUrl: createOptionalSocialProfileUrlSchema(
        'linkedinProfileUrl',
        'Enter a valid LinkedIn profile URL.',
        'Use a linkedin.com profile URL.'
      ),
      githubProfileUrl: createOptionalSocialProfileUrlSchema(
        'githubProfileUrl',
        'Enter a valid GitHub profile URL.',
        'Use a github.com profile URL.'
      ),
      chatgptEmail: optionalEmailSchema,
      openaiOrgId: z.string().trim().max(120).refine(
        value => value.length === 0 || isOpenAiOrgIdFormatValid(value),
        'Use an OpenAI org ID like org_123abc.'
      ),
      lumaEmail: optionalEmailSchema
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

    const maxHints = Math.max(0, options.maxTeamMembers - 1)

    if (input.teamMemberHints.length > maxHints) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['teamMemberHints'],
        message: `Add at most ${maxHints} teammates.`
      })
    }

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

    for (const field of options.profileFields) {
      if (!field.required) {
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

    if (options.requireWhyThisHackathon && input.whyThisHackathon.trim().length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['whyThisHackathon'],
        message: 'Why this hackathon is required.'
      })
    }

    if (options.requireProofOfExecution && input.proofOfExecutionUrl.trim().length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proofOfExecutionUrl'],
        message: 'Proof of execution URL is required.'
      })
    }
  })
}
