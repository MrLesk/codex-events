import { z } from 'zod'

import type { HackathonFormState } from './admin-workspace'
import type {
  HackathonProfileField,
  ParticipantRegistrationTeamIntent
} from './participant-application'

import {
  isOpenAiOrgIdFormatValid,
  isParticipantProfileUrlValid,
  isParticipantSocialProfileUrlValid
} from './participant-application'

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const requiredTextSchema = z.string().trim().min(1)
const optionalTextSchema = z.string().trim()
const optionalEmailSchema = z.string().trim().refine(
  value => value.length === 0 || z.string().email().safeParse(value).success,
  'Enter a valid email address.'
)
const slugSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slugs must use lowercase letters, numbers, and hyphens only.')

function createOptionalHttpUrlSchema(message: string) {
  return z.string().trim().refine(
    value => value.length === 0 || isHttpUrl(value),
    message
  )
}

function createOptionalSocialProfileUrlSchema(
  key: 'xProfileUrl' | 'linkedinProfileUrl' | 'githubProfileUrl',
  formatMessage: string,
  domainMessage: string
) {
  return z.string().trim()
    .refine(value => value.length === 0 || isParticipantProfileUrlValid(value), formatMessage)
    .refine(value => value.length === 0 || isParticipantSocialProfileUrlValid(key, value), domainMessage)
}

export const accountProfileFormSchema = z.object({
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
  openaiOrgId: z.string().trim().max(120),
  lumaUsername: z.string().trim().max(120)
})

export const teamDirectoryCreateFormSchema = z.object({
  name: requiredTextSchema,
  slug: slugSchema,
  isOpenToJoinRequests: z.boolean()
})

export const teamProfileFormSchema = z.object({
  name: requiredTextSchema,
  slug: slugSchema,
  isOpenToJoinRequests: z.boolean()
})

export const teamSubmissionFormSchema = z.object({
  projectName: optionalTextSchema,
  summary: optionalTextSchema,
  repositoryUrl: createOptionalHttpUrlSchema('Enter a valid repository URL.'),
  demoUrl: createOptionalHttpUrlSchema('Enter a valid demo URL.')
})

const agendaItemSchema = z.object({
  id: z.string().trim().min(1),
  startsAt: z.string().trim().min(1),
  endsAt: z.string().trim(),
  title: z.string().trim().min(1),
  details: z.string(),
  displayOrder: z.number().int().min(0)
}).superRefine((item, context) => {
  if (Number.isNaN(Date.parse(item.startsAt))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['startsAt'],
      message: 'Provide a valid agenda start date and time.'
    })
  }

  if (item.endsAt.length > 0 && Number.isNaN(Date.parse(item.endsAt))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endsAt'],
      message: 'Provide a valid agenda end date and time.'
    })
  }

  if (item.endsAt.length === 0) {
    return
  }

  if (Date.parse(item.endsAt) < Date.parse(item.startsAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['endsAt'],
      message: 'Agenda end time must be on or after the start time.'
    })
  }
})

export const hackathonConfigFormSchema: z.ZodType<HackathonFormState> = z.object({
  name: requiredTextSchema,
  slug: slugSchema,
  description: requiredTextSchema,
  agendaItems: z.array(agendaItemSchema).superRefine((items, context) => {
    const ids = new Set<string>()

    items.forEach((item, index) => {
      if (!ids.has(item.id)) {
        ids.add(item.id)
        return
      }

      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'id'],
        message: 'Agenda item IDs must be unique.'
      })
    })
  }),
  backgroundImageUrl: createOptionalHttpUrlSchema('Enter a valid background image URL.'),
  bannerImageUrl: createOptionalHttpUrlSchema('Enter a valid banner image URL.'),
  city: requiredTextSchema,
  address: requiredTextSchema,
  registrationOpensAt: z.string().trim().min(1),
  registrationClosesAt: z.string().trim().min(1),
  submissionOpensAt: z.string().trim().min(1),
  submissionClosesAt: z.string().trim().min(1),
  maxTeamMembers: z.number().int().min(1),
  requireXProfile: z.boolean(),
  requireLinkedinProfile: z.boolean(),
  requireGithubProfile: z.boolean(),
  requireChatgptEmail: z.boolean(),
  requireOpenaiOrgId: z.boolean(),
  requireLumaProfile: z.boolean()
}).superRefine((input, context) => {
  const registrationOpensAt = Date.parse(input.registrationOpensAt)
  const registrationClosesAt = Date.parse(input.registrationClosesAt)
  const submissionOpensAt = Date.parse(input.submissionOpensAt)
  const submissionClosesAt = Date.parse(input.submissionClosesAt)

  if (Number.isNaN(registrationOpensAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['registrationOpensAt'],
      message: 'Provide a valid registration open date and time.'
    })
  }

  if (Number.isNaN(registrationClosesAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['registrationClosesAt'],
      message: 'Provide a valid registration close date and time.'
    })
  }

  if (Number.isNaN(submissionOpensAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['submissionOpensAt'],
      message: 'Provide a valid submission open date and time.'
    })
  }

  if (Number.isNaN(submissionClosesAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['submissionClosesAt'],
      message: 'Provide a valid submission close date and time.'
    })
  }

  if (
    registrationOpensAt < registrationClosesAt
    && registrationClosesAt <= submissionOpensAt
    && submissionOpensAt < submissionClosesAt
  ) {
    return
  }

  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['submissionClosesAt'],
    message: 'Schedule must satisfy registration open < registration close <= submission open < submission close.'
  })
})

export function buildParticipantRegistrationFormSchema(options: {
  profileFields: HackathonProfileField[]
  maxTeamMembers: number
  hasCurrentApplicationTerms: boolean
}) {
  return z.object({
    termsAccepted: z.boolean(),
    teamIntent: z.enum(['solo', 'team', 'unknown'] as [ParticipantRegistrationTeamIntent, ParticipantRegistrationTeamIntent, ParticipantRegistrationTeamIntent]),
    teamMemberHints: z.array(z.object({
      fullName: z.string(),
      email: z.string()
    })),
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
      lumaUsername: z.string().trim().max(120)
    })
  }).superRefine((input, context) => {
    if (options.hasCurrentApplicationTerms && !input.termsAccepted) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['termsAccepted'],
        message: 'Accept Application Terms to submit.'
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
  })
}
