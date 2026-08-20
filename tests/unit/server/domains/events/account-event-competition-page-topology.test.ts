import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const operationsSource = readFileSync(
  new URL('../../../../../server/domains/events/account-event-operations-page.ts', import.meta.url),
  'utf8'
)
const submissionsSource = readFileSync(
  new URL('../../../../../server/domains/events/account-event-submissions-page.ts', import.meta.url),
  'utf8'
)
const participantsSource = readFileSync(
  new URL('../../../../../server/domains/events/account-event-participants-page.ts', import.meta.url),
  'utf8'
)
const participantsContractSource = readFileSync(
  new URL('../../../../../shared/domains/events/account-event-participants-page.ts', import.meta.url),
  'utf8'
)
const adminOperationsPanelSource = readFileSync(
  new URL('../../../../../app/components/account/events/AccountEventAdminOperationsPanel.vue', import.meta.url),
  'utf8'
)
const judgingSource = readFileSync(
  new URL('../../../../../server/domains/events/account-event-judging-page.ts', import.meta.url),
  'utf8'
)
const judgeInboxSource = readFileSync(
  new URL('../../../../../server/domains/judging/account-judge-inbox-page.ts', import.meta.url),
  'utf8'
)

describe('TASK-432.5.3 server request topology', () => {
  test('assembles page models from the request database instead of internal HTTP', () => {
    for (const source of [operationsSource, submissionsSource, judgingSource]) {
      expect(source).toContain('context.database')
      expect(source).not.toContain('apiFetch')
      expect(source).not.toContain('$fetch')
      expect(source).not.toContain('fetch(')
    }

    expect(judgeInboxSource).toContain('context.database')
    expect(judgeInboxSource).toContain('defineAccountPageRoute')
    expect(judgeInboxSource).toContain('authorizeAccountJudgeInbox')
    expect(judgeInboxSource).toContain('accountJudgeInboxPageSchema')
    expect(judgeInboxSource).not.toContain('apiFetch')
    expect(judgeInboxSource).not.toContain('$fetch')
    expect(judgeInboxSource).not.toContain('fetch(')
    expect(judgingSource).not.toContain('resolveJudgeAssignmentAuthorization')
    expect(judgingSource).toContain('context.assignmentAuthorization.assignment')
    expect(judgingSource).not.toContain('context.database.query.judgeAssignments.findFirst')
    expect(judgingSource).toContain('context.actor.platformUser.id')
  })

  test('keeps bounded first-page reads explicit and uses one named assembler per page', () => {
    expect(operationsSource).toContain('page_size: 100')
    expect(submissionsSource).toContain('page_size: 100')
    expect(participantsSource).toContain('accountEventParticipantsPageSchema')
    expect(participantsSource).toContain('listParticipantApplications')
    expect(participantsSource).toContain('isNull(eventRoleAssignments.id)')
    expect(participantsSource).toContain('statusCounts')
    expect(participantsSource).not.toContain('listEventApplications')
    expect(participantsSource).not.toContain('account-event-operations-page')
    expect(participantsSource).not.toContain('loadAccountEventOperationsPage')
    expect(participantsContractSource).toContain('export const accountEventParticipantsPageSchema')
    expect(participantsContractSource).not.toContain('accountEventOperationsPageSchema')
    expect(adminOperationsPanelSource).toContain('participantsPage?: AccountEventParticipantsPage | null')
    expect(adminOperationsPanelSource).toContain(':status-counts="participantPageData?.statusCounts"')
    expect(adminOperationsPanelSource).not.toContain('AccountEventOperationsPage | AccountEventSubmissionsPage | AccountEventParticipantsPage')
    expect(operationsSource).toContain('loadAccountEventOperationsPage')
    expect(submissionsSource).toContain('loadAccountEventSubmissionsPage')
    expect(judgingSource).toContain('loadAccountEventJudgingPage')
    expect(judgeInboxSource).toContain('loadAccountJudgeInboxPage')
    expect(judgingSource).toContain('loadAccountJudgeAssignmentWorkspacePage')
  })
})
