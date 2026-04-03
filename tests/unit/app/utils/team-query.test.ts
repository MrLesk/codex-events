import { describe, expect, test } from 'vitest'

import {
  buildAbsoluteAccountHackathonTeamTabHref,
  buildAccountHackathonTeamTabHref,
  normalizeTeamSlugQueryValue
} from '../../../../app/utils/team-query'

describe('team query helpers', () => {
  test('normalizes the team slug query to a trimmed lowercase value', () => {
    expect(normalizeTeamSlugQueryValue(' Alpha-Team ')).toBe('alpha-team')
    expect(normalizeTeamSlugQueryValue(['Beta-Team', 'ignored'])).toBe('beta-team')
    expect(normalizeTeamSlugQueryValue('')).toBeNull()
    expect(normalizeTeamSlugQueryValue(null)).toBeNull()
  })

  test('builds shareable account team tab hrefs with an optional team slug', () => {
    expect(buildAccountHackathonTeamTabHref('codex-vienna-2026-04-18')).toBe(
      '/account/hackathons/codex-vienna-2026-04-18?tab=team'
    )

    expect(buildAccountHackathonTeamTabHref('codex-vienna-2026-04-18', 'Alpha-Team')).toBe(
      '/account/hackathons/codex-vienna-2026-04-18?tab=team&team=alpha-team'
    )
  })

  test('builds an absolute shareable account team tab href from the current origin', () => {
    expect(buildAbsoluteAccountHackathonTeamTabHref(
      'http://localhost:3000',
      'codex-vienna-2026-04-18',
      'Alpha-Team'
    )).toBe('http://localhost:3000/account/hackathons/codex-vienna-2026-04-18?tab=team&team=alpha-team')
  })
})
