import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import type { AuthenticatedIdentityActor } from '#server/auth/actor'
import type { AppDatabase } from '#server/database/client'
import {
  hackathonRoleAssignments,
  platformDocuments,
  userAuthIdentities,
  userPlatformDocumentAcceptances,
  users
} from '#server/database/schema'
import { buildAuditLogInsert, writeAuditLog } from '#server/database/audit-log'
import { ApiError } from '#server/http/api-error'
import { assertGuard } from './lifecycle-guard'
import { findPlatformUserByAuth0Subject } from './platform-auth-identities'
import { findLinkablePlatformAccountIdentity } from './platform-account-linking'
import { assertCurrentPlatformDocument, getCurrentPlatformDocument } from './platform-documents'

function sanitizeTimestampForIdentifier(timestamp: string) {
  return timestamp.replaceAll(/[^0-9]/g, '')
}

const urlSchemePattern = /^[a-zA-Z][a-zA-Z\d+\-.]*:/

function normalizeProfileUrlInput(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const normalized = value.trim()

  if (!normalized) {
    return ''
  }

  if (urlSchemePattern.test(normalized) || normalized.startsWith('//')) {
    return normalized
  }

  return `https://${normalized}`
}

const profileUrlSchema = z.preprocess(
  normalizeProfileUrlInput,
  z.union([z.string().url(), z.literal(''), z.null()])
).optional()
const optionalEmailSchema = z
  .union([z.string().trim().email(), z.literal(''), z.null()])
  .optional()

export const platformAccountRegistrationBodySchema = z.object({
  privacyPolicyDocumentId: z.string().trim().min(1),
  platformTermsDocumentId: z.string().trim().min(1)
})

export const platformAccountProfileBodySchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  familyName: z.string().trim().min(1).max(120),
  company: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(4000).optional(),
  xProfileUrl: profileUrlSchema,
  linkedinProfileUrl: profileUrlSchema,
  githubProfileUrl: profileUrlSchema,
  chatgptEmail: optionalEmailSchema,
  openaiOrgId: z.string().trim().max(120).optional(),
  lumaEmail: optionalEmailSchema
}).superRefine((input, context) => {
  const socialProfileRules: Array<{
    key: 'xProfileUrl' | 'linkedinProfileUrl' | 'githubProfileUrl'
    allowedDomains: string[]
    message: string
  }> = [
    {
      key: 'xProfileUrl',
      allowedDomains: ['x.com', 'twitter.com'],
      message: 'Use an x.com or twitter.com profile URL.'
    },
    {
      key: 'linkedinProfileUrl',
      allowedDomains: ['linkedin.com'],
      message: 'Use a linkedin.com profile URL.'
    },
    {
      key: 'githubProfileUrl',
      allowedDomains: ['github.com'],
      message: 'Use a github.com profile URL.'
    }
  ]

  for (const rule of socialProfileRules) {
    const rawValue = input[rule.key]

    if (typeof rawValue !== 'string' || rawValue.length === 0) {
      continue
    }

    let normalizedHost = ''

    try {
      normalizedHost = new URL(rawValue).hostname.toLowerCase()
    } catch {
      continue
    }

    const hostAllowed = rule.allowedDomains.some(domain =>
      normalizedHost === domain || normalizedHost.endsWith(`.${domain}`)
    )

    if (!hostAllowed) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [rule.key],
        message: rule.message
      })
    }
  }
})

type PlatformUserRecord = typeof users.$inferSelect
type PlatformAccountRegistrationInput = z.infer<typeof platformAccountRegistrationBodySchema>
type PlatformAccountProfileInput = z.infer<typeof platformAccountProfileBodySchema>

function buildRegistrationDisplayName(actor: AuthenticatedIdentityActor) {
  return actor.sessionUser.name?.trim()
    || actor.sessionUser.nickname?.trim()
    || actor.sessionUser.email?.trim()
    || 'User'
}

function normalizeOptionalUrl(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export function serializePlatformUser(user: PlatformUserRecord) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    firstName: user.firstName,
    familyName: user.familyName,
    company: user.company,
    bio: user.bio,
    isPlatformAdmin: user.isPlatformAdmin,
    xProfileUrl: user.xProfileUrl,
    linkedinProfileUrl: user.linkedinProfileUrl,
    githubProfileUrl: user.githubProfileUrl,
    chatgptEmail: user.chatgptEmail,
    openaiOrgId: user.openaiOrgId,
    lumaEmail: user.lumaEmail,
    lumaUsername: user.lumaUsername,
    profileIconUpdatedAt: user.profileIconUpdatedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt
  }
}

