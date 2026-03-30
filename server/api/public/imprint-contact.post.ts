import { ApiError } from '../../utils/api-error'
import { defineApiHandler } from '../../utils/api-handler'
import { apiData } from '../../utils/api-response'
import { publicLegalContactBodySchema, sendPublicLegalContactEmail } from '../../utils/legal-contact'
import { assertPublicContactRateLimit } from '../../utils/rate-limit'
import { parseValidatedBody } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  await assertPublicContactRateLimit(event)
  const body = await parseValidatedBody(event, publicLegalContactBodySchema)
  const result = await sendPublicLegalContactEmail(event, body)

  if (result.status === 'sent' || (result.status === 'skipped' && result.reason === 'honeypot_triggered')) {
    return apiData({
      status: 'sent'
    })
  }

  if (result.status === 'skipped' && result.reason === 'resend_configuration_missing') {
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
