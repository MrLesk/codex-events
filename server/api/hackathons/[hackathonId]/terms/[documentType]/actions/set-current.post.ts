import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../../auth/actor'
import { writeAuditLog } from '../../../../../../database/audit-log'
import { getDatabase } from '../../../../../../database/client'
import { hackathons } from '../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../utils/api-handler'
import { ApiError } from '../../../../../../utils/api-error'
import { apiData } from '../../../../../../utils/api-response'
import {
  getHackathonTermsDocumentOrThrow,
  requireHackathonAdmin,
  serializeHackathon,
  setCurrentTermsBodySchema,
  termsDocumentParamsSchema
} from '../../../../../../utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '../../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, documentType } = parseValidatedParams(event, termsDocumentParamsSchema)
  const body = await parseValidatedBody(event, setCurrentTermsBodySchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)
  const document = await getHackathonTermsDocumentOrThrow(database, hackathonId, body.hackathonTermsDocumentId)

  if (document.documentType !== documentType) {
    throw new ApiError({
      statusCode: 409,
      code: 'hackathon_terms_document_type_mismatch',
      message: 'The selected hackathon terms document does not match the requested document type.',
      details: {
        hackathonId,
        documentType,
        actualDocumentType: document.documentType,
        hackathonTermsDocumentId: document.id
      }
    })
  }

  const updatedAt = new Date().toISOString()
  const patch = documentType === 'application_terms'
    ? {
        currentApplicationTermsDocumentId: document.id,
        updatedAt
      }
    : {
        currentWinnerTermsDocumentId: document.id,
        updatedAt
      }

  await database
    .update(hackathons)
    .set(patch)
    .where(eq(hackathons.id, hackathonId))

  const hackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon_terms_document.set_current',
    metadata: {
      documentType,
      hackathonTermsDocumentId: document.id
    }
  })

  return apiData(serializeHackathon(hackathon!))
})
