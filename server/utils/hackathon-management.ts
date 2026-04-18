import type { H3Event } from 'h3'

import { and, asc, count, desc, eq, inArray, isNull, like, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import { getRequestActor, requirePlatformActor } from '../auth/actor'
import {
  assertHackathonAdminAccess,
  resolveHackathonAuthorization
} from '../auth/authorization'
import { getDatabase, type AppDatabase } from '../database/client'
import {
  evaluationCriteria,
  hackathonTracks,
  hackathonRoleAssignments,
  hackathonRoleTypes,
  hackathonStates,
  hackathonTermsDocumentTypes,
  hackathonTermsDocuments,
  hackathons,
  platformDocumentTypes,
  prizeAwardScopes,
  prizeRewardTypes,
  prizes,
  submissions,
  teamMembers,
  teams,
  userApplications,
  users
} from '../database/schema'
import { ApiError } from './api-error'
import { publicHackathonImagePath } from './hackathon-images'
import { assertAllowedState, assertGuard } from './lifecycle-guard'

const isoTimestampSchema = z.string().refine(
  value => !Number.isNaN(Date.parse(value)),
  'Expected an ISO-8601 timestamp.'
)

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slugs must use lowercase letters, numbers, and hyphens only.')

const nullableUrlSchema = z.string().url().nullable().optional()
const nullableHttpUrlSchema = z.string().url()
  .refine((value) => {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  }, 'Expected an http or https URL.')
  .nullable()
  .optional()
const nullableLumaEventApiIdSchema = z.string()
  .trim()
  .regex(/^evt-[A-Za-z0-9]+$/, 'Expected a Luma event API ID like evt-123.')
  .nullable()
  .optional()
const nullableTrimmedStringSchema = z.string().trim().min(1).nullable().optional()

const roleEnumSchema = z.enum(hackathonRoleTypes)
const stateEnumSchema = z.enum(hackathonStates)
const termsDocumentTypeSchema = z.enum(hackathonTermsDocumentTypes)
const prizeRewardTypeSchema = z.enum(prizeRewardTypes)
const prizeAwardScopeSchema = z.enum(prizeAwardScopes)
export const platformDocumentTypeSchema = z.enum(platformDocumentTypes)

export const routeIdParamsSchema = z.object({
  hackathonId: z.string().trim().min(1)
})

export const routeSlugParamsSchema = z.object({
  slug: slugSchema
})

export const hackathonListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  state: stateEnumSchema.optional(),
  slug: z.string().trim().min(1).optional()
})

export const listHackathonRoleCandidatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional()
})

const agendaItemSchema = z.object({
  id: z.string().trim().min(1),
  startsAt: isoTimestampSchema,
  endsAt: isoTimestampSchema.nullable().optional().default(null),
  title: z.string().trim().min(1),
  details: nullableTrimmedStringSchema.default(null),
  displayOrder: z.coerce.number().int().min(0)
}).superRefine((item, ctx) => {
  if (!item.endsAt) {
    return
  }

  const startsAt = Date.parse(item.startsAt)
  const endsAt = Date.parse(item.endsAt)

  if (endsAt < startsAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Agenda item end time must be on or after the start time.',
      path: ['endsAt']
    })
  }
})

const agendaItemsSchema = z.array(agendaItemSchema)
  .superRefine((items, ctx) => {
    const ids = new Set<string>()

    items.forEach((item, index) => {
      if (!ids.has(item.id)) {
        ids.add(item.id)
        return
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Agenda item IDs must be unique.',
        path: [index, 'id']
      })
    })
  })

const storedSubmissionIdsSchema = z.array(z.string().trim().min(1))
  .default([])

const trackSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  displayOrder: z.coerce.number().int().min(0)
})

const tracksSchema = z.array(trackSchema)
  .superRefine((tracks, ctx) => {
    const ids = new Set<string>()
    const displayOrders = new Set<number>()

    tracks.forEach((track, index) => {
      if (ids.has(track.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Track IDs must be unique.',
          path: [index, 'id']
        })
      } else {
        ids.add(track.id)
      }

      if (displayOrders.has(track.displayOrder)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Track display order values must be unique.',
          path: [index, 'displayOrder']
        })
      } else {
        displayOrders.add(track.displayOrder)
      }
    })
  })
  .default([])

const hackathonConfigShape = {
  name: z.string().trim().min(1),
  slug: slugSchema,
  description: z.string().trim().min(1),
  agendaItems: agendaItemsSchema,
  tracks: tracksSchema,
  backgroundImageUrl: nullableUrlSchema,
  bannerImageUrl: nullableUrlSchema,
  discordServerUrl: nullableHttpUrlSchema,
  lumaEventUrl: nullableHttpUrlSchema,
  lumaEventApiId: nullableLumaEventApiIdSchema,
  city: z.string().trim().min(1),
  country: z.string().trim().min(1),
  address: z.string().trim().min(1),
  registrationOpensAt: isoTimestampSchema,
  registrationClosesAt: isoTimestampSchema,
  submissionOpensAt: isoTimestampSchema,
  submissionClosesAt: isoTimestampSchema,
  maxTeamMembers: z.coerce.number().int().min(1).default(4),
  participantsLimit: z.coerce.number().int().min(1).nullable().default(null),
  blindReviewCount: z.coerce.number().int().min(0).max(2).default(1),
  pitchReviewEnabled: z.coerce.boolean().default(false),
  blindScoreWeightPercent: z.coerce.number().int().min(0).max(100).default(70),
  pitchScoreWeightPercent: z.coerce.number().int().min(0).max(100).default(30),
  shortlistFinalistCount: z.coerce.number().int().min(1).default(10),
  inPersonEvent: z.coerce.boolean().default(false),
  requireXProfile: z.coerce.boolean().default(false),
  requireLinkedinProfile: z.coerce.boolean().default(false),
  requireGithubProfile: z.coerce.boolean().default(false),
  requireChatgptEmail: z.coerce.boolean().default(false),
  requireOpenaiOrgId: z.coerce.boolean().default(false),
  requireLumaEmail: z.coerce.boolean().default(false),
  requireWhyThisHackathon: z.coerce.boolean().default(false),
  requireProofOfExecution: z.coerce.boolean().default(false),
  requireSubmissionSummary: z.coerce.boolean().default(false),
  requireSubmissionRepositoryUrl: z.coerce.boolean().default(false),
  requireSubmissionDemoUrl: z.coerce.boolean().default(false)
} satisfies Record<string, z.ZodTypeAny>

