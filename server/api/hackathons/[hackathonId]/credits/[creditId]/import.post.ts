import { readMultipartFormData } from 'h3'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathonCreditCodes } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import { apiData } from '#server/http/api-response'
import {
  creditParamsSchema,
  getHackathonCreditOfferOrThrow,
  parseSingleColumnCreditCsv
} from '#server/domains/credits'
import { requireHackathonAdmin } from '#server/domains/hackathons'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const maxCreditCodeRowsPerInsert = 25
  const actor = await requirePlatformActor(event)
  const { hackathonId, creditId } = parseValidatedParams(event, creditParamsSchema)
  const database = getDatabase(event)

  await requireHackathonAdmin(event, hackathonId)
  await getHackathonCreditOfferOrThrow(database, hackathonId, creditId)

  const multipart = await readMultipartFormData(event)
  const filePart = multipart?.find(part => part.name === 'file')

  if (!filePart?.data || filePart.data.byteLength === 0) {
    throw new ApiError({
      statusCode: 400,
      code: 'hackathon_credit_import_file_missing',
      message: 'Upload a single-column CSV file with one credit value per row.'
    })
  }

  const importedAtBase = Date.now()
  const values = parseSingleColumnCreditCsv(new TextDecoder().decode(filePart.data))
  const codeRows = values.map((value, index) => ({
    id: crypto.randomUUID(),
    creditOfferId: creditId,
    value,
    createdAt: new Date(importedAtBase + index).toISOString()
  }))

  // D1 allows at most 100 bound parameters per statement. Each inserted row binds
  // four values, so keep bulk credit imports at 25 rows per insert query.
  for (let index = 0; index < codeRows.length; index += maxCreditCodeRowsPerInsert) {
    await database
      .insert(hackathonCreditCodes)
      .values(codeRows.slice(index, index + maxCreditCodeRowsPerInsert))
  }

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon_credit_offer',
    entityId: creditId,
    action: 'hackathon_credit_offer.inventory_imported',
    metadata: {
      hackathonId,
      importedCount: values.length
    }
  })

  return apiData({
    importedCount: values.length
  })
})
