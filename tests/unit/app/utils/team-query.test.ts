import { describe, expect, test } from 'vitest'

import {
  buildAbsoluteAccountHackathonTeamsTabHref,
  buildAccountHackathonTeamsTabHref,
  isSharedTeamSelection,
  normalizeTeamSlugQueryValue,
  shouldSyncSelectedTeamSlug
} from '../../../../app/utils/team-query'

describe('team query helpers', () => {
  test('normalizes the team slug query to a trimmed lowercase value', () => {
    expect(normalizeTeamSlugQueryValue(' Alpha-Team ')).toBe('alpha-team')
    expect(normalizeTeamSlugQueryValue(['Beta-Team', 'ignored'])).toBe('beta-team')
    expect(normalizeTeamSlugQueryValue('')).toBeNull()
    expect(normalizeTeamSlugQueryValue(null)).toBeNull()
  })

  test('builds shareable account team tab hrefs with an optional team slug', () => {
    expect(buildAccountHackathonTeamsTabHref('codex-vienna-2026-04-18')).toBe(
      '/account/hackathons/codex-vienna-2026-04-18?tab=teams'
    )

    expect(buildAccountHackathonTeamsTabHref('codex-vienna-2026-04-18', 'Alpha-Team')).toBe(
      '/account/hackathons/codex-vienna-2026-04-18?tab=teams&team=alpha-team'
    )
  })

  test('builds an absolute shareable account team tab href from the current origin', () => {
    expect(buildAbsoluteAccountHackathonTeamsTabHref(
      'http://localhost:3000',
      'codex-vienna-2026-04-18',
      'Alpha-Team'
    )).toBe('http://localhost:3000/account/hackathons/codex-vienna-2026-04-18?tab=teams&team=alpha-team')
  })

  test('treats a selected external team as a shared-team view even without an own team', () => {
    expect(isSharedTeamSelection({
      selectedTeamSlug: 'the-good-gang',
      currentTeamId: 'team_1',
      currentTeamSlug: 'the-good-gang',
      ownTeamId: null
    })).toBe(true)

    expect(isSharedTeamSelection({
      selectedTeamSlug: 'alpha-operations-team',
      currentTeamId: 'team_1',
      currentTeamSlug: 'alpha-operations-team',
      ownTeamId: 'team_1'
    })).toBe(false)

    expect(isSharedTeamSelection({
      selectedTeamSlug: 'missing-team',
      currentTeamId: 'team_1',
      currentTeamSlug: 'alpha-operations-team',
      ownTeamId: null
    })).toBe(false)
  })

  test('detects when the selected team slug query should follow a renamed team', () => {
    expect(shouldSyncSelectedTeamSlug({
      selectedTeamSlug: 'alpha-team',
      previousTeamSlug: 'alpha-team',
      nextTeamSlug: 'beta-team-1234'
    })).toBe(true)

    expect(shouldSyncSelectedTeamSlug({
      selectedTeamSlug: 'other-team',
      previousTeamSlug: 'alpha-team',
      nextTeamSlug: 'beta-team-1234'
    })).toBe(false)

    expect(shouldSyncSelectedTeamSlug({
      selectedTeamSlug: null,
      previousTeamSlug: 'alpha-team',
      nextTeamSlug: 'beta-team-1234'
    })).toBe(false)

    expect(shouldSyncSelectedTeamSlug({
      selectedTeamSlug: 'beta-team-1234',
      previousTeamSlug: 'alpha-team',
      nextTeamSlug: 'beta-team-1234'
    })).toBe(false)
  })
})
