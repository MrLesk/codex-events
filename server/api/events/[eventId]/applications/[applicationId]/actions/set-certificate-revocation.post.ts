import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { userApplications } from '#server/database/schema'
import {
  applicationParamsSchema,
  getUserApplicationWithTermsOrThrow,
  requireEventAdminApplicationContext,
  serializeUserApplication
} from '#server/domains/applications'
import { ApiError } from '#server/http/api-error'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
import { isApplicationEffectivelyCheckedIn } from '#shared/domains/applications/check-in'

const setCertificateRevocationBodySchema = z.object({
  revoked: z.boolean()
})

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId, applicationId } = parseValidatedParams(h3Event, applicationParamsSchema)
  const { revoked } = await parseValidatedBody(h3Event, setCertificateRevocationBodySchema)
  const { database } = await requireEventAdminApplicationContext(h3Event, eventId)
  const { application, applicationTermsDocument } = await getUserApplicationWithTermsOrThrow(
    database,
    eventId,
    applicationId
  )

  if (application.status !== 'approved') {
    throw new ApiError({
      statusCode: 409,
      code: 'application_not_approved',
      message: 'Certificate access can only be changed for approved participants.'
    })
  }

  if (
    revoked
    && (
      !isApplicationEffectivelyCheckedIn(application)
      || application.certificateHiddenAt
      || application.certificateRevokedAt
    )
  ) {
    throw new ApiError({
      statusCode: 409,
      code: 'certificate_not_available',
      message: 'Only currently available certificates can be revoked.'
    })
  }

  if (!revoked && !application.certificateRevokedAt) {
    return apiData(serializeUserApplication(application, {
      applicationTermsDocument
    }))
  }

  const updatedAt = new Date().toISOString()
  const certificateRevokedAt = revoked ? updatedAt : null
  const certificateRevokedByUserId = revoked ? actor.platformUser.id : null

  await database
    .update(userApplications)
    .set({
      certificateRevokedAt,
      certificateRevokedByUserId,
      updatedAt
    })
    .where(eq(userApplications.id, application.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'user_application',
    entityId: application.id,
    action: revoked
      ? 'user_application.certificate_revoked'
      : 'user_application.certificate_restored',
    metadata: {
      eventId,
      userId: application.userId,
      previousCertificateRevokedAt: application.certificateRevokedAt
    }
  })

  return apiData(serializeUserApplication({
    ...application,
    certificateRevokedAt,
    certificateRevokedByUserId,
    updatedAt
  }, {
    applicationTermsDocument
  }))
})
