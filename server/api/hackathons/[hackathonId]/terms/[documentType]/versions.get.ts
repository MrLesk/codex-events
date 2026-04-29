import { and, desc, eq } from 'drizzle-orm'

import { getDatabase } from '#server/database/client'
import { hackathonTermsDocuments } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  requireHackathonAdmin,
  serializeHackathonTermsDocument,
  termsDocumentParamsSchema
} from '#server/domains/hackathons'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, documentType } = parseValidatedParams(event, termsDocumentParamsSchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)

  const documents = await database.query.hackathonTermsDocuments.findMany({
    where: and(
      eq(hackathonTermsDocuments.hackathonId, hackathonId),
      eq(hackathonTermsDocuments.documentType, documentType)
    ),
    orderBy: [desc(hackathonTermsDocuments.version)]
  })

  return apiList(
    documents.map(serializeHackathonTermsDocument),
    {
      total: documents.length
    }
  )
})
