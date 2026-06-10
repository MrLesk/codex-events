import { requireAuthenticatedActor } from '#server/auth/actor'
import { sendAuth0VerificationEmail } from '#server/domains/accounts/email-verification'
import { ApiError } from '#server/http/api-error'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'

export default defineApiHandler(async (h3Event) => {
  const actor = await requireAuthenticatedActor(h3Event)

  if (actor.hasPlatformAccount) {
    throw new ApiError({
      statusCode: 409,
      code: 'platform_account_already_exists',
      message: 'A platform account already exists for the authenticated identity.'
    })
  }

  const email = actor.sessionUser.email?.trim()

  if (!email) {
    throw new ApiError({
      statusCode: 409,
      code: 'identity_email_unavailable',
      message: 'The authenticated identity does not expose an email address required for platform account registration.'
    })
  }

  if (actor.sessionUser.email_verified === true) {
    throw new ApiError({
      statusCode: 409,
      code: 'identity_email_already_verified',
      message: 'The authenticated identity email address is already confirmed.'
    })
  }

  await sendAuth0VerificationEmail({
    runtimeConfig: useRuntimeConfig(h3Event),
    userId: actor.sessionUser.sub
  })

  return apiData({
    sent: true
  })
})
