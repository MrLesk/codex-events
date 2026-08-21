import { and, count, desc, eq, exists, gt, notExists, or } from 'drizzle-orm'
import type { SQLWrapper } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { z } from 'zod'

import { writeAuditLog } from '#server/database/audit-log'
import type { AppDatabase } from '#server/database/client'
import {
  platformDocumentTypes,
  platformDocuments,
  userPlatformDocumentAcceptances
} from '#server/database/schema'
import { ApiError } from '#server/http/api-error'

type PlatformDocumentRecord = typeof platformDocuments.$inferSelect
type PlatformDocumentType = (typeof platformDocumentTypes)[number]

const isoTimestampSchema = z.string().refine(
  value => !Number.isNaN(Date.parse(value)),
  'Expected an ISO-8601 timestamp.'
)

export const platformDocumentTypeSchema = z.enum(platformDocumentTypes)
export const createPlatformDocumentVersionBodySchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  publishedAt: isoTimestampSchema.optional()
})

export function serializePlatformDocument(document: PlatformDocumentRecord) {
  return {
    id: document.id,
    documentType: document.documentType,
    version: document.version,
    title: document.title,
    content: document.content,
    publishedAt: document.publishedAt,
    createdAt: document.createdAt
  }
}

/**
 * Build the one-read current-consent count used by authenticated actor
 * resolution. The user id may be a bound value or a column from an outer
 * query, which lets the actor lookup join identity, user, and consent state
 * without a second D1 round trip.
 */
export function buildCurrentPlatformDocumentAcceptanceCountQuery(
  database: AppDatabase,
  userId: string | SQLWrapper
) {
  const currentDocuments = alias(platformDocuments, 'current_platform_documents')
  const newerDocuments = alias(platformDocuments, 'newer_platform_documents')
  const acceptances = alias(
    userPlatformDocumentAcceptances,
    'current_platform_document_acceptances'
  )

  return database
    .select({ total: count() })
    .from(currentDocuments)
    .where(and(
      or(...platformDocumentTypes.map(documentType =>
        eq(currentDocuments.documentType, documentType)
      )),
      notExists(database
        .select({ id: newerDocuments.id })
        .from(newerDocuments)
        .where(and(
          eq(newerDocuments.documentType, currentDocuments.documentType),
          gt(newerDocuments.version, currentDocuments.version)
        ))),
      exists(database
        .select({ id: acceptances.id })
        .from(acceptances)
        .where(and(
          eq(acceptances.userId, userId),
          eq(acceptances.platformDocumentId, currentDocuments.id)
        )))
    ))
}

export async function listPlatformDocumentVersions(
  database: AppDatabase,
  documentType: PlatformDocumentType
) {
  return await database.query.platformDocuments.findMany({
    where: eq(platformDocuments.documentType, documentType),
    orderBy: [desc(platformDocuments.version)]
  })
}

export async function getCurrentPlatformDocument(
  database: AppDatabase,
  documentType: PlatformDocumentType
) {
  return await database.query.platformDocuments.findFirst({
    where: eq(platformDocuments.documentType, documentType),
    orderBy: [desc(platformDocuments.version)]
  })
}

export async function getNextPlatformDocumentVersion(
  database: AppDatabase,
  documentType: PlatformDocumentType
) {
  const latestDocument = await getCurrentPlatformDocument(database, documentType)

  return latestDocument ? latestDocument.version + 1 : 1
}

export async function createPlatformDocumentVersion(
  database: AppDatabase,
  input: {
    documentType: PlatformDocumentType
    title: string
    content: string
    publishedAt?: string
    actorUserId: string | null
  }
) {
  const createdAt = new Date().toISOString()
  const documentId = crypto.randomUUID()
  const version = await getNextPlatformDocumentVersion(database, input.documentType)

  await database.insert(platformDocuments).values({
    id: documentId,
    documentType: input.documentType,
    version,
    title: input.title,
    content: input.content,
    publishedAt: input.publishedAt ?? createdAt,
    createdAt
  })

  await writeAuditLog(database, {
    actorUserId: input.actorUserId,
    entityType: 'platform_document',
    entityId: documentId,
    action: 'platform_document.created',
    metadata: {
      documentType: input.documentType,
      version
    }
  })

  return (await database.query.platformDocuments.findFirst({
    where: eq(platformDocuments.id, documentId)
  }))!
}

