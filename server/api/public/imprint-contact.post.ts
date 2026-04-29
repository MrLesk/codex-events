import { ApiError } from '#server/http/api-error'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { publicLegalContactBodySchema, sendPublicLegalContactEmail } from '#server/domains/platform/legal-contact'
import { outboundEmailConfigurationMissingReason } from '#server/utils/outbound-email'
import { assertPublicContactRateLimit } from '#server/utils/rate-limit'
import { parseValidatedBody } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  await assertPublicContactRateLimit(event)
  const body = await parseValidatedBody(event, publicLegalContactBodySchema)
  const result = await sendPublicLegalContactEmail(event, body)

  if (result.status === 'sent' || (result.status === 'skipped' && result.reason === 'honeypot_triggered')) {
    return apiData({
      status: 'sent'
    })
  }

  if (result.status === 'skipped' && result.reason === outboundEmailConfigurationMissingReason) {
    throw new ApiError({
      statusCode: 503,
      code: 'support_contact_unavailable',
      message: 'The contact form is not available right now. Please email support directly.'
    })
  }

  throw new ApiError({
    statusCode: 502,
    code: 'support_contact_failed',
    message: 'We could not send your message right now. Please email support directly.'
  })
})
