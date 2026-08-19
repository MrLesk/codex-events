import { defineStructuredOperationApiHandler, defineStructuredRouteOperation } from '#server/application/operations/route-operation'

import { loadAccountJudgeInboxPage } from '#server/domains/judging/account-judge-inbox-page'
import { apiData } from '#server/http/api-response'
import { accountJudgeInboxPageSchema, type AccountJudgeInboxPage } from '#shared/domains/events/account-event-judging-page'

export const applicationOperation = defineStructuredRouteOperation({
  id: 'get.account.judging',
  toolName: 'get_account_judging',
  description: 'GET /api/account/judging',
  rest: { method: 'GET', path: '/api/account/judging' },
  input: {},
  output: 'data',
  capabilities: ['event_judge'],
  effect: 'read'
}, async h3Event =>
  apiData<AccountJudgeInboxPage>(accountJudgeInboxPageSchema.parse(await loadAccountJudgeInboxPage(h3Event)))
)

export default defineStructuredOperationApiHandler(applicationOperation)
