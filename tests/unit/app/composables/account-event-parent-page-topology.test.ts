import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

const pageSource = readFileSync(
  new URL('../../../../app/pages/account/events/[slug]/index.vue', import.meta.url),
  'utf8'
)
const teamsRouteSource = readFileSync(
  new URL('../../../../app/pages/events/[slug]/teams/index.vue', import.meta.url),
  'utf8'
)
const teamRouteSource = readFileSync(
  new URL('../../../../app/pages/events/[slug]/teams/[teamId].vue', import.meta.url),
  'utf8'
)
const teamsServerSource = readFileSync(
  new URL('../../../../server/domains/events/account-event-teams-page.ts', import.meta.url),
  'utf8'
)
const participantTeamPanelSource = readFileSync(
  new URL('../../../../app/components/account/events/AccountEventParticipantTeamPanel.vue', import.meta.url),
  'utf8'
)

describe('account event parent page request topology', () => {
  test('owns the competition page reads and passes typed page state down', () => {
    expect(pageSource).toContain('useAccountEventPageRequest<AccountEventOperationsPage>(slug, \'operations\'')
    expect(pageSource).toContain('useAccountEventPageRequest<AccountEventSubmissionsPage>(slug, \'submissions\'')
    expect(pageSource).toContain('useAccountEventPageRequest<AccountEventJudgingPage>(slug, \'judging\'')
    expect(pageSource).toContain('useAccountJudgeAssignmentPageRequest<AccountJudgeAssignmentWorkspacePage | null>')
    expect(pageSource).toContain(':page="operationsPage"')
    expect(pageSource).toContain(':page="submissionsPage"')
    expect(pageSource).toContain(':page="judgingPage"')
    expect(pageSource).toContain(':assignment-page="assignmentPage"')
    expect(pageSource).not.toContain('<LazyAccountEventJudgePanel\n          :event-id="workspaceEventId"\n          :slug="slug"\n          :selected-assignment-id="selectedJudgeAssignmentId"\n        />')
  })

  test('keeps selected-team navigation in the page request instead of a slug lookup', () => {
    expect(pageSource).toContain('query: computed(() => ({ selectedTeamSlug: selectedTeamSlug.value }))')
    expect(teamsRouteSource).toContain('query: computed(() => ({ selectedTeamSlug: selectedTeamSlug.value }))')
    expect(teamRouteSource).toContain('query: computed(() => ({ selectedTeamSlug: teamSlug.value }))')
    expect(teamsServerSource).toContain('query: AccountEventPageQuery')
    expect(teamsServerSource).toContain('query.selectedTeamSlug')
    expect(teamsServerSource).toContain('selectedTeam: selectedTeamDetail')
    expect(participantTeamPanelSource).not.toContain('findVisibleTeamBySlug')
  })
})
