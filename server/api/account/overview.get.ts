import { getAccountOverviewPage } from '#server/domains/accounts/account-overview-page'
import { defineStructuredOperationApiHandler, defineStructuredRouteOperation } from '#server/application/operations/route-operation'
import { apiData } from '#server/http/api-response'

export const applicationOperation = defineStructuredRouteOperation({
  id: 'get.account.overview',
  toolName: 'get_account_overview',
  description: 'GET /api/account/overview',
  rest: { method: 'GET', path: '/api/account/overview' },
  input: {},
  output: 'data',
  capabilities: ['platform_user'],
  effect: 'read'
}, async event =>
  apiData(await getAccountOverviewPage(event))
)

export default defineStructuredOperationApiHandler(applicationOperation)
