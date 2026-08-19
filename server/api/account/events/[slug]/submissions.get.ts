import { defineEventHandler, getRouterParam } from 'h3'

import { executeAccountEventPageRoute } from '#server/domains/events/account-event-page-contract'
import {
  assertAccountEventSubmissionsAccess,
  loadAccountEventSubmissionsPage
} from '#server/domains/events/account-event-submissions-page'
import { accountEventSubmissionsPageSchema } from '#shared/domains/events/account-event-submissions-page'

export default defineEventHandler(h3Event => executeAccountEventPageRoute(
  h3Event,
  getRouterParam(h3Event, 'slug') ?? '',
  {
    page: 'submissions',
    schema: accountEventSubmissionsPageSchema,
    authorize: assertAccountEventSubmissionsAccess,
    load: loadAccountEventSubmissionsPage
  }
))
