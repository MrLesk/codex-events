import { assertEventFeedbackResultsAccess, assertEventFeedbackAvailable, getEventFeedbackSummary } from '#server/domains/events/feedback'
import type { AccountEventFeedbackPage } from '#shared/domains/events/account-event-feedback-page'
import { accountEventFeedbackPageSchema } from '#shared/domains/events/account-event-feedback-page'
import { defineAccountEventPageRoute } from './account-event-page-contract'

export const accountEventFeedbackPageRoute = defineAccountEventPageRoute({
  page: 'feedback',
  schema: accountEventFeedbackPageSchema,
  authorize: async (context) => {
    assertEventFeedbackResultsAccess(context.authorization)
    assertEventFeedbackAvailable(context.event)
  },
  load: async (context): Promise<AccountEventFeedbackPage> => ({
    summary: await getEventFeedbackSummary(
      context.database,
      context.event.id,
      context.event.eventType
    )
  })
})
