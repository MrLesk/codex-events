import { and, desc, eq } from 'drizzle-orm'

import type { AppDatabase } from '../database/client'
import {
  platformDocumentTypes,
  platformDocuments,
  userPlatformDocumentAcceptances
} from '../database/schema'
import { ApiError } from './api-error'

type PlatformDocumentRecord = typeof platformDocuments.$inferSelect
type PlatformDocumentType = (typeof platformDocumentTypes)[number]

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

export async function getCurrentPlatformDocuments(database: AppDatabase) {
  const documents = await Promise.all(
    platformDocumentTypes.map(async (documentType) => {
      const document = await getCurrentPlatformDocument(database, documentType)
      return [documentType, document] as const
    })
  )

  return Object.fromEntries(documents) as Record<PlatformDocumentType, PlatformDocumentRecord | null>
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
