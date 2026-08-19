import { z } from 'zod'

import {
  accountEventOperationsPageSchema,
  type AccountEventOperationsPage
} from './account-event-operations-page'

export const accountEventSubmissionsPageSchema = accountEventOperationsPageSchema.pick({
  event: true,
  teams: true,
  applications: true,
  submissionSummary: true,
  submissionMonitor: true
}).extend({
  noSubmissionTeams: z.array(z.object({
    team: accountEventOperationsPageSchema.shape.teams.shape.data.element,
    submission: accountEventOperationsPageSchema.shape.submissionMonitor.shape.teamSubmissions.element
  }))
})

export type AccountEventSubmissionsPage = z.infer<typeof accountEventSubmissionsPageSchema>
export type AccountEventSubmissionsPagePayload = Pick<
  AccountEventOperationsPage,
  'event' | 'teams' | 'applications' | 'submissionSummary' | 'submissionMonitor'
> & {
  noSubmissionTeams: AccountEventSubmissionsPage['noSubmissionTeams']
}
