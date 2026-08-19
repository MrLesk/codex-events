import { getAccountOverviewPage } from '#server/domains/accounts/account-overview-page'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'

export default defineApiHandler(async event =>
  apiData(await getAccountOverviewPage(event))
)
