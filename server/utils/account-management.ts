import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import type { AuthenticatedIdentityActor } from '../auth/actor'
import type { AppDatabase } from '../database/client'
import {
  hackathonRoleAssignments,
  platformDocuments,
  userPlatformDocumentAcceptances,
  users
} from '../database/schema'
import { buildAuditLogInsert, writeAuditLog } from '../database/audit-log'
import { ApiError } from './api-error'
import { assertGuard } from './lifecycle-guard'
import { assertCurrentPlatformDocument, getCurrentPlatformDocument } from './platform-documents'

function sanitizeTimestampForIdentifier(timestamp: string) {
  return timestamp.replaceAll(/[^0-9]/g, '')
}

const profileUrlSchema = z
  .union([z.string().trim().url(), z.literal(''), z.null()])
  .optional()

export const platformAccountRegistrationBodySchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  privacyPolicyDocumentId: z.string().trim().min(1),
  platformTermsDocumentId: z.string().trim().min(1),
  xProfileUrl: profileUrlSchema,
  linkedinProfileUrl: profileUrlSchema,
  githubProfileUrl: profileUrlSchema,
  lumaUsername: z.string().trim().max(120).optional()
})

export const platformAccountProfileBodySchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  xProfileUrl: profileUrlSchema,
  linkedinProfileUrl: profileUrlSchema,
  githubProfileUrl: profileUrlSchema,
  lumaUsername: z.string().trim().max(120).optional()
})

type PlatformUserRecord = typeof users.$inferSelect
type PlatformAccountRegistrationInput = z.infer<typeof platformAccountRegistrationBodySchema>
type PlatformAccountProfileInput = z.infer<typeof platformAccountProfileBodySchema>

function normalizeOptionalUrl(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export function serializePlatformUser(user: PlatformUserRecord) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isPlatformAdmin: user.isPlatformAdmin,
    xProfileUrl: user.xProfileUrl,
    linkedinProfileUrl: user.linkedinProfileUrl,
    githubProfileUrl: user.githubProfileUrl,
    lumaUsername: user.lumaUsername,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt
  }
}

function buildPlatformAccountInsert(
  actor: AuthenticatedIdentityActor,
  input: PlatformAccountRegistrationInput,
  createdAt: string
) {
  const email = actor.sessionUser.email?.trim()

  assertGuard(Boolean(email), {
    statusCode: 409,
    code: 'identity_email_unavailable',
    message: 'The authenticated identity does not expose an email address required for platform account registration.'
  })

  return {
    id: crypto.randomUUID(),
    auth0Subject: actor.sessionUser.sub,
    email: email!,
    displayName: input.displayName.trim(),
    isPlatformAdmin: false,
    xProfileUrl: normalizeOptionalUrl(input.xProfileUrl),
    linkedinProfileUrl: normalizeOptionalUrl(input.linkedinProfileUrl),
    githubProfileUrl: normalizeOptionalUrl(input.githubProfileUrl),
    lumaUsername: input.lumaUsername?.trim() || null,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null
  } satisfies typeof users.$inferInsert
}

function buildPlatformAccountProfilePatch(input: PlatformAccountProfileInput, updatedAt: string) {
  return {
    displayName: input.displayName.trim(),
    ...(input.xProfileUrl !== undefined
      ? { xProfileUrl: normalizeOptionalUrl(input.xProfileUrl) }
      : {}),
    ...(input.linkedinProfileUrl !== undefined
      ? { linkedinProfileUrl: normalizeOptionalUrl(input.linkedinProfileUrl) }
      : {}),
    ...(input.githubProfileUrl !== undefined
      ? { githubProfileUrl: normalizeOptionalUrl(input.githubProfileUrl) }
      : {}),
    ...(input.lumaUsername !== undefined
      ? { lumaUsername: input.lumaUsername.trim() || null }
      : {}),
    updatedAt
  } satisfies Partial<typeof users.$inferInsert>
}

async function requirePlatformDocumentById(
  database: AppDatabase,
  platformDocumentId: string,
  expectedDocumentType: 'privacy_policy' | 'platform_terms'
) {
  const document = await database.query.platformDocuments.findFirst({
    where: eq(platformDocuments.id, platformDocumentId)
  })

  if (!document) {
    throw new ApiError({
      statusCode: 404,
      code: 'platform_document_not_found',
      message: 'The requested platform document was not found.',
      details: {
        platformDocumentId
      }
    })
  }

  const currentDocument = await getCurrentPlatformDocument(database, expectedDocumentType)
  assertCurrentPlatformDocument(document, currentDocument ?? undefined, expectedDocumentType)

  return document
}

