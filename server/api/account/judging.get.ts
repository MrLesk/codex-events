import { defineEventHandler } from 'h3'

import { loadAccountJudgeInboxPage } from '#server/domains/judging/account-judge-inbox-page'
import { apiData } from '#server/http/api-response'
import { accountJudgeInboxPageSchema } from '#shared/domains/events/account-event-judging-page'

export default defineEventHandler(async h3Event =>
  apiData(accountJudgeInboxPageSchema.parse(await loadAccountJudgeInboxPage(h3Event)))
)
