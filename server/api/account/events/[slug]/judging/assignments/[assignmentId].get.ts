import { defineEventHandler, getRouterParam } from 'h3'
import { z } from 'zod'

import { resolveAccountEventPageContext } from '#server/domains/events/account-event-page-context'
import { loadAccountJudgeAssignmentWorkspacePage } from '#server/domains/events/account-event-judging-page'
import { apiData } from '#server/http/api-response'
import { accountJudgeAssignmentWorkspacePageSchema } from '#shared/domains/events/account-event-judging-page'

const paramsSchema = z.object({
  slug: z.string().trim().min(1),
  assignmentId: z.string().trim().min(1)
})

export default defineEventHandler(async (h3Event) => {
  const params = paramsSchema.parse({
    slug: getRouterParam(h3Event, 'slug') ?? '',
    assignmentId: getRouterParam(h3Event, 'assignmentId') ?? ''
  })
  const context = await resolveAccountEventPageContext(h3Event, params.slug)
  const page = accountJudgeAssignmentWorkspacePageSchema.parse(
    await loadAccountJudgeAssignmentWorkspacePage(context, params.assignmentId)
  )

  return apiData(page)
})