async function assertPlatformAccountRegistrationAllowed(
  database: AppDatabase,
  actor: AuthenticatedIdentityActor
) {
  const existingSubject = await database.query.users.findFirst({
    where: and(
      eq(users.auth0Subject, actor.sessionUser.sub),
      isNull(users.deletedAt)
    )
  })

  assertGuard(!existingSubject, {
    code: 'platform_account_already_exists',
    message: 'A platform account already exists for the authenticated identity.'
  })

  const email = actor.sessionUser.email?.trim()

  assertGuard(Boolean(email), {
    statusCode: 409,
    code: 'identity_email_unavailable',
    message: 'The authenticated identity does not expose an email address required for platform account registration.'
  })

  const existingEmail = await database.query.users.findFirst({
    where: and(
      eq(users.email, email!),
      isNull(users.deletedAt)
    )
  })

  assertGuard(!existingEmail, {
    code: 'platform_account_email_conflict',
    message: 'An active platform account already exists for this email address.',
    details: {
      email
    }
  })
}

export async function registerPlatformAccount(
  database: AppDatabase,
  actor: AuthenticatedIdentityActor,
  input: PlatformAccountRegistrationInput
) {
  await assertPlatformAccountRegistrationAllowed(database, actor)

  const [privacyPolicyDocument, platformTermsDocument] = await Promise.all([
    requirePlatformDocumentById(database, input.privacyPolicyDocumentId, 'privacy_policy'),
    requirePlatformDocumentById(database, input.platformTermsDocumentId, 'platform_terms')
  ])

  const createdAt = new Date().toISOString()
  const userRecord = buildPlatformAccountInsert(actor, input, createdAt)
  const acceptanceRows = [
    {
      id: crypto.randomUUID(),
      userId: userRecord.id,
      platformDocumentId: privacyPolicyDocument.id,
      acceptedAt: createdAt
    },
    {
      id: crypto.randomUUID(),
      userId: userRecord.id,
      platformDocumentId: platformTermsDocument.id,
      acceptedAt: createdAt
    }
  ] satisfies Array<typeof userPlatformDocumentAcceptances.$inferInsert>

  await database.batch([
    database.insert(users).values(userRecord),
    database.insert(userPlatformDocumentAcceptances).values(acceptanceRows),
    buildAuditLogInsert(database, {
      actorUserId: userRecord.id,
      entityType: 'user',
      entityId: userRecord.id,
      action: 'account.registered',
      metadata: {
        privacyPolicyDocumentId: privacyPolicyDocument.id,
        platformTermsDocumentId: platformTermsDocument.id
      }
    }).query
  ])

  return {
    user: serializePlatformUser(userRecord),
    acceptedDocumentIds: {
      privacyPolicyDocumentId: privacyPolicyDocument.id,
      platformTermsDocumentId: platformTermsDocument.id
    }
  }
}

export async function updatePlatformAccountProfile(
  database: AppDatabase,
  userId: string,
  input: PlatformAccountProfileInput
) {
  const updatedAt = new Date().toISOString()
  const patch = buildPlatformAccountProfilePatch(input, updatedAt)

  await database
    .update(users)
    .set(patch)
    .where(eq(users.id, userId))

  await writeAuditLog(database, {
    actorUserId: userId,
    entityType: 'user',
    entityId: userId,
    action: 'account.updated',
    metadata: {
      fields: Object.keys(patch)
    }
  })

  const updatedUser = await database.query.users.findFirst({
    where: eq(users.id, userId)
  })

  assertGuard(Boolean(updatedUser), {
    statusCode: 404,
    code: 'platform_user_not_found',
    message: 'The requested platform user was not found.',
    details: {
      userId
    }
  })

  return serializePlatformUser(updatedUser!)
}

export function buildDeletedUserPatch(userId: string, deletedAt: string) {
  const suffix = `${userId}_${sanitizeTimestampForIdentifier(deletedAt)}`

  return {
    auth0Subject: `deleted_${suffix}`,
    email: `deleted_${suffix}@deleted.invalid`,
    displayName: 'Deleted User',
    isPlatformAdmin: false,
    xProfileUrl: null,
    linkedinProfileUrl: null,
    githubProfileUrl: null,
    lumaUsername: null,
    updatedAt: deletedAt,
    deletedAt
  } satisfies Partial<typeof users.$inferInsert>
}

export async function deletePlatformAccount(
  database: AppDatabase,
  actor: {
    userId: string
  }
) {
  const deletedAt = new Date().toISOString()
  const deletedUserPatch = buildDeletedUserPatch(actor.userId, deletedAt)

  await database.batch([
    database
      .update(users)
      .set(deletedUserPatch)
      .where(eq(users.id, actor.userId)),
    database
      .delete(userPlatformDocumentAcceptances)
      .where(eq(userPlatformDocumentAcceptances.userId, actor.userId)),
    database
      .delete(hackathonRoleAssignments)
      .where(eq(hackathonRoleAssignments.userId, actor.userId)),
    buildAuditLogInsert(database, {
      actorUserId: actor.userId,
      entityType: 'user',
      entityId: actor.userId,
      action: 'account.deleted',
      metadata: {
        deletedAt
      }
    }).query
  ])

  return {
    userId: actor.userId,
    deletedAt
  }
}
