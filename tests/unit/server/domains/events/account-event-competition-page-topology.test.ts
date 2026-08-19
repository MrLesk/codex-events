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
    expect(judgingSource).toContain('context.actor.platformUser.id')
  })

  test('keeps bounded first-page reads explicit and uses one named assembler per page', () => {
    expect(operationsSource).toContain('page_size: 100')
    expect(submissionsSource).toContain('page_size: 100')
    expect(operationsSource).toContain('loadAccountEventOperationsPage')
    expect(submissionsSource).toContain('loadAccountEventSubmissionsPage')
    expect(judgingSource).toContain('loadAccountEventJudgingPage')
    expect(judgeInboxSource).toContain('loadAccountJudgeInboxPage')
    expect(judgingSource).toContain('loadAccountJudgeAssignmentWorkspacePage')
  })
})