export const createHackathonBodySchema = z.object(hackathonConfigShape)
export const updateHackathonBodySchema = z.object({
  name: hackathonConfigShape.name.optional(),
  slug: hackathonConfigShape.slug.optional(),
  description: hackathonConfigShape.description.optional(),
  agendaItems: agendaItemsSchema.optional(),
  tracks: tracksSchema.optional(),
  backgroundImageUrl: hackathonConfigShape.backgroundImageUrl.optional(),
  bannerImageUrl: hackathonConfigShape.bannerImageUrl.optional(),
  discordServerUrl: hackathonConfigShape.discordServerUrl.optional(),
  lumaEventUrl: hackathonConfigShape.lumaEventUrl.optional(),
  lumaEventApiId: hackathonConfigShape.lumaEventApiId.optional(),
  city: hackathonConfigShape.city.optional(),
  country: hackathonConfigShape.country.optional(),
  address: hackathonConfigShape.address.optional(),
  registrationOpensAt: hackathonConfigShape.registrationOpensAt.optional(),
  registrationClosesAt: hackathonConfigShape.registrationClosesAt.optional(),
  submissionOpensAt: hackathonConfigShape.submissionOpensAt.optional(),
  submissionClosesAt: hackathonConfigShape.submissionClosesAt.optional(),
  maxTeamMembers: hackathonConfigShape.maxTeamMembers.optional(),
  participantsLimit: hackathonConfigShape.participantsLimit.optional(),
  blindReviewCount: hackathonConfigShape.blindReviewCount.optional(),
  pitchReviewEnabled: hackathonConfigShape.pitchReviewEnabled.optional(),
  blindScoreWeightPercent: hackathonConfigShape.blindScoreWeightPercent.optional(),
  pitchScoreWeightPercent: hackathonConfigShape.pitchScoreWeightPercent.optional(),
  shortlistFinalistCount: hackathonConfigShape.shortlistFinalistCount.optional(),
  inPersonEvent: hackathonConfigShape.inPersonEvent.optional(),
  requireXProfile: hackathonConfigShape.requireXProfile.optional(),
  requireLinkedinProfile: hackathonConfigShape.requireLinkedinProfile.optional(),
  requireGithubProfile: hackathonConfigShape.requireGithubProfile.optional(),
  requireChatgptEmail: hackathonConfigShape.requireChatgptEmail.optional(),
  requireOpenaiOrgId: hackathonConfigShape.requireOpenaiOrgId.optional(),
  requireLumaEmail: hackathonConfigShape.requireLumaEmail.optional(),
  requireWhyThisHackathon: hackathonConfigShape.requireWhyThisHackathon.optional(),
  requireProofOfExecution: hackathonConfigShape.requireProofOfExecution.optional(),
  requireSubmissionSummary: hackathonConfigShape.requireSubmissionSummary.optional(),
  requireSubmissionRepositoryUrl: hackathonConfigShape.requireSubmissionRepositoryUrl.optional(),
  requireSubmissionDemoUrl: hackathonConfigShape.requireSubmissionDemoUrl.optional()
}).refine(
  input => Object.keys(input).length > 0,
  'At least one hackathon configuration field must be provided.'
)

export const roleAssignmentParamsSchema = routeIdParamsSchema.extend({
  userId: z.string().trim().min(1)
})

export const roleAssignmentUpsertBodySchema = z.object({
  role: roleEnumSchema,
  isInJudgePool: z.coerce.boolean().default(false),
  isStaff: z.coerce.boolean().default(false)
})

export const roleAssignmentPatchBodySchema = z.object({
  isInJudgePool: z.coerce.boolean().optional(),
  isStaff: z.coerce.boolean().optional()
}).refine(
  input => input.isInJudgePool !== undefined || input.isStaff !== undefined,
  'At least one role capability flag must be provided.'
)

export const termsDocumentParamsSchema = routeIdParamsSchema.extend({
  documentType: termsDocumentTypeSchema
})

export const createTermsVersionBodySchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  publishedAt: isoTimestampSchema.optional()
})

export const setCurrentTermsBodySchema = z.object({
  hackathonTermsDocumentId: z.string().trim().min(1)
})

export const criterionParamsSchema = routeIdParamsSchema.extend({
  criterionId: z.string().trim().min(1)
})

export const createEvaluationCriterionBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  weight: z.coerce.number().int().min(0),
  displayOrder: z.coerce.number().int().min(0)
})

export const updateEvaluationCriterionBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  weight: z.coerce.number().int().min(0).optional(),
  displayOrder: z.coerce.number().int().min(0).optional()
}).refine(
  input => Object.keys(input).length > 0,
  'At least one evaluation criterion field must be provided.'
)

export const prizeParamsSchema = routeIdParamsSchema.extend({
  prizeId: z.string().trim().min(1)
})

export const createPrizeBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  rewardType: prizeRewardTypeSchema,
  rewardValue: z.string().trim().min(1),
  rewardCurrency: z.string().trim().min(1).nullable().optional(),
  awardScope: prizeAwardScopeSchema,
  rankStart: z.coerce.number().int().min(1),
  rankEnd: z.coerce.number().int().min(1),
  displayOrder: z.coerce.number().int().min(0).optional()
}).refine(
  input => input.rankStart <= input.rankEnd,
  'Prize rankStart must be less than or equal to rankEnd.'
)

export const updatePrizeBodySchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  rewardType: prizeRewardTypeSchema.optional(),
  rewardValue: z.string().trim().min(1).optional(),
  rewardCurrency: z.string().trim().min(1).nullable().optional(),
  awardScope: prizeAwardScopeSchema.optional(),
  rankStart: z.coerce.number().int().min(1).optional(),
  rankEnd: z.coerce.number().int().min(1).optional(),
  displayOrder: z.coerce.number().int().min(0).optional()
}).refine(
  input => Object.keys(input).length > 0,
  'At least one prize field must be provided.'
)

type HackathonRecord = typeof hackathons.$inferSelect
type HackathonTrackRecord = typeof hackathonTracks.$inferSelect
type HackathonRoleAssignmentRecord = typeof hackathonRoleAssignments.$inferSelect
type HackathonTermsDocumentRecord = typeof hackathonTermsDocuments.$inferSelect
type EvaluationCriterionRecord = typeof evaluationCriteria.$inferSelect
type PrizeRecord = typeof prizes.$inferSelect
type UserRecord = typeof users.$inferSelect
export type HackathonAgendaItem = z.infer<typeof agendaItemSchema>
export type HackathonTrackInput = z.infer<typeof trackSchema>

const publicHackathonStates = [
  'registration_open',
  'submission_open',
  'judging_preparation',
  'blind_review',
  'shortlist',
  'pitch',
  'pitch_review',
  'final_deliberation',
  'winners_announced',
  'completed'
] as const

export const publishedHackathonRosterRoles = ['judge', 'staff'] as const
export type PublishedHackathonRosterRole = (typeof publishedHackathonRosterRoles)[number]

