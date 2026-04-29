import { z } from 'zod'
import type {
  HackathonAgendaItem,
  HackathonRecord
} from '~/domains/hackathons/records'

export interface HackathonFormState {
  name: string
  slug: string
  discordServerUrl: string
  lumaEventUrl: string
  lumaEventApiId: string
  description: string
  agendaItems: HackathonFormAgendaItem[]
  tracks: HackathonFormTrack[]
  backgroundImageUrl: string
  bannerImageUrl: string
  city: string
  country: string
  address: string
  registrationOpensAt: string
  registrationClosesAt: string
  submissionOpensAt: string
  submissionClosesAt: string
  maxTeamMembers: number
  participantsLimit: number | null
  blindReviewCount: number
  pitchReviewEnabled: boolean
  blindScoreWeightPercent: number
  pitchScoreWeightPercent: number
  shortlistFinalistCount: number
  inPersonEvent: boolean
  requireXProfile: boolean
  requireLinkedinProfile: boolean
  requireGithubProfile: boolean
  requireChatgptEmail: boolean
  requireOpenaiOrgId: boolean
  requireLumaEmail: boolean
  requireWhyThisHackathon: boolean
  requireProofOfExecution: boolean
  requireSubmissionSummary: boolean
  requireSubmissionRepositoryUrl: boolean
  requireSubmissionDemoUrl: boolean
}

export interface HackathonFormAgendaItem {
  id: string
  startsAt: string
  endsAt: string
  title: string
  details: string
  displayOrder: number
}

