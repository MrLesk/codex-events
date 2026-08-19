import type { H3Event } from 'h3'

import type { AccountOverviewPage } from '#shared/domains/account/account-overview-page'
import { listOwnEventParticipation } from '#server/domains/events/participation'

export async function getAccountOverviewPage(event: H3Event): Promise<AccountOverviewPage> {
  return await listOwnEventParticipation(event)
}