function buildPublishedHackathonRosterFullName(user: Pick<UserRecord, 'displayName' | 'firstName' | 'familyName'>) {
  const fullName = `${user.firstName.trim()} ${user.familyName.trim()}`.trim()

  return fullName || user.displayName
}

function comparePublishedHackathonRosterMembers(
  left: ReturnType<typeof serializePublishedHackathonRosterMember>,
  right: ReturnType<typeof serializePublishedHackathonRosterMember>
) {
  const fullNameOrder = left.fullName.localeCompare(right.fullName)

  if (fullNameOrder !== 0) {
    return fullNameOrder
  }

  return left.id.localeCompare(right.id)
}

export function isHackathonRolePublishedInRoster(
  assignment: Pick<HackathonRoleAssignmentRecord, 'role' | 'isInJudgePool' | 'isStaff'>,
  role: PublishedHackathonRosterRole
) {
  if (role === 'judge') {
    return assignment.role === 'judge' || (assignment.role === 'hackathon_admin' && assignment.isInJudgePool)
  }

  return assignment.role === 'staff' || (assignment.role === 'hackathon_admin' && assignment.isStaff)
}

export function serializeHackathonAgendaItems(items: HackathonAgendaItem[]) {
  return JSON.stringify(
    [...items].sort((left, right) => left.displayOrder - right.displayOrder || left.startsAt.localeCompare(right.startsAt))
  )
}

export function parseHackathonAgendaItems(value: string | null | undefined) {
  if (!value) {
    return []
  }

  try {
    return agendaItemsSchema
      .parse(JSON.parse(value))
      .sort((left, right) => left.displayOrder - right.displayOrder || left.startsAt.localeCompare(right.startsAt))
  } catch {
    return []
  }
}

export function parseStoredSubmissionIdsJson(value: string | null | undefined) {
  if (!value) {
    return []
  }

  try {
    return storedSubmissionIdsSchema.parse(JSON.parse(value))
  } catch {
    return []
  }
}

function compareHackathonTracks(
  left: Pick<HackathonTrackRecord, 'displayOrder' | 'createdAt' | 'id'>,
  right: Pick<HackathonTrackRecord, 'displayOrder' | 'createdAt' | 'id'>
) {
  return left.displayOrder - right.displayOrder
    || left.createdAt.localeCompare(right.createdAt)
    || left.id.localeCompare(right.id)
}

export async function listHackathonTracks(database: AppDatabase, hackathonId: string) {
  const tracks = await database.query.hackathonTracks.findMany({
    where: eq(hackathonTracks.hackathonId, hackathonId),
    orderBy: [asc(hackathonTracks.displayOrder), asc(hackathonTracks.createdAt), asc(hackathonTracks.id)]
  })

  return tracks.sort(compareHackathonTracks)
}

export function serializeHackathonTrack(track: HackathonTrackRecord) {
  return {
    id: track.id,
    hackathonId: track.hackathonId,
    name: track.name,
    description: track.description,
    displayOrder: track.displayOrder,
    createdAt: track.createdAt
  }
}

export function serializePublicHackathonTrack(track: HackathonTrackRecord) {
  return {
    name: track.name,
    description: track.description,
    displayOrder: track.displayOrder
  }
}

export async function createHackathonTracks(
  database: AppDatabase,
  hackathonId: string,
  tracks: HackathonTrackInput[]
) {
  if (tracks.length === 0) {
    return
  }

  const createdAt = new Date().toISOString()

  await database.insert(hackathonTracks).values(
    [...tracks]
      .sort((left, right) => left.displayOrder - right.displayOrder || left.id.localeCompare(right.id))
      .map(track => ({
        id: track.id,
        hackathonId,
        name: track.name,
        description: track.description,
        displayOrder: track.displayOrder,
        createdAt
      }))
  )
}

export async function assertRemovedHackathonTracksAreUnreferenced(
  database: AppDatabase,
  trackIds: string[]
) {
  if (trackIds.length === 0) {
    return
  }

  const referencedSubmission = await database.query.submissions.findFirst({
    where: inArray(submissions.trackId, trackIds)
  })

  if (!referencedSubmission) {
    return
  }

  throw new ApiError({
    statusCode: 409,
    code: 'hackathon_track_has_submissions',
    message: 'This track cannot be removed because existing submissions still reference it.',
    details: {
      trackIds
    }
  })
}

export async function replaceHackathonTracks(
  database: AppDatabase,
  hackathonId: string,
  nextTracks: HackathonTrackInput[]
) {
  const existingTracks = await listHackathonTracks(database, hackathonId)
  const existingTrackIds = new Set(existingTracks.map(track => track.id))
  const nextTrackIds = new Set(nextTracks.map(track => track.id))
  const removedTrackIds = existingTracks
    .filter(track => !nextTrackIds.has(track.id))
    .map(track => track.id)
  const persistedTracks = existingTracks.filter(track => nextTrackIds.has(track.id))

  for (const [index, track] of persistedTracks.entries()) {
    await database
      .update(hackathonTracks)
      .set({
        displayOrder: -1 - index
      })
      .where(eq(hackathonTracks.id, track.id))
  }

  const normalizedTracks = [...nextTracks]
    .sort((left, right) => left.displayOrder - right.displayOrder || left.id.localeCompare(right.id))

  if (removedTrackIds.length > 0) {
    await database.delete(hackathonTracks).where(inArray(hackathonTracks.id, removedTrackIds))
  }

  for (const track of normalizedTracks) {
    if (existingTrackIds.has(track.id)) {
      await database
        .update(hackathonTracks)
        .set({
          name: track.name,
          description: track.description,
          displayOrder: track.displayOrder
        })
        .where(eq(hackathonTracks.id, track.id))
      continue
    }

    await database.insert(hackathonTracks).values({
      id: track.id,
      hackathonId,
      name: track.name,
      description: track.description,
      displayOrder: track.displayOrder,
      createdAt: new Date().toISOString()
    })
  }
}

export async function assertHackathonTrackReplacementAllowed(
  database: AppDatabase,
  hackathonId: string,
  nextTracks: HackathonTrackInput[]
) {
  const existingTracks = await listHackathonTracks(database, hackathonId)
  const nextTrackIds = new Set(nextTracks.map(track => track.id))
  const removedTrackIds = existingTracks
    .filter(track => !nextTrackIds.has(track.id))
    .map(track => track.id)

  await assertRemovedHackathonTracksAreUnreferenced(database, removedTrackIds)
}

function buildHackathonListFilters(input: z.infer<typeof hackathonListQuerySchema>) {
  const filters = []

  if (input.state) {
    filters.push(eq(hackathons.state, input.state))
  }

  if (input.slug) {
    filters.push(like(hackathons.slug, `%${input.slug}%`))
  }

  return filters
}

