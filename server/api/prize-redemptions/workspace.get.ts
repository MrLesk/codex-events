import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { getAccountPrizeRedemptionsPage } from '#server/domains/prize-redemptions/account-workspace-page'
import { defineStructuredOperationApiHandler, defineStructuredRouteOperation } from '#server/application/operations/route-operation'
import { apiData } from '#server/http/api-response'

export const applicationOperation = defineStructuredRouteOperation({
  id: 'get.prize-redemptions.workspace',
  toolName: 'get_prize_redemptions_workspace',
  description: 'GET /api/prize-redemptions/workspace',
  rest: { method: 'GET', path: '/api/prize-redemptions/workspace' },
  input: {},
  output: 'data',
  capabilities: ['platform_user'],
  effect: 'read'
}, async (event) => {
  const actor = await requirePlatformActor(event)

  return apiData(await getAccountPrizeRedemptionsPage(
    getDatabase(event),
    actor.platformUser.id
  ))
})

export default defineStructuredOperationApiHandler(applicationOperation)
