import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { getAccountStaffPage } from '#server/domains/accounts/account-staff-page'
import { defineStructuredOperationApiHandler, defineStructuredRouteOperation } from '#server/application/operations/route-operation'
import { apiData } from '#server/http/api-response'

export const applicationOperation = defineStructuredRouteOperation({
  id: 'get.account.staff-workspace',
  toolName: 'get_account_staff_workspace',
  description: 'GET /api/account/staff-workspace',
  rest: { method: 'GET', path: '/api/account/staff-workspace' },
  input: {},
  output: 'data',
  capabilities: ['platform_user'],
  effect: 'read'
}, async (event) => {
  const actor = await requirePlatformActor(event)

  return apiData(await getAccountStaffPage(
    getDatabase(event),
    actor.platformUser.id
  ))
})

export default defineStructuredOperationApiHandler(applicationOperation)
