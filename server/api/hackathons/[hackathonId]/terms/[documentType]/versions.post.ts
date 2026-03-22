import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../auth/actor'
import { writeAuditLog } from '../../../../../database/audit-log'
import { getDatabase } from '../../../../../database/client'
import { hackathonTermsDocuments } from '../../../../../database/schema'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiData } from '../../../../../utils/api-response'
import {
  createTermsVersionBodySchema,
  getNextHackathonTermsVersion,
  requireHackathonAdmin,
  serializeHackathonTermsDocument,
  termsDocumentParamsSchema
} from '../../../../../utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '../../../../../utils/validation'

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
