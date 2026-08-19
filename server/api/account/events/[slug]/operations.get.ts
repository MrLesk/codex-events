import { defineEventHandler, getRouterParam } from 'h3'

import { executeAccountEventPageRoute } from '#server/domains/events/account-event-page-contract'
import {
  assertAccountEventOperationsAccess,
  loadAccountEventOperationsPage
} from '#server/domains/events/account-event-operations-page'
import { accountEventOperationsPageSchema } from '#shared/domains/events/account-event-operations-page'

export default defineEventHandler(h3Event => executeAccountEventPageRoute(
  h3Event,
  getRouterParam(h3Event, 'slug') ?? '',
  {
    page: 'operations',
    schema: accountEventOperationsPageSchema,
    authorize: assertAccountEventOperationsAccess,
    load: loadAccountEventOperationsPage
  }
))
