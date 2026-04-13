import { z } from 'zod'

import type { HackathonFormState } from './admin-workspace'
import type {
  HackathonProfileField,
  ParticipantRegistrationTeamIntent
} from './participant-application'

import {
  isProofOfExecutionLinksValid,
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

function createRequiredHttpUrlSchema(requiredMessage: string, invalidMessage: string) {
  return z.string().trim()
    .min(1, requiredMessage)
    .refine(isHttpUrl, invalidMessage)
}

function createOptionalLumaEventApiIdSchema(message: string) {
  return z.string().trim().refine(
    value => value.length === 0 || /^evt-[A-Za-z0-9]+$/.test(value),
    message
  )
}

function createOptionalProofOfExecutionLinksSchema(message: string) {
  return z.string().trim().refine(
    value => value.length === 0 || isProofOfExecutionLinksValid(value),
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
  lumaEmail: optionalEmailSchema
})

export const accountSettingsProfileFormSchema = accountProfileFormSchema.extend({
  company: z.string().trim().max(120),
  bio: z.string().trim().max(4000)
})

export const imprintContactFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(120, 'Name must be 120 characters or fewer.'),
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  message: z.string().trim().min(1, 'Enter a message.').max(4000, 'Message must be 4000 characters or fewer.'),
  website: z.string().trim().max(500)
})

export const teamDirectoryCreateFormSchema = z.object({
  name: requiredTextSchema,
  isOpenToJoinRequests: z.boolean()
})

export const teamProfileFormSchema = z.object({
  name: requiredTextSchema,
  bio: z.string().trim().max(4000)
})

export function createTeamSubmissionFormSchema(trackRequired: boolean) {
  return z.object({
    projectName: z.string().trim().min(1, 'Project name is required.'),
    summary: z.string().trim().min(1, 'Summary is required.'),
    repositoryUrl: createRequiredHttpUrlSchema(
      'Repository URL is required.',
      'Enter a valid repository URL.'
    ),
    demoUrl: createRequiredHttpUrlSchema(
      'Demo URL is required.',
      'Enter a valid demo URL.'
    ),
    trackId: z.string().trim().nullable()
  }).superRefine((input, context) => {
    if (!trackRequired) {
      return
    }

    if (input.trackId?.trim()) {
      return
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['trackId'],
      message: 'Select a track.'
    })
  })
}

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

const trackSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1, 'Enter a track name.'),
  description: z.string().trim().min(1, 'Enter a track description.'),
  displayOrder: z.number().int().min(0)
})

export const hackathonConfigFormSchema: z.ZodType<HackathonFormState> = z.object({
  name: requiredTextSchema,
  slug: slugSchema,
  lumaEventUrl: createOptionalHttpUrlSchema('Enter a valid Luma event URL.'),
  lumaEventApiId: createOptionalLumaEventApiIdSchema('Enter a valid Luma event API ID like evt-123.'),
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
  tracks: z.array(trackSchema).superRefine((tracks, context) => {
    const ids = new Set<string>()

    tracks.forEach((track, index) => {
      if (!ids.has(track.id)) {
        ids.add(track.id)
        return
      }

      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'id'],
        message: 'Track IDs must be unique.'
      })
    })
  }),
  backgroundImageUrl: createOptionalHttpUrlSchema('Enter a valid background image URL.'),
  bannerImageUrl: createOptionalHttpUrlSchema('Enter a valid banner image URL.'),
  city: requiredTextSchema,
  country: requiredTextSchema,
  address: requiredTextSchema,
  registrationOpensAt: z.string().trim().min(1),
  registrationClosesAt: z.string().trim().min(1),
  submissionOpensAt: z.string().trim().min(1),
  submissionClosesAt: z.string().trim().min(1),
  maxTeamMembers: z.number().int().min(1),
  participantsLimit: z.number().int().min(1).nullable(),
  blindReviewCount: z.number().int().min(0).max(2),
  pitchReviewEnabled: z.boolean(),
  blindScoreWeightPercent: z.number().int().min(0).max(100),
  pitchScoreWeightPercent: z.number().int().min(0).max(100),
  inPersonEvent: z.boolean(),
  requireXProfile: z.boolean(),
  requireLinkedinProfile: z.boolean(),
  requireGithubProfile: z.boolean(),
  requireChatgptEmail: z.boolean(),
  requireOpenaiOrgId: z.boolean(),
  requireLumaEmail: z.boolean(),
  requireWhyThisHackathon: z.boolean(),
  requireProofOfExecution: z.boolean()
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
    !(
      registrationOpensAt < registrationClosesAt
      && registrationClosesAt <= submissionOpensAt
      && submissionOpensAt < submissionClosesAt
    )
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['submissionClosesAt'],
      message: 'Schedule must satisfy registration open < registration close <= submission open < submission close.'
    })
  }

  if (input.blindReviewCount === 0 && !input.pitchReviewEnabled) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['blindReviewCount'],
      message: 'Enable at least one judging stage.'
    })
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['pitchReviewEnabled'],
      message: 'Enable at least one judging stage.'
    })
  }

  if (
    input.blindReviewCount > 0
    && input.pitchReviewEnabled
    && input.blindScoreWeightPercent + input.pitchScoreWeightPercent !== 100
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['blindScoreWeightPercent'],
      message: 'Blind and pitch score weights must add up to 100.'
    })
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['pitchScoreWeightPercent'],
      message: 'Blind and pitch score weights must add up to 100.'
    })
  }
})

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
