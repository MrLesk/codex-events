import { getDatabase } from '#server/database/client'
import {
  certificatePreviewQuerySchema,
  certificateRouteParamsSchema,
  getEventCertificateOrThrow,
  getEventCertificatePreview
} from '#server/domains/events/certificates'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { parseValidatedParams, parseValidatedQuery } from '#server/http/validation'
import { eventCertificatePreviewUserId } from '#shared/domains/events/certificates'

export default defineApiHandler(async (h3Event) => {
  const { slug, userId } = parseValidatedParams(h3Event, certificateRouteParamsSchema)
  const database = getDatabase(h3Event)
  const certificate = userId === eventCertificatePreviewUserId
    ? await getEventCertificatePreview(database, slug, parseValidatedQuery(h3Event, certificatePreviewQuerySchema))
    : await getEventCertificateOrThrow(database, slug, userId)

  return apiData(certificate)
})
