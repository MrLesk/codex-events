import type { H3Event } from 'h3'

import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { requirePlatformActor } from '../auth/actor'
import { getDatabase, type AppDatabase } from '../database/client'
import {
  userApplications,
  users
} from '../database/schema'
import type {
  hackathonTermsDocuments,
  hackathons
} from '../database/schema'
import { ApiError } from './api-error'
import {
  getCurrentHackathonTerms,
  getHackathonTermsDocumentOrThrow,
  getVisibleHackathonOrThrow,
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathonTermsDocument
} from './hackathon-management'
import { assertAllowedState, assertGuard } from './lifecycle-guard'

export const applicationParamsSchema = routeIdParamsSchema.extend({
  applicationId: z.string().trim().min(1)
})

export const registrationTeamIntentValues = ['solo', 'team', 'unknown'] as const

const registrationTeamMemberHintSchema = z.object({
  fullName: z.string().max(200).optional().nullable(),
  email: z.string().email().max(320).optional().nullable()
})

export const submitApplicationBodySchema = z.object({
  applicationTermsDocumentId: z.string().trim().min(1),
  registrationTeamIntent: z.enum(registrationTeamIntentValues).default('unknown'),
  registrationTeamMembers: z.array(registrationTeamMemberHintSchema).default([]),
  inPersonAttendanceCommitment: z.boolean().default(false),
  whyThisHackathon: z.string().trim().max(4000).default(''),
  proofOfExecutionUrl: z.string().trim().max(2048).default('')
})

type UserApplicationRecord = typeof userApplications.$inferSelect
type UserRecord = typeof users.$inferSelect
type HackathonRecord = typeof hackathons.$inferSelect
type HackathonTermsDocumentRecord = typeof hackathonTermsDocuments.$inferSelect
type SubmitApplicationBody = z.infer<typeof submitApplicationBodySchema>

