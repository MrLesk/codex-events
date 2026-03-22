import { and, desc, eq } from 'drizzle-orm'

import { getDatabase } from '../../../../../database/client'
import { hackathonTermsDocuments } from '../../../../../database/schema'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiList } from '../../../../../utils/api-response'
import {
  requireHackathonAdmin,
  serializeHackathonTermsDocument,
  termsDocumentParamsSchema
} from '../../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../../utils/validation'

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