function buildPublicHackathonVisibilityClauses() {
  return publicHackathonStates.map(state => eq(hackathons.state, state))
}

function buildPublicHackathonVisibilityWhere(filters: ReturnType<typeof buildHackathonListFilters> = []) {
  const visibilityWhere = or(...buildPublicHackathonVisibilityClauses())

  return filters.length > 0
    ? and(...filters, visibilityWhere)
    : visibilityWhere
}

function isDraftVisibleToActor(
  actor: Awaited<ReturnType<typeof getRequestActor>>,
  hackathonId: string,
  internalHackathonIds: Set<string>
) {
  if (actor.kind !== 'platform_user') {
    return false
  }

  if (actor.platformUser.isPlatformAdmin) {
    return true
  }

  return internalHackathonIds.has(hackathonId)
}

export function assertRoleCapabilityInvariant(
  role: typeof hackathonRoleTypes[number],
  capabilities: {
    isInJudgePool: boolean
    isStaff: boolean
  }
) {
  if (role === 'judge') {
    assertGuard(capabilities.isInJudgePool && !capabilities.isStaff, {
      code: 'judge_role_flags_invalid',
      message: 'Judge role assignments must remain in the automatic judge pool and cannot also be staff.',
      details: {
        role,
        isInJudgePool: capabilities.isInJudgePool,
        isStaff: capabilities.isStaff
      }
    })

    return
  }

  if (role === 'staff') {
    assertGuard(capabilities.isStaff && !capabilities.isInJudgePool, {
      code: 'staff_role_flags_invalid',
      message: 'Staff role assignments must remain marked as staff and cannot also be in the judge pool.',
      details: {
        role,
        isInJudgePool: capabilities.isInJudgePool,
        isStaff: capabilities.isStaff
      }
    })
  }
}

export function assertHackathonSchedule(input: {
  registrationOpensAt: string
  registrationClosesAt: string
  submissionOpensAt: string
  submissionClosesAt: string
}) {
  const registrationOpensAt = Date.parse(input.registrationOpensAt)
  const registrationClosesAt = Date.parse(input.registrationClosesAt)
  const submissionOpensAt = Date.parse(input.submissionOpensAt)
  const submissionClosesAt = Date.parse(input.submissionClosesAt)

  assertGuard(
    registrationOpensAt < registrationClosesAt
    && registrationClosesAt <= submissionOpensAt
    && submissionOpensAt < submissionClosesAt,
    {
      code: 'hackathon_schedule_invalid',
      message: 'Hackathon schedule fields must satisfy registration_open < registration_close <= submission_open < submission_close.'
    }
  )
}

export function buildHackathonUpdatePayload(
  existingHackathon: HackathonRecord,
  patch: z.infer<typeof updateHackathonBodySchema>
) {
  const normalizedPatch: z.infer<typeof updateHackathonBodySchema> & { agendaItemsJson?: string } = {
    ...patch
  }

  if (normalizedPatch.agendaItems !== undefined) {
    normalizedPatch.agendaItemsJson = serializeHackathonAgendaItems(normalizedPatch.agendaItems)
    Reflect.deleteProperty(normalizedPatch, 'agendaItems')
  }

  if (normalizedPatch.tracks !== undefined) {
    Reflect.deleteProperty(normalizedPatch, 'tracks')
  }

  const nextSlug = patch.slug?.trim()

  if (nextSlug && nextSlug !== existingHackathon.slug) {
    const previousBackgroundPath = publicHackathonImagePath(existingHackathon.slug, 'background')
    const previousBannerPath = publicHackathonImagePath(existingHackathon.slug, 'banner')
    const nextBackgroundPath = publicHackathonImagePath(nextSlug, 'background')
    const nextBannerPath = publicHackathonImagePath(nextSlug, 'banner')

    const rewriteManagedImageUrl = (
      imageUrl: string | null | undefined,
      previousPath: string,
      nextPath: string
    ) => {
      if (!imageUrl) {
        return imageUrl ?? null
      }

      try {
        const parsed = new URL(imageUrl)

        if (parsed.pathname !== previousPath) {
          return imageUrl
        }

        parsed.pathname = nextPath
        return parsed.toString()
      } catch {
        return imageUrl
      }
    }

    normalizedPatch.backgroundImageUrl = rewriteManagedImageUrl(
      normalizedPatch.backgroundImageUrl ?? existingHackathon.backgroundImageUrl,
      previousBackgroundPath,
      nextBackgroundPath
    )
    normalizedPatch.bannerImageUrl = rewriteManagedImageUrl(
      normalizedPatch.bannerImageUrl ?? existingHackathon.bannerImageUrl,
      previousBannerPath,
      nextBannerPath
    )
  }

  const mergedHackathon = {
    ...existingHackathon,
    ...normalizedPatch
  }

  assertHackathonSchedule({
    registrationOpensAt: mergedHackathon.registrationOpensAt,
    registrationClosesAt: mergedHackathon.registrationClosesAt,
    submissionOpensAt: mergedHackathon.submissionOpensAt,
    submissionClosesAt: mergedHackathon.submissionClosesAt
  })

  return {
    ...normalizedPatch,
    updatedAt: new Date().toISOString()
  }
}

export async function getHackathonOrThrow(database: AppDatabase, hackathonId: string) {
  const hackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  if (!hackathon) {
    throw new ApiError({
      statusCode: 404,
      code: 'hackathon_not_found',
      message: 'The requested hackathon was not found.',
      details: { hackathonId }
    })
  }

  return hackathon
}

async function getActorInternalHackathonIds(
  database: AppDatabase,
  actor: Awaited<ReturnType<typeof getRequestActor>>
) {
  if (actor.kind !== 'platform_user' || actor.platformUser.isPlatformAdmin) {
    return new Set<string>()
  }

  const assignments = await database.query.hackathonRoleAssignments.findMany({
    columns: {
      hackathonId: true
    },
    where: and(
      eq(hackathonRoleAssignments.userId, actor.platformUser.id),
      inArray(hackathonRoleAssignments.role, ['hackathon_admin', 'staff'])
    )
  })

  return new Set(assignments.map(assignment => assignment.hackathonId))
}

export async function getVisibleHackathonOrThrow(event: H3Event, hackathonId: string) {
  const database = getDatabase(event)
  const actor = await getRequestActor(event)
  const hackathon = await getHackathonOrThrow(database, hackathonId)

  if (hackathon.state !== 'draft') {
    return hackathon
  }

  const internalHackathonIds = await getActorInternalHackathonIds(database, actor)

  if (isDraftVisibleToActor(actor, hackathonId, internalHackathonIds)) {
    return hackathon
  }

  throw new ApiError({
    statusCode: 404,
    code: 'hackathon_not_found',
    message: 'The requested hackathon was not found.',
    details: { hackathonId }
  })
}