function buildPlatformAccountInsert(
  actor: AuthenticatedIdentityActor,
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
    displayName: buildRegistrationDisplayName(actor),
    firstName: '',
    familyName: '',
    company: null,
    bio: null,
    isPlatformAdmin: false,
    xProfileUrl: null,
    linkedinProfileUrl: null,
    githubProfileUrl: normalizeOptionalUrl(actor.sessionUser.githubProfileUrl),
    chatgptEmail: null,
    openaiOrgId: null,
    lumaEmail: null,
    lumaUsername: null,
    profileIconUpdatedAt: null,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null
  } satisfies typeof users.$inferInsert
}

function buildPlatformAccountProfilePatch(
  input: PlatformAccountProfileInput,
  updatedAt: string
) {
  const firstName = input.firstName.trim()
  const familyName = input.familyName.trim()

  return {
    displayName: `${firstName} ${familyName}`.trim(),
    firstName,
    familyName,
    ...(input.company !== undefined
      ? { company: normalizeOptionalString(input.company) }
      : {}),
    ...(input.bio !== undefined
      ? { bio: normalizeOptionalString(input.bio) }
      : {}),
    ...(input.xProfileUrl !== undefined
      ? { xProfileUrl: normalizeOptionalUrl(input.xProfileUrl) }
      : {}),
    ...(input.linkedinProfileUrl !== undefined
      ? { linkedinProfileUrl: normalizeOptionalUrl(input.linkedinProfileUrl) }
      : {}),
    ...(input.githubProfileUrl !== undefined
      ? { githubProfileUrl: normalizeOptionalUrl(input.githubProfileUrl) }
      : {}),
    ...(input.chatgptEmail !== undefined
      ? { chatgptEmail: normalizeOptionalString(input.chatgptEmail) }
      : {}),
    ...(input.openaiOrgId !== undefined
      ? { openaiOrgId: normalizeOptionalString(input.openaiOrgId) }
      : {}),
    ...(input.lumaEmail !== undefined
      ? { lumaEmail: normalizeOptionalString(input.lumaEmail) }
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
  const existingSubject = await findPlatformUserByAuth0Subject(database, actor.sessionUser.sub)

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

  const linkableIdentity = await findLinkablePlatformAccountIdentity(database, actor.sessionUser)

  if (linkableIdentity) {
    throw new ApiError({
      statusCode: 409,
      code: 'platform_account_link_required',
      message: 'A platform account already exists for this email address. Sign in to your existing account to link this login method.',
      details: {
        email: linkableIdentity.email,
        primaryAuth0Subject: linkableIdentity.primaryAuth0Subject
      }
    })
  }

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
  const userRecord = buildPlatformAccountInsert(actor, createdAt)
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
  const existingUser = await database.query.users.findFirst({
    where: eq(users.id, userId)
  })

  assertGuard(Boolean(existingUser), {
    statusCode: 404,
    code: 'platform_user_not_found',
    message: 'The requested platform user was not found.',
    details: {
      userId
    }
  })

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

export async function updatePlatformAccountProfileIconTimestamp(
  database: AppDatabase,
  userId: string,
  profileIconUpdatedAt: string | null
) {
  const existingUser = await database.query.users.findFirst({
    where: eq(users.id, userId)
  })

  assertGuard(Boolean(existingUser), {
    statusCode: 404,
    code: 'platform_user_not_found',
    message: 'The requested platform user was not found.',
    details: {
      userId
    }
  })

  const updatedAt = new Date().toISOString()
  const patch = {
    profileIconUpdatedAt,
    updatedAt
  } satisfies Partial<typeof users.$inferInsert>

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
    firstName: 'Deleted',
    familyName: 'User',
    company: null,
    bio: null,
    isPlatformAdmin: false,
    xProfileUrl: null,
    linkedinProfileUrl: null,
    githubProfileUrl: null,
    chatgptEmail: null,
    openaiOrgId: null,
    lumaEmail: null,
    lumaUsername: null,
    profileIconUpdatedAt: null,
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
      .delete(userAuthIdentities)
      .where(eq(userAuthIdentities.userId, actor.userId)),
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
