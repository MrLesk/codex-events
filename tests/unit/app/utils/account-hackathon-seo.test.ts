import { describe, expect, test } from 'vitest'

import { getAccountHackathonSeoContent } from '../../../../app/utils/account-hackathon-seo'

describe('account hackathon seo helpers', () => {
  test('returns participant-facing metadata for the overview tab', () => {
    expect(getAccountHackathonSeoContent('overview', 'Buildathon')).toEqual({
      title: 'Buildathon Overview | Codex Hackathons',
      description: 'See your status, timeline, and key details for Buildathon.'
    })
  })

  test('returns admin-facing metadata for the operations tab', () => {
    expect(getAccountHackathonSeoContent('operations', 'Buildathon')).toEqual({
      title: 'Manage Buildathon | Codex Hackathons',
      description: 'Run approvals, judging, and outcomes for Buildathon.'
    })
  })

  test('returns judge-facing metadata for the judging tab', () => {
    expect(getAccountHackathonSeoContent('judging', 'Buildathon')).toEqual({
      title: 'Judging | Buildathon | Codex Hackathons',
      description: 'Review your judging queue and progress for Buildathon.'
    })
  })
})
