import { readMultipartFormData } from 'h3'

import { requirePlatformActor } from '../../../../../auth/actor'
import { writeAuditLog } from '../../../../../database/audit-log'
import { getDatabase } from '../../../../../database/client'
import { hackathonCreditCodes } from '../../../../../database/schema'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { ApiError } from '../../../../../utils/api-error'
import { apiData } from '../../../../../utils/api-response'
import {
  creditParamsSchema,
  getHackathonCreditOfferOrThrow,
  parseSingleColumnCreditCsv
} from '../../../../../utils/hackathon-credits'
import { requireHackathonAdmin } from '../../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../../utils/validation'

export default defineApiHandler(async (event) => {
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

  await database.insert(hackathonCreditCodes).values(
    values.map((value, index) => ({
      id: crypto.randomUUID(),
      creditOfferId: creditId,
      value,
      createdAt: new Date(importedAtBase + index).toISOString()
    }))
  )

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
