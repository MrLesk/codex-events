import { and, eq, isNull, sql } from 'drizzle-orm'
import { readRawBody } from 'h3'

import { writeAuditLog } from '#server/database/audit-log'
import { getD1Binding, getDatabase } from '#server/database/client'
import {
  events,
  userApplications,
  users
} from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { isEventLumaAttendanceSyncEnabled } from '#server/domains/applications'
import {
  extractLumaAttendanceCheckInEvent,
  resolveLumaAttendanceGuestEmail,
  verifyLumaWebhookRequest
} from '#server/domains/applications/luma-webhooks'

export default defineApiHandler(async (h3Event) => {
  const rawBody = await readRawBody(h3Event, 'utf8') ?? ''

  const { webhookId } = await verifyLumaWebhookRequest(h3Event, rawBody)
  const { envelope, attendanceEvent } = extractLumaAttendanceCheckInEvent(rawBody)

  if (envelope.type !== 'guest.updated' || !attendanceEvent?.checkedInAt || !attendanceEvent.eventApiId) {
    return apiData({
      status: 'acknowledged'
    })
  }

  const database = getDatabase(h3Event)
  const event = await database.query.events.findFirst({
    where: eq(events.lumaEventApiId, attendanceEvent.eventApiId)
  })

  if (!event || !isEventLumaAttendanceSyncEnabled(event)) {
    return apiData({
      status: 'acknowledged'
    })
  }

  const guestEmail = await resolveLumaAttendanceGuestEmail(h3Event, attendanceEvent)

  if (!guestEmail) {
    return apiData({
      status: 'acknowledged'
    })
  }

  const matchingApplications = await database
    .select({
      applicationId: userApplications.id,
      userId: userApplications.userId,
      status: userApplications.status,
      checkedInAt: userApplications.checkedInAt
    })
    .from(userApplications)
    .innerJoin(users, eq(users.id, userApplications.userId))
    .where(and(
      eq(userApplications.eventId, event.id),
      isNull(users.deletedAt),
      sql`lower(${users.lumaEmail}) = lower(${guestEmail})`
    ))

  if (matchingApplications.length !== 1) {
    return apiData({
      status: 'acknowledged'
    })
  }

  const [matchingApplication] = matchingApplications

  if (!matchingApplication || matchingApplication.status !== 'approved' || matchingApplication.checkedInAt) {
    return apiData({
      status: 'acknowledged'
    })
  }

  const updatedAt = new Date().toISOString()
  const updateResult = await getD1Binding(h3Event).prepare(`
    update user_applications
    set checked_in_at = ?, updated_at = ?
    where id = ?
      and status = 'approved'
      and checked_in_at is null
  `).bind(
    attendanceEvent.checkedInAt,
    updatedAt,
    matchingApplication.applicationId
  ).run()

  if ((updateResult.meta.changes ?? 0) === 0) {
    return apiData({
      status: 'acknowledged'
    })
  }

  await writeAuditLog(database, {
    entityType: 'user_application',
    entityId: matchingApplication.applicationId,
    action: 'user_application.luma_check_in_recorded',
    metadata: {
      eventId: event.id,
      eventApiId: attendanceEvent.eventApiId,
      guestId: attendanceEvent.guestId,
      guestEmail,
      checkedInAt: attendanceEvent.checkedInAt,
      ...(webhookId ? { webhookId } : {})
    },
    createdAt: updatedAt
  })

  return apiData({
    status: 'acknowledged'
  })
})
