import { readMultipartFormData } from 'h3'
import { sql } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { eventAttendeeEligibilities } from '#server/database/schema'
import {
  getSimplifiedClaimingSummary,
  parseLumaAttendeeCsv,
  simplifiedClaimingAttendeeImportLimits
} from '#server/domains/credits/simplified-claiming'
import { requireEventAdmin, routeIdParamsSchema } from '#server/domains/events'
import { assertGuard } from '#server/domains/lifecycle-guard'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import { apiData } from '#server/http/api-response'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const database = getDatabase(h3Event)
  const { event } = await requireEventAdmin(h3Event, eventId)

  assertGuard(event.eventType === 'meetup' && event.simplifiedClaimingEnabled, {
    statusCode: 409,
    code: 'simplified_claiming_disabled',
    message: 'Enable simplified attendee claiming before importing Luma attendees.'
  })

  const multipart = await readMultipartFormData(h3Event)
  const filePart = multipart?.find(part => part.name === 'file')

  if (!filePart?.data || filePart.data.byteLength === 0) {
    throw new ApiError({
      statusCode: 400,
      code: 'simplified_claiming_attendee_file_missing',
      message: 'Upload the Luma guest CSV.'
    })
  }
  assertGuard(filePart.data.byteLength <= simplifiedClaimingAttendeeImportLimits.maxBytes, {
    statusCode: 413,
    code: 'simplified_claiming_attendee_file_too_large',
    message: 'The Luma CSV must be 5 MB or smaller.'
  })

  let parsed: ReturnType<typeof parseLumaAttendeeCsv>
  try {
    parsed = parseLumaAttendeeCsv(new TextDecoder().decode(filePart.data))
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError({
      statusCode: 400,
      code: 'simplified_claiming_attendee_csv_invalid',
      message: 'The uploaded file is not a valid Luma CSV.'
    })
  }

  const importedAtBase = Date.now()
  const rows = parsed.rows.map((row, index) => ({
    id: crypto.randomUUID(),
    eventId,
    normalizedEmail: row.normalizedEmail,
    firstName: row.firstName,
    familyName: row.familyName,
    createdAt: new Date(importedAtBase + index).toISOString(),
    updatedAt: new Date(importedAtBase + index).toISOString()
  }))

  for (let index = 0; index < rows.length; index += 10) {
    await database.insert(eventAttendeeEligibilities)
      .values(rows.slice(index, index + 10))
      .onConflictDoUpdate({
        target: [eventAttendeeEligibilities.eventId, eventAttendeeEligibilities.normalizedEmail],
        set: {
          firstName: sql`excluded.first_name`,
          familyName: sql`excluded.family_name`,
          updatedAt: sql`excluded.updated_at`
        }
      })
  }

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event',
    entityId: eventId,
    action: 'event.simplified_claiming_attendees_imported',
    metadata: {
      eventId,
      parsedRowCount: parsed.parsedRowCount,
      approvedRowCount: parsed.approvedRowCount,
      eligibleCount: rows.length
    }
  })

  const summary = await getSimplifiedClaimingSummary(database, event)
  return apiData({
    parsedRowCount: parsed.parsedRowCount,
    approvedRowCount: parsed.approvedRowCount,
    eligibleCount: rows.length,
    attendeeCount: summary.attendeeCount
  })
})
