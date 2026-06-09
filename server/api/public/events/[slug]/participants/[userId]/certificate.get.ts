import { getDatabase } from '#server/database/client'
import {
  certificateRouteParamsSchema,
  getEventCertificateOrThrow
} from '#server/domains/events/certificates'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { slug, userId } = parseValidatedParams(h3Event, certificateRouteParamsSchema)
  const certificate = await getEventCertificateOrThrow(getDatabase(h3Event), slug, userId)

  return apiData(certificate)
})
