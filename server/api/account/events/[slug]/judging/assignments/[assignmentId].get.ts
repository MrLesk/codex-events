import { defineStructuredOperationApiHandler, defineStructuredRouteOperation } from '#server/application/operations/route-operation'
import { z } from 'zod'

import { routeSlugParamsSchema } from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'
import { resolveAccountEventPageContext } from '#server/domains/events/account-event-page-context'
import { loadAccountJudgeAssignmentWorkspacePage } from '#server/domains/events/account-event-judging-page'
import { apiData } from '#server/http/api-response'
import { accountJudgeAssignmentWorkspacePageSchema } from '#shared/domains/events/account-event-judging-page'

const accountJudgeAssignmentParamsSchema = routeSlugParamsSchema.extend({
  assignmentId: z.string().trim().min(1)
})

export const applicationOperation = defineStructuredRouteOperation({
  id: 'get.account.events.by-slug.judging.assignments.by-assignmentId',
  toolName: 'get_account_events_by_slug_judging_assignments_by_assignmentId',
  description: 'GET /api/account/events/:slug/judging/assignments/:assignmentId',
  rest: { method: 'GET', path: '/api/account/events/:slug/judging/assignments/:assignmentId' },
  input: { params: accountJudgeAssignmentParamsSchema },
  output: 'data',
  capabilities: ['event_judge'],
  effect: 'read'
}, async (h3Event) => {
  const params = parseValidatedParams(h3Event, accountJudgeAssignmentParamsSchema)
  const context = await resolveAccountEventPageContext(h3Event, params.slug)
  const page = accountJudgeAssignmentWorkspacePageSchema.parse(
    await loadAccountJudgeAssignmentWorkspacePage(context, params.assignmentId)
  )

  return apiData(page)
})

export default defineStructuredOperationApiHandler(applicationOperation)
