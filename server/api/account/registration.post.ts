import { requireAuthenticatedActor } from '../../auth/actor'
import { getDatabase } from '../../database/client'
import { defineApiHandler } from '../../utils/api-handler'
import { apiData } from '../../utils/api-response'
import {
  platformAccountRegistrationBodySchema,
  registerPlatformAccount
} from '../../utils/account-management'
import { ApiError } from '../../utils/api-error'
import { parseValidatedBody } from '../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requireAuthenticatedActor(event)

  if (actor.hasPlatformAccount) {
    throw new ApiError({
      statusCode: 409,
      code: 'platform_account_already_exists',
      message: 'A platform account already exists for the authenticated identity.'
    })
  }

  const body = await parseValidatedBody(event, platformAccountRegistrationBodySchema)
  const result = await registerPlatformAccount(getDatabase(event), actor, body)

  return apiData(result)
})
