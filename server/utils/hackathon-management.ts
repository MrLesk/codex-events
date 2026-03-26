import type { H3Event } from 'h3'

import { and, count, desc, eq, inArray, isNull, like, or } from 'drizzle-orm'
import { z } from 'zod'

import { getRequestActor } from '../auth/actor'
import {
  assertHackathonAdminAccess,
  resolveHackathonAuthorization
} from '../auth/authorization'
import { getDatabase, type AppDatabase } from '../database/client'
import {
  evaluationCriteria,
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

const hackathonConfigShape = {
  name: z.string().trim().min(1),
  slug: slugSchema,
  description: z.string().trim().min(1),
  backgroundImageUrl: nullableUrlSchema,
  bannerImageUrl: nullableUrlSchema,
  city: z.string().trim().min(1),
  address: z.string().trim().min(1),
  registrationOpensAt: isoTimestampSchema,
  registrationClosesAt: isoTimestampSchema,
  submissionOpensAt: isoTimestampSchema,
  submissionClosesAt: isoTimestampSchema,
  maxTeamMembers: z.coerce.number().int().min(1),
  requireXProfile: z.coerce.boolean().default(false),
  requireLinkedinProfile: z.coerce.boolean().default(false),
  requireGithubProfile: z.coerce.boolean().default(false),
  requireChatgptEmail: z.coerce.boolean().default(false),
  requireOpenaiOrgId: z.coerce.boolean().default(false),
  requireLumaProfile: z.coerce.boolean().default(false)
} satisfies Record<string, z.ZodTypeAny>

export const createHackathonBodySchema = z.object(hackathonConfigShape)
export const updateHackathonBodySchema = z.object({
  name: hackathonConfigShape.name.optional(),
  slug: hackathonConfigShape.slug.optional(),
  description: hackathonConfigShape.description.optional(),
  backgroundImageUrl: hackathonConfigShape.backgroundImageUrl.optional(),
  bannerImageUrl: hackathonConfigShape.bannerImageUrl.optional(),
  city: hackathonConfigShape.city.optional(),
  address: hackathonConfigShape.address.optional(),
  registrationOpensAt: hackathonConfigShape.registrationOpensAt.optional(),
  registrationClosesAt: hackathonConfigShape.registrationClosesAt.optional(),
  submissionOpensAt: hackathonConfigShape.submissionOpensAt.optional(),
  submissionClosesAt: hackathonConfigShape.submissionClosesAt.optional(),
  maxTeamMembers: hackathonConfigShape.maxTeamMembers.optional(),
  requireXProfile: hackathonConfigShape.requireXProfile.optional(),
  requireLinkedinProfile: hackathonConfigShape.requireLinkedinProfile.optional(),
  requireGithubProfile: hackathonConfigShape.requireGithubProfile.optional(),
  requireChatgptEmail: hackathonConfigShape.requireChatgptEmail.optional(),
  requireOpenaiOrgId: hackathonConfigShape.requireOpenaiOrgId.optional(),
  requireLumaProfile: hackathonConfigShape.requireLumaProfile.optional()
}).refine(
  input => Object.keys(input).length > 0,
  'At least one hackathon configuration field must be provided.'
)

export const roleAssignmentParamsSchema = routeIdParamsSchema.extend({
  userId: z.string().trim().min(1)
})

export const roleAssignmentUpsertBodySchema = z.object({
  role: roleEnumSchema,
  isInJudgePool: z.coerce.boolean()
})

export const roleAssignmentPatchBodySchema = z.object({
  isInJudgePool: z.coerce.boolean()
})

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
  rankEnd: z.coerce.number().int().min(1)
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
  rankEnd: z.coerce.number().int().min(1).optional()
}).refine(
  input => Object.keys(input).length > 0,
  'At least one prize field must be provided.'
)

type HackathonRecord = typeof hackathons.$inferSelect
type HackathonRoleAssignmentRecord = typeof hackathonRoleAssignments.$inferSelect
type HackathonTermsDocumentRecord = typeof hackathonTermsDocuments.$inferSelect
type EvaluationCriterionRecord = typeof evaluationCriteria.$inferSelect
type PrizeRecord = typeof prizes.$inferSelect

const publicHackathonStates = [
  'registration_open',
  'submission_open',
  'judging_preparation',
  'judge_review',
  'shortlist',
  'winners_announced',
  'completed'
] as const

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
  adminHackathonIds: Set<string>
) {
  if (actor.kind !== 'platform_user') {
    return false
  }

  if (actor.platformUser.isPlatformAdmin) {
    return true
  }

  return adminHackathonIds.has(hackathonId)
}