function normalizeTeamMemberHintValue(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeTextValue(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeProofOfExecutionUrl(value: string | null | undefined) {
  const normalized = normalizeTextValue(value)

  if (!normalized) {
    return ''
  }

  assertGuard(isHttpUrl(normalized), {
    code: 'proof_of_execution_url_invalid',
    message: 'Proof of execution URL must use the http or https scheme.'
  })

  return normalized
}

export function serializeRegistrationDetailsJson(
  hackathon: Pick<HackathonRecord, 'id' | 'maxTeamMembers' | 'inPersonEvent' | 'requireWhyThisHackathon' | 'requireProofOfExecution'>,
  payload: Pick<SubmitApplicationBody, 'registrationTeamIntent' | 'registrationTeamMembers' | 'inPersonAttendanceCommitment' | 'whyThisHackathon' | 'proofOfExecutionUrl'>
) {
  assertGuard(payload.registrationTeamMembers.length <= hackathon.maxTeamMembers, {
    code: 'registration_team_members_invalid',
    message: 'The provided team-member registration hints exceed the maximum team size for this hackathon.',
    details: {
      hackathonId: hackathon.id,
      maxTeamMembers: hackathon.maxTeamMembers
    }
  })

  const normalizedTeamMembers = payload.registrationTeamIntent === 'team'
    ? payload.registrationTeamMembers
        .slice(0, hackathon.maxTeamMembers)
        .map((member) => {
          const fullName = normalizeTeamMemberHintValue(member.fullName)
          const email = normalizeTeamMemberHintValue(member.email)

          if (!fullName && !email) {
            return null
          }

          return {
            ...(fullName ? { fullName } : {}),
            ...(email ? { email } : {})
          }
        })
        .filter((member): member is { fullName?: string, email?: string } => Boolean(member))
    : []

  const whyThisHackathon = normalizeTextValue(payload.whyThisHackathon)
  const proofOfExecutionUrl = normalizeProofOfExecutionUrl(payload.proofOfExecutionUrl)

  assertGuard(!hackathon.requireWhyThisHackathon || whyThisHackathon.length > 0, {
    code: 'why_this_hackathon_required',
    message: 'A why-this-hackathon response is required for this hackathon.',
    details: {
      hackathonId: hackathon.id
    }
  })

  assertGuard(!hackathon.requireProofOfExecution || proofOfExecutionUrl.length > 0, {
    code: 'proof_of_execution_required',
    message: 'A proof-of-execution URL is required for this hackathon.',
    details: {
      hackathonId: hackathon.id
    }
  })

  return JSON.stringify({
    teamIntent: payload.registrationTeamIntent,
    teamMembers: normalizedTeamMembers,
    inPersonAttendanceCommitment: hackathon.inPersonEvent ? payload.inPersonAttendanceCommitment : false,
    whyThisHackathon,
    proofOfExecutionUrl
  })
}

export function assertInPersonAttendanceCommitment(
  hackathon: Pick<HackathonRecord, 'id' | 'inPersonEvent'>,
  payload: Pick<SubmitApplicationBody, 'inPersonAttendanceCommitment'>
) {
  if (!hackathon.inPersonEvent) {
    return
  }

  assertGuard(payload.inPersonAttendanceCommitment === true, {
    code: 'in_person_attendance_commitment_required',
    message: 'In-person hackathons require explicit in-person attendance commitment before application submission.',
    details: {
      hackathonId: hackathon.id
    }
  })
}

export function serializeUserApplication(
  application: UserApplicationRecord,
  options?: {
    user?: UserRecord | null
    applicationTermsDocument?: HackathonTermsDocumentRecord | null
  }
) {
  return {
    id: application.id,
    hackathonId: application.hackathonId,
    userId: application.userId,
    status: application.status,
    submittedAt: application.submittedAt,
    reviewedAt: application.reviewedAt,
    reviewedByUserId: application.reviewedByUserId,
    applicationTermsDocumentId: application.applicationTermsDocumentId,
    applicationTermsAcceptedAt: application.applicationTermsAcceptedAt,
    registrationDetailsJson: application.registrationDetailsJson,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    ...(options?.user
      ? {
          user: {
            id: options.user.id,
            email: options.user.email,
            displayName: options.user.displayName,
            xProfileUrl: options.user.xProfileUrl,
            linkedinProfileUrl: options.user.linkedinProfileUrl,
            githubProfileUrl: options.user.githubProfileUrl,
            chatgptEmail: options.user.chatgptEmail,
            openaiOrgId: options.user.openaiOrgId,
            lumaUsername: options.user.lumaUsername
          }
        }
      : {}),
    ...(options?.applicationTermsDocument
      ? {
          applicationTermsDocument: serializeHackathonTermsDocument(options.applicationTermsDocument)
        }
      : {})
  }
}

export function assertHackathonAllowsApplications(hackathon: HackathonRecord) {
  assertAllowedState(hackathon.state, ['registration_open'], {
    code: 'hackathon_state_invalid',
    message: 'Applications can only be submitted while registration is open.',
    details: { hackathonId: hackathon.id }
  })
}

export function assertUserMeetsHackathonProfileRequirements(user: UserRecord, hackathon: HackathonRecord) {
  const missingFields = []

  if (hackathon.requireXProfile && !user.xProfileUrl) {
    missingFields.push('xProfileUrl')
  }

  if (hackathon.requireLinkedinProfile && !user.linkedinProfileUrl) {
    missingFields.push('linkedinProfileUrl')
  }

  if (hackathon.requireGithubProfile && !user.githubProfileUrl) {
    missingFields.push('githubProfileUrl')
  }

  if (hackathon.requireChatgptEmail && !user.chatgptEmail) {
    missingFields.push('chatgptEmail')
  }

  if (hackathon.requireOpenaiOrgId && !user.openaiOrgId) {
    missingFields.push('openaiOrgId')
  }

  const hasLinkedLumaEvent = Boolean(hackathon.lumaEventUrl?.trim())

  if (hackathon.requireLumaProfile && hasLinkedLumaEvent && !user.lumaUsername) {
    missingFields.push('lumaUsername')
  }

  assertGuard(missingFields.length === 0, {
    code: 'required_profile_fields_missing',
    message: 'The user profile does not satisfy the hackathon registration requirements.',
    details: {
      hackathonId: hackathon.id,
      missingFields
    }
  })
}

export async function getOwnUserApplication(
  database: AppDatabase,
  hackathonId: string,
  userId: string
) {
  return await database.query.userApplications.findFirst({
    where: and(
      eq(userApplications.hackathonId, hackathonId),
      eq(userApplications.userId, userId)
    )
  })
}

export async function assertNoExistingApplication(
  database: AppDatabase,
  hackathonId: string,
  userId: string
) {
  const existingApplication = await getOwnUserApplication(database, hackathonId, userId)

  assertGuard(!existingApplication, {
    code: 'user_application_exists',
    message: 'A user can submit at most one application per hackathon.',
    details: {
      hackathonId,
      userId
    }
  })
}

export async function getCurrentApplicationTermsDocumentOrThrow(
  database: AppDatabase,
  hackathon: HackathonRecord
) {
  const currentTerms = await getCurrentHackathonTerms(database, hackathon)
  const document = currentTerms.applicationTerms

  if (!document) {
    throw new ApiError({
      statusCode: 409,
      code: 'application_terms_unavailable',
      message: 'The hackathon does not currently expose application terms for acceptance.',
      details: {
        hackathonId: hackathon.id
      }
    })
  }

  return document
}

export async function assertCurrentApplicationTermsAcceptance(
  database: AppDatabase,
  hackathon: HackathonRecord,
  applicationTermsDocumentId: string
) {
  const document = await getHackathonTermsDocumentOrThrow(database, hackathon.id, applicationTermsDocumentId)

  assertGuard(document.documentType === 'application_terms', {
    code: 'hackathon_terms_document_type_mismatch',
    message: 'The selected hackathon terms document does not match the application_terms document type.',
    details: {
      hackathonId: hackathon.id,
      hackathonTermsDocumentId: document.id,
      documentType: document.documentType
    }
  })

  const currentDocument = await getCurrentApplicationTermsDocumentOrThrow(database, hackathon)

  assertGuard(currentDocument.id === document.id, {
    code: 'application_terms_document_outdated',
    message: 'Application submission requires acceptance of the current application terms document.',
    details: {
      hackathonId: hackathon.id,
      acceptedHackathonTermsDocumentId: document.id,
      currentHackathonTermsDocumentId: currentDocument.id,
      currentVersion: currentDocument.version
    }
  })

  return currentDocument
}

export async function getApplicationOrThrow(
  database: AppDatabase,
  hackathonId: string,
  applicationId: string
) {
  const application = await database.query.userApplications.findFirst({
    where: and(
      eq(userApplications.id, applicationId),
      eq(userApplications.hackathonId, hackathonId)
    )
  })

  if (!application) {
    throw new ApiError({
      statusCode: 404,
      code: 'user_application_not_found',
      message: 'The requested user application was not found.',
      details: {
        hackathonId,
        applicationId
      }
    })
  }

  return application
}

export function assertApplicationReviewable(application: UserApplicationRecord) {
  assertAllowedState(application.status, ['submitted'], {
    code: 'user_application_state_invalid',
    message: 'Only submitted applications can be reviewed.',
    details: {
      applicationId: application.id
    }
  })
}

export async function requireApprovedUserForHackathon(event: H3Event, hackathonId: string) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const application = await getOwnUserApplication(database, hackathonId, actor.platformUser.id)

  assertGuard(application?.status === 'approved', {
    code: 'approved_user_required',
    message: 'This operation requires an approved application for the hackathon.',
    details: {
      hackathonId,
      userId: actor.platformUser.id
    },
    statusCode: 403
  })

  return {
    actor,
    hackathon,
    application
  }
}

export async function listHackathonApplications(database: AppDatabase, hackathonId: string) {
  const applications = await database.query.userApplications.findMany({
    where: eq(userApplications.hackathonId, hackathonId),
    orderBy: [desc(userApplications.submittedAt), asc(userApplications.createdAt)]
  })

  const usersById = new Map<string, UserRecord>()

  if (applications.length > 0) {
    const relatedUsers = await database.query.users.findMany({
      where: and(
        inArray(users.id, applications.map(application => application.userId)),
        isNull(users.deletedAt)
      )
    })

    for (const user of relatedUsers) {
      usersById.set(user.id, user)
    }
  }

  return applications.map(application =>
    serializeUserApplication(application, {
      user: usersById.get(application.userId) ?? null
    })
  )
}

export async function requireHackathonAdminApplicationContext(event: H3Event, hackathonId: string) {
  const { hackathon, authorization } = await requireHackathonAdmin(event, hackathonId)

  return {
    hackathon,
    authorization,
    database: getDatabase(event)
  }
}

export async function getUserApplicationWithTermsOrThrow(
  database: AppDatabase,
  hackathonId: string,
  applicationId: string
) {
  const application = await getApplicationOrThrow(database, hackathonId, applicationId)
  const applicationTermsDocument = await getHackathonTermsDocumentOrThrow(
    database,
    hackathonId,
    application.applicationTermsDocumentId
  )

  return {
    application,
    applicationTermsDocument
  }
}