export async function getCurrentPlatformDocuments(database: AppDatabase) {
  const entries = await Promise.all(
    platformDocumentTypes.map(async documentType => [
      documentType,
      await getCurrentPlatformDocument(database, documentType) ?? null
    ] as const)
  )

  return Object.fromEntries(entries) as Record<PlatformDocumentType, PlatformDocumentRecord | null>
}

export async function hasAcceptedCurrentPlatformDocuments(
  database: AppDatabase,
  userId: string
) {
  const result = await buildCurrentPlatformDocumentAcceptanceCountQuery(database, userId).get()

  return Number(result?.total ?? 0) === platformDocumentTypes.length
}

export function assertCurrentPlatformDocument(
  acceptedDocument: PlatformDocumentRecord,
  currentDocument: PlatformDocumentRecord | undefined,
  expectedDocumentType?: PlatformDocumentType
) {
  if (expectedDocumentType && acceptedDocument.documentType !== expectedDocumentType) {
    throw new ApiError({
      statusCode: 409,
      code: 'platform_document_type_mismatch',
      message: 'The requested platform document does not match the expected document type.',
      details: {
        expectedDocumentType,
        actualDocumentType: acceptedDocument.documentType,
        platformDocumentId: acceptedDocument.id
      }
    })
  }

  if (!currentDocument) {
    throw new ApiError({
      statusCode: 409,
      code: 'platform_document_unavailable',
      message: 'The current platform document is not available for acceptance.',
      details: {
        documentType: acceptedDocument.documentType
      }
    })
  }

  if (acceptedDocument.id !== currentDocument.id) {
    throw new ApiError({
      statusCode: 409,
      code: 'platform_document_outdated',
      message: 'Platform document acceptance requires the current published document version.',
      details: {
        documentType: acceptedDocument.documentType,
        acceptedPlatformDocumentId: acceptedDocument.id,
        currentPlatformDocumentId: currentDocument.id,
        currentVersion: currentDocument.version
      }
    })
  }
}

export async function recordPlatformDocumentAcceptance(
  database: AppDatabase,
  userId: string,
  input: {
    platformDocumentId: string
    documentType?: PlatformDocumentType
  }
) {
  const acceptedDocument = await database.query.platformDocuments.findFirst({
    where: eq(platformDocuments.id, input.platformDocumentId)
  })

  if (!acceptedDocument) {
    throw new ApiError({
      statusCode: 404,
      code: 'platform_document_not_found',
      message: 'The requested platform document was not found.',
      details: {
        platformDocumentId: input.platformDocumentId
      }
    })
  }

  const currentDocument = await getCurrentPlatformDocument(database, acceptedDocument.documentType)
  assertCurrentPlatformDocument(acceptedDocument, currentDocument ?? undefined, input.documentType)

  const existingAcceptance = await database.query.userPlatformDocumentAcceptances.findFirst({
    where: and(
      eq(userPlatformDocumentAcceptances.userId, userId),
      eq(userPlatformDocumentAcceptances.platformDocumentId, acceptedDocument.id)
    )
  })

  if (existingAcceptance) {
    return {
      acceptance: existingAcceptance,
      document: acceptedDocument
    }
  }

  const acceptedAt = new Date().toISOString()
  const acceptanceId = crypto.randomUUID()

  await database.insert(userPlatformDocumentAcceptances).values({
    id: acceptanceId,
    userId,
    platformDocumentId: acceptedDocument.id,
    acceptedAt
  })

  return {
    acceptance: {
      id: acceptanceId,
      userId,
      platformDocumentId: acceptedDocument.id,
      acceptedAt
    },
    document: acceptedDocument
  }
}