export interface HackathonFormTrack {
  id: string
  name: string
  description: string
  displayOrder: number
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function createOptionalHttpUrlSchema(message: string) {
  return z.string().trim().refine(
    value => value.length === 0 || isHttpUrl(value),
    message
  )
}

function createOptionalLumaEventApiIdSchema(message: string) {
  return z.string().trim().refine(
    value => value.length === 0 || /^evt-[A-Za-z0-9]+$/.test(value),
    message
  )
}

const requiredTextSchema = z.string().trim().min(1)
const slugSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slugs must use lowercase letters, numbers, and hyphens only.')

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
  discordServerUrl: createOptionalHttpUrlSchema('Enter a valid Discord server URL.'),
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
  shortlistFinalistCount: z.number().int().min(1),
  inPersonEvent: z.boolean(),
  requireXProfile: z.boolean(),
  requireLinkedinProfile: z.boolean(),
  requireGithubProfile: z.boolean(),
  requireChatgptEmail: z.boolean(),
  requireOpenaiOrgId: z.boolean(),
  requireLumaEmail: z.boolean(),
  requireWhyThisHackathon: z.boolean(),
  requireProofOfExecution: z.boolean(),
  requireSubmissionSummary: z.boolean(),
  requireSubmissionRepositoryUrl: z.boolean(),
  requireSubmissionDemoUrl: z.boolean()
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

export function createHackathonSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function getTermsVersionPublishErrorMessage(title: string, content: string) {
  if (title.trim().length === 0) {
    return 'Enter a title before publishing this terms version.'
  }

  if (content.trim().length === 0) {
    return 'Enter the terms content before publishing this terms version.'
  }

  return ''
}

export function createEmptyHackathonFormState(): HackathonFormState {
  return {
    name: '',
    slug: '',
    discordServerUrl: '',
    lumaEventUrl: '',
    lumaEventApiId: '',
    description: '',
    agendaItems: [],
    tracks: [],
    backgroundImageUrl: '',
    bannerImageUrl: '',
    city: '',
    country: '',
    address: '',
    registrationOpensAt: '',
    registrationClosesAt: '',
    submissionOpensAt: '',
    submissionClosesAt: '',
    maxTeamMembers: 4,
    participantsLimit: null,
    blindReviewCount: 1,
    pitchReviewEnabled: false,
    blindScoreWeightPercent: 70,
    pitchScoreWeightPercent: 30,
    shortlistFinalistCount: 10,
    inPersonEvent: false,
    requireXProfile: false,
    requireLinkedinProfile: false,
    requireGithubProfile: false,
    requireChatgptEmail: true,
    requireOpenaiOrgId: true,
    requireLumaEmail: true,
    requireWhyThisHackathon: false,
    requireProofOfExecution: false,
    requireSubmissionSummary: false,
    requireSubmissionRepositoryUrl: false,
    requireSubmissionDemoUrl: false
  }
}

export function getNextAgendaItemDefaultTimes(previousItem?: HackathonFormAgendaItem | null) {
  const previousEndsAt = previousItem?.endsAt?.trim() ?? ''

  if (!previousEndsAt) {
    return {
      startsAt: '',
      endsAt: ''
    }
  }

  return {
    startsAt: previousEndsAt,
    endsAt: previousEndsAt
  }
}

export function createHackathonFormState(hackathon: HackathonRecord): HackathonFormState {
  return {
    name: hackathon.name,
    slug: hackathon.slug,
    discordServerUrl: hackathon.discordServerUrl ?? '',
    lumaEventUrl: hackathon.lumaEventUrl ?? '',
    lumaEventApiId: hackathon.lumaEventApiId ?? '',
    description: hackathon.description,
    agendaItems: [...hackathon.agendaItems]
      .sort((left, right) => left.displayOrder - right.displayOrder || left.startsAt.localeCompare(right.startsAt))
      .map(item => ({
        id: item.id,
        startsAt: toDateTimeLocalValue(item.startsAt),
        endsAt: toDateTimeLocalValue(item.endsAt),
        title: item.title,
        details: item.details ?? '',
        displayOrder: item.displayOrder
      })),
    tracks: [...(hackathon.tracks ?? [])]
      .sort((left, right) => left.displayOrder - right.displayOrder || left.createdAt.localeCompare(right.createdAt))
      .map(track => ({
        id: track.id,
        name: track.name,
        description: track.description,
        displayOrder: track.displayOrder
      })),
    backgroundImageUrl: hackathon.backgroundImageUrl ?? '',
    bannerImageUrl: hackathon.bannerImageUrl ?? '',
    city: hackathon.city,
    country: hackathon.country,
    address: hackathon.address,
    registrationOpensAt: toDateTimeLocalValue(hackathon.registrationOpensAt),
    registrationClosesAt: toDateTimeLocalValue(hackathon.registrationClosesAt),
    submissionOpensAt: toDateTimeLocalValue(hackathon.submissionOpensAt),
    submissionClosesAt: toDateTimeLocalValue(hackathon.submissionClosesAt),
    maxTeamMembers: hackathon.maxTeamMembers,
    participantsLimit: hackathon.participantsLimit ?? null,
    blindReviewCount: hackathon.blindReviewCount,
    pitchReviewEnabled: hackathon.pitchReviewEnabled,
    blindScoreWeightPercent: hackathon.blindScoreWeightPercent,
    pitchScoreWeightPercent: hackathon.pitchScoreWeightPercent,
    shortlistFinalistCount: hackathon.shortlistFinalistCount,
    inPersonEvent: hackathon.inPersonEvent,
    requireXProfile: hackathon.requireXProfile,
    requireLinkedinProfile: hackathon.requireLinkedinProfile,
    requireGithubProfile: hackathon.requireGithubProfile,
    requireChatgptEmail: hackathon.requireChatgptEmail,
    requireOpenaiOrgId: hackathon.requireOpenaiOrgId,
    requireLumaEmail: hackathon.requireLumaEmail,
    requireWhyThisHackathon: hackathon.requireWhyThisHackathon,
    requireProofOfExecution: hackathon.requireProofOfExecution,
    requireSubmissionSummary: hackathon.requireSubmissionSummary,
    requireSubmissionRepositoryUrl: hackathon.requireSubmissionRepositoryUrl,
    requireSubmissionDemoUrl: hackathon.requireSubmissionDemoUrl
  }
}

export function toHackathonAgendaPayload(items: HackathonFormAgendaItem[]): HackathonAgendaItem[] {
  return items
    .map(item => ({
      id: item.id,
      startsAt: fromDateTimeLocalValue(item.startsAt),
      endsAt: fromDateTimeLocalValue(item.endsAt) || null,
      title: item.title.trim(),
      details: item.details.trim() || null,
      displayOrder: item.displayOrder
    }))
    .sort((left, right) => left.displayOrder - right.displayOrder || left.startsAt.localeCompare(right.startsAt))
}

export function toHackathonTracksPayload(items: HackathonFormTrack[]) {
  return items
    .map(track => ({
      id: track.id,
      name: track.name.trim(),
      description: track.description.trim(),
      displayOrder: track.displayOrder
    }))
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id.localeCompare(right.id))
}

export function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60_000))
  return local.toISOString().slice(0, 16)
}

export function fromDateTimeLocalValue(value: string) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}
