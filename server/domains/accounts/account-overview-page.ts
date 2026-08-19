import type { AccountOverviewPage } from '#shared/domains/account/account-overview-page'
import { accountOverviewPageSchema } from '#shared/domains/account/account-overview-page'
import { listOwnEventParticipation } from '#server/domains/events/participation'
import type { AccountPageContext } from './account-page-contract'
import {
  assertAccountPageAccess,
  defineAccountPageRoute
} from './account-page-contract'

export async function getAccountOverviewPage(context: AccountPageContext): Promise<AccountOverviewPage> {
  return await listOwnEventParticipation(context.database, context.actor.platformUser.id)
}

export const accountOverviewPageRoute = defineAccountPageRoute({
  page: 'overview',
  schema: accountOverviewPageSchema,
  authorize: assertAccountPageAccess,
  load: context => getAccountOverviewPage(context)
})
