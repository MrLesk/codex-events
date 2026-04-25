import { z } from 'zod'

import { requireAuthenticatedActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  platformAccountRegistrationBodySchema,
  registerPlatformAccount
} from '#server/utils/account-management'
import { ApiError } from '#server/utils/api-error'
import {
  issuePlatformAccountLinkChallenge
} from '#server/utils/platform-account-linking'
import { parseValidatedBody } from '#server/utils/validation'

const registrationRequestBodySchema = platformAccountRegistrationBodySchema.extend({
  returnTo: z.string().trim().optional()
})

export default defineApiHandler(async (event) => {
  const actor = await requireAuthenticatedActor(event)

  if (actor.hasPlatformAccount) {
    throw new ApiError({
      statusCode: 409,
      code: 'platform_account_already_exists',
      message: 'A platform account already exists for the authenticated identity.'
    })
  }

  const body = await parseValidatedBody(event, registrationRequestBodySchema)

  try {
    const result = await registerPlatformAccount(getDatabase(event), actor, {
      privacyPolicyDocumentId: body.privacyPolicyDocumentId,
      platformTermsDocumentId: body.platformTermsDocumentId
    })

    return apiData(result)
  } catch (error) {
    if (
      error instanceof ApiError
      && error.code === 'platform_account_link_required'
      && typeof error.details?.primaryAuth0Subject === 'string'
    ) {
      await issuePlatformAccountLinkChallenge(event, {
        primaryAuth0Subject: error.details.primaryAuth0Subject,
        secondaryAuth0Subject: actor.sessionUser.sub,
        email: actor.sessionUser.email?.trim() ?? '',
        returnTo: body.returnTo
      })

      throw new ApiError({
        statusCode: 409,
        code: 'platform_account_link_required',
        message: error.message,
        details: {
          email: actor.sessionUser.email?.trim() ?? '',
          linkLoginHref: '/auth/link/login'
        }
      })
    }

    throw error
  }
})
