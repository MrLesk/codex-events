import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathonTermsDocuments, hackathons } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  createTermsVersionBodySchema,
  getNextHackathonTermsVersion,
  requireHackathonAdmin,
  serializeHackathonTermsDocument,
  termsDocumentParamsSchema
} from '#server/utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, documentType } = parseValidatedParams(event, termsDocumentParamsSchema)
  const body = await parseValidatedBody(event, createTermsVersionBodySchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)

  const documentId = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const version = await getNextHackathonTermsVersion(database, hackathonId, documentType)

  await database.insert(hackathonTermsDocuments).values({
    id: documentId,
    hackathonId,
    documentType,
    version,
    title: body.title,
    content: body.content,
    publishedAt: body.publishedAt ?? createdAt,
    createdAt
  })

  if (version === 1) {
    await database
      .update(hackathons)
      .set(documentType === 'application_terms'
        ? {
            currentApplicationTermsDocumentId: documentId,
            updatedAt: createdAt
          }
        : {
            currentWinnerTermsDocumentId: documentId,
            updatedAt: createdAt
          })
      .where(eq(hackathons.id, hackathonId))
  }

  const document = await database.query.hackathonTermsDocuments.findFirst({
    where: eq(hackathonTermsDocuments.id, documentId)
  })

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon_terms_document',
    entityId: documentId,
    action: 'hackathon_terms_document.created',
    metadata: {
      hackathonId,
      documentType,
      version
    }
  })

  return apiData(serializeHackathonTermsDocument(document!))
})
