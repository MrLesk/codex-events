import { defineEventHandler, getRouterParam } from 'h3'

import { executeAccountEventPageRoute } from '#server/domains/events/account-event-page-contract'
import {
  assertAccountEventJudgingAccess,
  loadAccountEventJudgingPage
} from '#server/domains/events/account-event-judging-page'
import { accountEventJudgingPageSchema } from '#shared/domains/events/account-event-judging-page'

export default defineEventHandler(h3Event => executeAccountEventPageRoute(
  h3Event,
  getRouterParam(h3Event, 'slug') ?? '',
  {
    page: 'judging',
    schema: accountEventJudgingPageSchema,
    authorize: assertAccountEventJudgingAccess,
    load: loadAccountEventJudgingPage
  }
))