export function assertRoleJudgePoolInvariant(role: typeof hackathonRoleTypes[number], isInJudgePool: boolean) {
  assertGuard(role !== 'judge' || isInJudgePool, {
    code: 'judge_pool_required',
    message: 'Judge role assignments must remain in the automatic judge pool.',
    details: {
      role,
      isInJudgePool
    }
  })
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
  const normalizedPatch: z.infer<typeof updateHackathonBodySchema> = {
    ...patch
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

async function getActorAdminHackathonIds(
  database: AppDatabase,
  actor: Awaited<ReturnType<typeof getRequestActor>>
) {
  if (actor.kind !== 'platform_user' || actor.platformUser.isPlatformAdmin) {
    return new Set<string>()
  }

  const assignments = await database.query.hackathonRoleAssignments.findMany({
    where: and(
      eq(hackathonRoleAssignments.userId, actor.platformUser.id),
      eq(hackathonRoleAssignments.role, 'hackathon_admin')
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

  const adminHackathonIds = await getActorAdminHackathonIds(database, actor)

  if (isDraftVisibleToActor(actor, hackathonId, adminHackathonIds)) {
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

  const adminHackathonIds = await getActorAdminHackathonIds(database, actor)

  if (isDraftVisibleToActor(actor, hackathon.id, adminHackathonIds)) {
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

  const adminHackathonIds = await getActorAdminHackathonIds(database, actor)
  const visibilityClauses = [
    ...buildPublicHackathonVisibilityClauses(),
    ...(adminHackathonIds.size > 0 ? [inArray(hackathons.id, [...adminHackathonIds])] : [])
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
  }
) {
  return {
    id: hackathon.id,
    name: hackathon.name,
    slug: hackathon.slug,
    description: hackathon.description,
    backgroundImageUrl: hackathon.backgroundImageUrl,
    bannerImageUrl: hackathon.bannerImageUrl,
    city: hackathon.city,
    address: hackathon.address,
    registrationOpensAt: hackathon.registrationOpensAt,
    registrationClosesAt: hackathon.registrationClosesAt,
    submissionOpensAt: hackathon.submissionOpensAt,
    submissionClosesAt: hackathon.submissionClosesAt,
    state: hackathon.state,
    maxTeamMembers: hackathon.maxTeamMembers,
    requireXProfile: hackathon.requireXProfile,
    requireLinkedinProfile: hackathon.requireLinkedinProfile,
    requireGithubProfile: hackathon.requireGithubProfile,
    requireChatgptEmail: hackathon.requireChatgptEmail,
    requireOpenaiOrgId: hackathon.requireOpenaiOrgId,
    requireLumaProfile: hackathon.requireLumaProfile,
    currentApplicationTermsDocumentId: hackathon.currentApplicationTermsDocumentId,
    currentWinnerTermsDocumentId: hackathon.currentWinnerTermsDocumentId,
    createdByUserId: hackathon.createdByUserId,
    createdAt: hackathon.createdAt,
    updatedAt: hackathon.updatedAt,
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
  }
) {
  return {
    name: hackathon.name,
    slug: hackathon.slug,
    description: hackathon.description,
    backgroundImageUrl: hackathon.backgroundImageUrl,
    bannerImageUrl: hackathon.bannerImageUrl,
    city: hackathon.city,
    address: hackathon.address,
    registrationOpensAt: hackathon.registrationOpensAt,
    registrationClosesAt: hackathon.registrationClosesAt,
    submissionOpensAt: hackathon.submissionOpensAt,
    submissionClosesAt: hackathon.submissionClosesAt,
    state: hackathon.state,
    maxTeamMembers: hackathon.maxTeamMembers,
    requireXProfile: hackathon.requireXProfile,
    requireLinkedinProfile: hackathon.requireLinkedinProfile,
    requireGithubProfile: hackathon.requireGithubProfile,
    requireChatgptEmail: hackathon.requireChatgptEmail,
    requireOpenaiOrgId: hackathon.requireOpenaiOrgId,
    requireLumaProfile: hackathon.requireLumaProfile,
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
    createdAt: assignment.createdAt,
    ...(user
      ? {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            isPlatformAdmin: user.isPlatformAdmin
          }
        }
      : {})
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
    createdAt: prize.createdAt
  }
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
    rankEnd: prize.rankEnd
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
