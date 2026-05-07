import { and, desc, eq, inArray } from 'drizzle-orm'
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
  const currentDocuments = Object.fromEntries(
    platformDocumentTypes.map(documentType => [documentType, null])
  ) as Record<PlatformDocumentType, PlatformDocumentRecord | null>
  const unresolvedDocumentTypes = new Set(platformDocumentTypes)
  const documents = await database.query.platformDocuments.findMany({
    where: inArray(platformDocuments.documentType, platformDocumentTypes),
    orderBy: [desc(platformDocuments.version)]
  })

  for (const document of documents) {
    if (!unresolvedDocumentTypes.has(document.documentType)) {
      continue
    }

    currentDocuments[document.documentType] = document
    unresolvedDocumentTypes.delete(document.documentType)

    if (unresolvedDocumentTypes.size === 0) {
      break
    }
  }

  return currentDocuments
}

export async function hasAcceptedCurrentPlatformDocuments(
  database: AppDatabase,
  userId: string
) {
  const currentDocuments = await getCurrentPlatformDocuments(database)
  const requiredDocuments = platformDocumentTypes
    .map(documentType => currentDocuments[documentType])
    .filter((document): document is PlatformDocumentRecord => Boolean(document))

  if (requiredDocuments.length !== platformDocumentTypes.length) {
    return false
  }

  const acceptances = await database.query.userPlatformDocumentAcceptances.findMany({
    where: and(
      eq(userPlatformDocumentAcceptances.userId, userId),
      inArray(
        userPlatformDocumentAcceptances.platformDocumentId,
        requiredDocuments.map(document => document.id)
      )
    )
  })

  const acceptedDocumentIds = new Set(acceptances.map(acceptance => acceptance.platformDocumentId))

  return requiredDocuments.every(document => acceptedDocumentIds.has(document.id))
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
