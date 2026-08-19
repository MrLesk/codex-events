import type { z } from 'zod'

import type {
  AccountEventSubmissionsPage,
  AccountEventSubmissionsPagePayload
} from '#shared/domains/events/account-event-submissions-page'
import { accountEventSubmissionsPageSchema } from '#shared/domains/events/account-event-submissions-page'
import {
  assertCompetitionEvent,
  getCurrentEventTerms,
  listEventTracks,
  serializeAdminEvent
} from '#server/domains/events'
import { assertEventAdminAccess } from '#server/auth/authorization'
import { listEventApplications } from '#server/domains/applications'
import { getEventDisplayImageOptions } from '#server/domains/platform/settings'
import {
  getEventSubmissionSummary,
  listNoSubmissionTeams,
  listSubmissionMonitorTeams
} from '#server/domains/submissions'
import type { listTeamsQuerySchema } from '#server/domains/teams'
import { listVisibleTeams } from '#server/domains/teams'
import type { AccountEventPageContext } from './account-event-page-context'
import { defineAccountEventPageRoute } from './account-event-page-contract'

const firstPageQuery = { page: 1, page_size: 100 } as const satisfies z.infer<typeof listTeamsQuerySchema>

export function assertAccountEventSubmissionsAccess(context: AccountEventPageContext) {
  assertEventAdminAccess(context.authorization)
  assertCompetitionEvent(context.event)
}

export async function loadAccountEventSubmissionsPage(
  context: AccountEventPageContext
): Promise<AccountEventSubmissionsPage> {
  assertCompetitionEvent(context.event)
  const [tracks, currentTerms, imageOptions, teams, applications, submissionSummary, submissionMonitor, noSubmissionTeams] = await Promise.all([
    listEventTracks(context.database, context.event.id),
    getCurrentEventTerms(context.database, context.event),
    getEventDisplayImageOptions(context.database),
    listVisibleTeams(context.database, context.event, context.event.id, firstPageQuery, {
      includeInactiveTeams: true
    }),
    listEventApplications(context.database, context.event.id, firstPageQuery),
    getEventSubmissionSummary(context.database, context.event.id),
    listSubmissionMonitorTeams(context.database, context.event.id),
    listNoSubmissionTeams(context.database, context.event.id)
  ])

  const payload: AccountEventSubmissionsPagePayload = {
    event: serializeAdminEvent(context.event, currentTerms, tracks, { appBaseUrl: '', ...imageOptions }),
    teams: {
      data: teams.data,
      total: teams.total
    },
    applications: applications.data,
    submissionSummary,
    submissionMonitor,
    noSubmissionTeams
  }

  return payload
}

export const accountEventSubmissionsPageRoute = defineAccountEventPageRoute({
  page: 'submissions',
  schema: accountEventSubmissionsPageSchema,
  authorize: assertAccountEventSubmissionsAccess,
  load: loadAccountEventSubmissionsPage
})