export async function getVisibleHackathonBySlugOrThrow(event: H3Event, slug: string) {
  const database = getDatabase(event)
  const actor = await getRequestActor(event)
  const hackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.slug, slug)
  })

  if (!hackathon) {
    throw new ApiError({
      statusCode: 404,
      code: 'hackathon_not_found',
      message: 'The requested hackathon was not found.',
      details: { slug }
    })
  }

  if (hackathon.state !== 'draft') {
    return hackathon
  }

  const internalHackathonIds = await getActorInternalHackathonIds(database, actor)

  if (isDraftVisibleToActor(actor, hackathon.id, internalHackathonIds)) {
    return hackathon
  }

  throw new ApiError({
    statusCode: 404,
    code: 'hackathon_not_found',
    message: 'The requested hackathon was not found.',
    details: { slug }
  })
}

export async function getPublicHackathonBySlugOrThrow(database: AppDatabase, slug: string) {
  const hackathon = await database.query.hackathons.findFirst({
    where: and(
      eq(hackathons.slug, slug),
      buildPublicHackathonVisibilityWhere()
    )
  })

  if (!hackathon) {
    throw new ApiError({
      statusCode: 404,
      code: 'hackathon_not_found',
      message: 'The requested hackathon was not found.',
      details: { slug }
    })
  }

  return hackathon
}

export async function requireHackathonAdmin(event: H3Event, hackathonId: string) {
  const hackathon = await getHackathonOrThrow(getDatabase(event), hackathonId)
  const authorization = await resolveHackathonAuthorization(event, hackathonId)
  assertHackathonAdminAccess(authorization)
  return { hackathon, authorization }
}

export async function requireHackathonWorkspaceAccess(event: H3Event, hackathonId: string) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)

  if (actor.platformUser.isPlatformAdmin) {
    return {
      actor,
      database,
      hackathon
    }
  }

  const hasApplication = await database.query.userApplications.findFirst({
    columns: {
      id: true
    },
    where: and(
      eq(userApplications.hackathonId, hackathonId),
      eq(userApplications.userId, actor.platformUser.id)
    )
  })

  const hasRoleAssignment = await database.query.hackathonRoleAssignments.findFirst({
    columns: {
      id: true
    },
    where: and(
      eq(hackathonRoleAssignments.hackathonId, hackathonId),
      eq(hackathonRoleAssignments.userId, actor.platformUser.id)
    )
  })

  const activeMembership = await database
    .select({
      teamId: teamMembers.teamId
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(
      eq(teamMembers.userId, actor.platformUser.id),
      isNull(teamMembers.leftAt),
      eq(teams.hackathonId, hackathonId)
    ))
    .limit(1)

  if (!hasApplication && !hasRoleAssignment && activeMembership.length === 0) {
    throw new ApiError({
      statusCode: 403,
      code: 'hackathon_workspace_access_required',
      message: 'This operation requires access to the hackathon workspace.',
      details: {
        hackathonId
      }
    })
  }

  return {
    actor,
    database,
    hackathon
  }
}

async function canViewRestrictedHackathonDetails(event: H3Event, hackathonId: string) {
  const actor = await getRequestActor(event)

  if (actor.kind !== 'platform_user') {
    return false
  }

  if (actor.platformUser.isPlatformAdmin) {
    return true
  }

  const authorization = await resolveHackathonAuthorization(event, hackathonId)

  if (authorization.explicitRole !== null) {
    return true
  }

  const approvedApplication = await getDatabase(event).query.userApplications.findFirst({
    columns: {
      id: true
    },
    where: and(
      eq(userApplications.hackathonId, hackathonId),
      eq(userApplications.userId, actor.platformUser.id),
      eq(userApplications.status, 'approved')
    )
  })

  return Boolean(approvedApplication)
}

export async function resolveVisibleHackathonRestrictedFields(
  event: H3Event,
  hackathon: Pick<HackathonRecord, 'id' | 'address' | 'discordServerUrl'>
) {
  const canViewDetails = await canViewRestrictedHackathonDetails(event, hackathon.id)
  const configuredDiscordServerUrl = hackathon.discordServerUrl?.trim()

  return {
    address: canViewDetails ? hackathon.address : '',
    discordServerUrl: canViewDetails && configuredDiscordServerUrl ? configuredDiscordServerUrl : null
  }
}

export async function listPublicHackathons(
  database: AppDatabase,
  input: z.infer<typeof hackathonListQuerySchema>
) {
  const page = input.page
  const pageSize = input.page_size
  const visibilityWhere = buildPublicHackathonVisibilityWhere(buildHackathonListFilters(input))

  const items = await database.query.hackathons.findMany({
    where: visibilityWhere,
    orderBy: [desc(hackathons.createdAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize
  })
  const totalRows = await database.select({ total: count() }).from(hackathons).where(visibilityWhere)
  const total = totalRows[0]?.total ?? 0

  return { items, total, page, pageSize }
}

export async function listVisibleHackathons(
  event: H3Event,
  input: z.infer<typeof hackathonListQuerySchema>
) {
  const database = getDatabase(event)
  const actor = await getRequestActor(event)
  const page = input.page
  const pageSize = input.page_size
  const filters = buildHackathonListFilters(input)

  const baseWhere = filters.length > 0 ? and(...filters) : undefined

  if (actor.kind === 'platform_user' && actor.platformUser.isPlatformAdmin) {
    const items = await database.query.hackathons.findMany({
      where: baseWhere,
      orderBy: [desc(hackathons.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize
    })
    const totalRows = await database.select({ total: count() }).from(hackathons).where(baseWhere)
    const total = totalRows[0]?.total ?? 0

    return { items, total, page, pageSize }
  }

  const internalHackathonIds = await getActorInternalHackathonIds(database, actor)
  const visibilityClauses = [
    ...buildPublicHackathonVisibilityClauses(),
    ...(internalHackathonIds.size > 0 ? [inArray(hackathons.id, [...internalHackathonIds])] : [])
  ]
  const visibilityWhere = baseWhere
    ? and(baseWhere, or(...visibilityClauses))
    : or(...visibilityClauses)

  const items = await database.query.hackathons.findMany({
    where: visibilityWhere,
    orderBy: [desc(hackathons.createdAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize
  })
  const totalRows = await database.select({ total: count() }).from(hackathons).where(visibilityWhere)
  const total = totalRows[0]?.total ?? 0

  return { items, total, page, pageSize }
}

export async function listHackathonRoleCandidates(
  database: AppDatabase,
  hackathonId: string,
  input: z.infer<typeof listHackathonRoleCandidatesQuerySchema>
) {
  const filters = [isNull(users.deletedAt)]

  if (input.search) {
    filters.push(or(
      like(users.displayName, `%${input.search}%`),
      like(users.email, `%${input.search}%`),
      like(users.id, `%${input.search}%`)
    )!)
  }

  const currentHackathonAdminRows = await database.query.hackathonRoleAssignments.findMany({
    columns: {
      userId: true
    },
    where: and(
      eq(hackathonRoleAssignments.hackathonId, hackathonId),
      eq(hackathonRoleAssignments.role, 'hackathon_admin')
    )
  })
  const currentHackathonAdminIds = currentHackathonAdminRows.map(row => row.userId)
  const where = and(...filters)
  const orderBy = [
    desc(sql<number>`case when ${users.isPlatformAdmin} then 1 else 0 end`),
    ...(currentHackathonAdminIds.length > 0
      ? [desc(sql<number>`case when ${inArray(users.id, currentHackathonAdminIds)} then 1 else 0 end`)]
      : []),
    asc(users.displayName),
    asc(users.email),
    asc(users.id)
  ]

  const items = await database
    .select()
    .from(users)
    .where(where)
    .orderBy(...orderBy)
    .limit(input.page_size)
    .offset((input.page - 1) * input.page_size)

  const totalRows = await database
    .select({ total: count() })
    .from(users)
    .where(where)
  const total = totalRows[0]?.total ?? 0

  return {
    items,
    total,
    page: input.page,
    pageSize: input.page_size
  }
}

export async function listPublishedHackathonRosterMembers(
  database: AppDatabase,
  hackathonId: string,
  role: PublishedHackathonRosterRole
) {
  const assignments = await database.query.hackathonRoleAssignments.findMany({
    where: eq(hackathonRoleAssignments.hackathonId, hackathonId),
    orderBy: [asc(hackathonRoleAssignments.createdAt)]
  })
  const visibleAssignments = assignments.filter(assignment => isHackathonRolePublishedInRoster(assignment, role))

  if (visibleAssignments.length === 0) {
    return []
  }

  const relatedUsers = await database.query.users.findMany({
    where: and(
      inArray(users.id, visibleAssignments.map(assignment => assignment.userId)),
      isNull(users.deletedAt)
    )
  })
  const usersById = new Map<string, UserRecord>(
    relatedUsers.map(user => [user.id, user])
  )

  return visibleAssignments
    .map(assignment => usersById.get(assignment.userId) ?? null)
    .filter((user): user is UserRecord => Boolean(user))
    .map(serializePublishedHackathonRosterMember)
    .sort(comparePublishedHackathonRosterMembers)
}

export async function isUserVisibleInPublishedHackathonRoster(
  database: AppDatabase,
  hackathonId: string,
  userId: string
) {
  const assignment = await database.query.hackathonRoleAssignments.findFirst({
    columns: {
      role: true,
      isInJudgePool: true,
      isStaff: true
    },
    where: and(
      eq(hackathonRoleAssignments.hackathonId, hackathonId),
      eq(hackathonRoleAssignments.userId, userId)
    )
  })

  if (!assignment) {
    return false
  }

  return isHackathonRolePublishedInRoster(assignment, 'judge')
    || isHackathonRolePublishedInRoster(assignment, 'staff')
}

export async function getCurrentHackathonTerms(
  database: AppDatabase,
  hackathon: HackathonRecord
) {
  const documentIds = [
    hackathon.currentApplicationTermsDocumentId,
    hackathon.currentWinnerTermsDocumentId
  ].filter((value): value is string => Boolean(value))

  if (documentIds.length === 0) {
    return {
      applicationTerms: null,
      winnerTerms: null
    }
  }

  const documents = await database.query.hackathonTermsDocuments.findMany({
    where: inArray(hackathonTermsDocuments.id, documentIds)
  })

  return {
    applicationTerms: documents.find(document => document.id === hackathon.currentApplicationTermsDocumentId) ?? null,
    winnerTerms: documents.find(document => document.id === hackathon.currentWinnerTermsDocumentId) ?? null
  }
}

export function serializeHackathon(
  hackathon: HackathonRecord,
  currentTerms?: {
    applicationTerms: HackathonTermsDocumentRecord | null
    winnerTerms: HackathonTermsDocumentRecord | null
  },
  tracks?: HackathonTrackRecord[]
) {
  const pitchPresentationSubmissionIds = parseStoredSubmissionIdsJson(hackathon.pitchFinalistSubmissionIdsJson)

  return {
    id: hackathon.id,
    name: hackathon.name,
    slug: hackathon.slug,
    description: hackathon.description,
    agendaItems: parseHackathonAgendaItems(hackathon.agendaItemsJson),
    backgroundImageUrl: hackathon.backgroundImageUrl,
    bannerImageUrl: hackathon.bannerImageUrl,
    lumaEventUrl: hackathon.lumaEventUrl,
    lumaEventApiId: hackathon.lumaEventApiId,
    city: hackathon.city,
    country: hackathon.country,
    address: hackathon.address,
    registrationOpensAt: hackathon.registrationOpensAt,
    registrationClosesAt: hackathon.registrationClosesAt,
    submissionOpensAt: hackathon.submissionOpensAt,
    submissionClosesAt: hackathon.submissionClosesAt,
    state: hackathon.state,
    maxTeamMembers: hackathon.maxTeamMembers,
    participantsLimit: hackathon.participantsLimit,
    blindReviewCount: hackathon.blindReviewCount,
    pitchReviewEnabled: hackathon.pitchReviewEnabled,
    blindScoreWeightPercent: hackathon.blindScoreWeightPercent,
    pitchScoreWeightPercent: hackathon.pitchScoreWeightPercent,
    shortlistFinalistCount: hackathon.shortlistFinalistCount,
    pitchPresentationSubmissionIds,
    activePitchPresentationSubmissionId: hackathon.activePitchPresentationSubmissionId,
    pitchPresentationsCompletedAt: hackathon.pitchPresentationsCompletedAt,
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
    requireSubmissionDemoUrl: hackathon.requireSubmissionDemoUrl,
    currentApplicationTermsDocumentId: hackathon.currentApplicationTermsDocumentId,
    currentWinnerTermsDocumentId: hackathon.currentWinnerTermsDocumentId,
    createdByUserId: hackathon.createdByUserId,
    createdAt: hackathon.createdAt,
    updatedAt: hackathon.updatedAt,
    ...(tracks
      ? {
          tracks: tracks.map(serializeHackathonTrack)
        }
      : {}),
    ...(currentTerms
      ? {
          currentTerms: {
            applicationTerms: currentTerms.applicationTerms ? serializeHackathonTermsDocument(currentTerms.applicationTerms) : null,
            winnerTerms: currentTerms.winnerTerms ? serializeHackathonTermsDocument(currentTerms.winnerTerms) : null
          }
        }
      : {})
  }
}

export function serializePublicHackathonTermsReference(document: HackathonTermsDocumentRecord) {
  return {
    documentType: document.documentType,
    version: document.version,
    title: document.title,
    publishedAt: document.publishedAt
  }
}

export function serializePublicHackathon(
  hackathon: HackathonRecord,
  currentTerms?: {
    applicationTerms: HackathonTermsDocumentRecord | null
    winnerTerms: HackathonTermsDocumentRecord | null
  },
  tracks?: HackathonTrackRecord[]
) {
  return {
    name: hackathon.name,
    slug: hackathon.slug,
    description: hackathon.description,
    agendaItems: parseHackathonAgendaItems(hackathon.agendaItemsJson),
    backgroundImageUrl: hackathon.backgroundImageUrl,
    bannerImageUrl: hackathon.bannerImageUrl,
    lumaEventUrl: hackathon.lumaEventUrl,
    city: hackathon.city,
    country: hackathon.country,
    address: '',
    registrationOpensAt: hackathon.registrationOpensAt,
    registrationClosesAt: hackathon.registrationClosesAt,
    submissionOpensAt: hackathon.submissionOpensAt,
    submissionClosesAt: hackathon.submissionClosesAt,
    state: hackathon.state,
    maxTeamMembers: hackathon.maxTeamMembers,
    participantsLimit: hackathon.participantsLimit,
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
    requireSubmissionDemoUrl: hackathon.requireSubmissionDemoUrl,
    ...(tracks
      ? {
          tracks: tracks.map(serializePublicHackathonTrack)
        }
      : {}),
    ...(currentTerms
      ? {
          currentTerms: {
            applicationTerms: currentTerms.applicationTerms ? serializePublicHackathonTermsReference(currentTerms.applicationTerms) : null,
            winnerTerms: currentTerms.winnerTerms ? serializePublicHackathonTermsReference(currentTerms.winnerTerms) : null
          }
        }
      : {})
  }
}

export function serializeHackathonRoleAssignment(
  assignment: HackathonRoleAssignmentRecord,
  user?: typeof users.$inferSelect | null
) {
  return {
    id: assignment.id,
    hackathonId: assignment.hackathonId,
    userId: assignment.userId,
    role: assignment.role,
    isInJudgePool: assignment.isInJudgePool,
    isStaff: assignment.isStaff,
    createdAt: assignment.createdAt,
    ...(user
      ? {
          user: serializeHackathonRoleUserSummary(user)
        }
      : {})
  }
}

export function serializeHackathonRoleUserSummary(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isPlatformAdmin: user.isPlatformAdmin
  }
}

export function serializePublishedHackathonRosterMember(user: UserRecord) {
  return {
    id: user.id,
    fullName: buildPublishedHackathonRosterFullName(user),
    company: user.company,
    bio: user.bio,
    xProfileUrl: user.xProfileUrl,
    linkedinProfileUrl: user.linkedinProfileUrl,
    githubProfileUrl: user.githubProfileUrl,
    profileIconUpdatedAt: user.profileIconUpdatedAt
  }
}

export function buildPublicWinnerProfileIconUrl(
  hackathonSlug: string,
  userId: string,
  profileIconUpdatedAt: string | null | undefined
) {
  const normalizedVersion = profileIconUpdatedAt?.trim()

  if (!normalizedVersion) {
    return null
  }

  const searchParams = new URLSearchParams({
    v: normalizedVersion
  })

  return `/api/public/hackathons/${encodeURIComponent(hackathonSlug)}/winners/${encodeURIComponent(userId)}/profile-icon?${searchParams.toString()}`
}

export function serializeHackathonWinnerTeamMember(
  user: UserRecord,
  hackathonSlug: string
) {
  const member = serializePublishedHackathonRosterMember(user)

  return {
    id: member.id,
    fullName: member.fullName,
    bio: member.bio,
    xProfileUrl: member.xProfileUrl,
    linkedinProfileUrl: member.linkedinProfileUrl,
    githubProfileUrl: member.githubProfileUrl,
    profileIconUrl: buildPublicWinnerProfileIconUrl(
      hackathonSlug,
      user.id,
      user.profileIconUpdatedAt
    )
  }
}

export function serializeHackathonTermsDocument(document: HackathonTermsDocumentRecord) {
  return {
    id: document.id,
    hackathonId: document.hackathonId,
    documentType: document.documentType,
    version: document.version,
    title: document.title,
    content: document.content,
    publishedAt: document.publishedAt,
    createdAt: document.createdAt
  }
}

export function serializeEvaluationCriterion(criterion: EvaluationCriterionRecord) {
  return {
    id: criterion.id,
    hackathonId: criterion.hackathonId,
    name: criterion.name,
    description: criterion.description,
    weight: criterion.weight,
    displayOrder: criterion.displayOrder,
    createdAt: criterion.createdAt
  }
}

export function serializePublicEvaluationCriterion(criterion: EvaluationCriterionRecord) {
  return {
    name: criterion.name,
    description: criterion.description,
    weight: criterion.weight,
    displayOrder: criterion.displayOrder
  }
}

export function serializePrize(prize: PrizeRecord) {
  return {
    id: prize.id,
    hackathonId: prize.hackathonId,
    name: prize.name,
    description: prize.description,
    rewardType: prize.rewardType,
    rewardValue: prize.rewardValue,
    rewardCurrency: prize.rewardCurrency,
    awardScope: prize.awardScope,
    rankStart: prize.rankStart,
    rankEnd: prize.rankEnd,
    displayOrder: prize.displayOrder,
    createdAt: prize.createdAt
  }
}

export function assertPrizeConfigurationEditable(
  hackathon: Pick<HackathonRecord, 'id' | 'state'>
) {
  assertAllowedState(
    hackathon.state,
    [
      'draft',
      'registration_open',
      'submission_open',
      'judging_preparation',
      'blind_review',
      'shortlist',
      'pitch',
      'pitch_review',
      'final_deliberation'
    ],
    {
      code: 'prize_configuration_locked',
      message: 'Prize definitions are locked once winners are announced.',
      details: {
        hackathonId: hackathon.id
      }
    }
  )
}

export function serializePublicPrize(prize: PrizeRecord) {
  return {
    name: prize.name,
    description: prize.description,
    rewardType: prize.rewardType,
    rewardValue: prize.rewardValue,
    rewardCurrency: prize.rewardCurrency,
    awardScope: prize.awardScope,
    rankStart: prize.rankStart,
    rankEnd: prize.rankEnd,
    displayOrder: prize.displayOrder
  }
}

export async function assertHackathonSlugAvailable(
  database: AppDatabase,
  slug: string,
  excludingHackathonId?: string
) {
  const conflict = await database.query.hackathons.findFirst({
    where: eq(hackathons.slug, slug)
  })

  if (conflict && conflict.id !== excludingHackathonId) {
    throw new ApiError({
      statusCode: 409,
      code: 'hackathon_slug_conflict',
      message: 'A hackathon with this slug already exists.',
      details: { slug }
    })
  }
}

export async function assertEvaluationCriterionDisplayOrderAvailable(
  database: AppDatabase,
  hackathonId: string,
  displayOrder: number,
  excludingCriterionId?: string
) {
  const conflict = await database.query.evaluationCriteria.findFirst({
    where: and(
      eq(evaluationCriteria.hackathonId, hackathonId),
      eq(evaluationCriteria.displayOrder, displayOrder)
    )
  })

  if (conflict && conflict.id !== excludingCriterionId) {
    throw new ApiError({
      statusCode: 409,
      code: 'evaluation_criterion_display_order_conflict',
      message: 'Evaluation criterion displayOrder must be unique within the hackathon.',
      details: {
        hackathonId,
        displayOrder
      }
    })
  }
}

export async function getNextHackathonTermsVersion(
  database: AppDatabase,
  hackathonId: string,
  documentType: typeof hackathonTermsDocumentTypes[number]
) {
  const latestDocument = await database.query.hackathonTermsDocuments.findFirst({
    where: and(
      eq(hackathonTermsDocuments.hackathonId, hackathonId),
      eq(hackathonTermsDocuments.documentType, documentType)
    ),
    orderBy: [desc(hackathonTermsDocuments.version)]
  })

  return latestDocument ? latestDocument.version + 1 : 1
}

export async function getActiveUserOrThrow(database: AppDatabase, userId: string) {
  const user = await database.query.users.findFirst({
    where: and(eq(users.id, userId), isNull(users.deletedAt))
  })

  if (!user) {
    throw new ApiError({
      statusCode: 404,
      code: 'user_not_found',
      message: 'The requested user was not found.',
      details: { userId }
    })
  }

  return user
}

export async function getRoleAssignmentOrThrow(
  database: AppDatabase,
  hackathonId: string,
  userId: string
) {
  const assignment = await database.query.hackathonRoleAssignments.findFirst({
    where: and(
      eq(hackathonRoleAssignments.hackathonId, hackathonId),
      eq(hackathonRoleAssignments.userId, userId)
    )
  })

  if (!assignment) {
    throw new ApiError({
      statusCode: 404,
      code: 'hackathon_role_assignment_not_found',
      message: 'The requested hackathon role assignment was not found.',
      details: {
        hackathonId,
        userId
      }
    })
  }

  return assignment
}

export async function getHackathonTermsDocumentOrThrow(
  database: AppDatabase,
  hackathonId: string,
  hackathonTermsDocumentId: string
) {
  const document = await database.query.hackathonTermsDocuments.findFirst({
    where: and(
      eq(hackathonTermsDocuments.id, hackathonTermsDocumentId),
      eq(hackathonTermsDocuments.hackathonId, hackathonId)
    )
  })

  if (!document) {
    throw new ApiError({
      statusCode: 404,
      code: 'hackathon_terms_document_not_found',
      message: 'The requested hackathon terms document was not found.',
      details: {
        hackathonId,
        hackathonTermsDocumentId
      }
    })
  }

  return document
}

export async function getEvaluationCriterionOrThrow(
  database: AppDatabase,
  hackathonId: string,
  criterionId: string
) {
  const criterion = await database.query.evaluationCriteria.findFirst({
    where: and(
      eq(evaluationCriteria.id, criterionId),
      eq(evaluationCriteria.hackathonId, hackathonId)
    )
  })

  if (!criterion) {
    throw new ApiError({
      statusCode: 404,
      code: 'evaluation_criterion_not_found',
      message: 'The requested evaluation criterion was not found.',
      details: {
        hackathonId,
        criterionId
      }
    })
  }

  return criterion
}

export async function getPrizeOrThrow(
  database: AppDatabase,
  hackathonId: string,
  prizeId: string
) {
  const prize = await database.query.prizes.findFirst({
    where: and(
      eq(prizes.id, prizeId),
      eq(prizes.hackathonId, hackathonId)
    )
  })

  if (!prize) {
    throw new ApiError({
      statusCode: 404,
      code: 'prize_not_found',
      message: 'The requested prize was not found.',
      details: {
        hackathonId,
        prizeId
      }
    })
  }

  return prize
}

export function assertOpenSubmissionAllowed(hackathon: HackathonRecord, now = new Date()) {
  assertAllowedState(hackathon.state, ['registration_open'], {
    code: 'hackathon_state_invalid',
    message: 'Submission can only be opened from registration_open.',
    details: { hackathonId: hackathon.id }
  })

  const nowTimestamp = now.getTime()
  const registrationClosesAt = Date.parse(hackathon.registrationClosesAt)
  const submissionOpensAt = Date.parse(hackathon.submissionOpensAt)
  const submissionClosesAt = Date.parse(hackathon.submissionClosesAt)

  assertGuard(nowTimestamp >= registrationClosesAt, {
    code: 'registration_window_still_open',
    message: 'Submission cannot be opened before registration closes.',
    details: { hackathonId: hackathon.id }
  })

  assertGuard(nowTimestamp >= submissionOpensAt && nowTimestamp < submissionClosesAt, {
    code: 'submission_window_closed',
    message: 'Submission can only be opened while the configured submission window is open.',
    details: { hackathonId: hackathon.id }
  })
}

export function assertOpenRegistrationAllowed(hackathon: HackathonRecord, now = new Date()) {
  assertAllowedState(hackathon.state, ['draft'], {
    code: 'hackathon_state_invalid',
    message: 'Registration can only be opened from draft.',
    details: { hackathonId: hackathon.id }
  })

  const nowTimestamp = now.getTime()
  const registrationOpensAt = Date.parse(hackathon.registrationOpensAt)
  const registrationClosesAt = Date.parse(hackathon.registrationClosesAt)

  assertGuard(nowTimestamp >= registrationOpensAt, {
    code: 'registration_window_not_open_yet',
    message: 'Registration cannot be opened before the configured registration window starts.',
    details: { hackathonId: hackathon.id }
  })

  assertGuard(nowTimestamp < registrationClosesAt, {
    code: 'registration_window_closed',
    message: 'Registration can only be opened while the configured registration window is open.',
    details: { hackathonId: hackathon.id }
  })
}
