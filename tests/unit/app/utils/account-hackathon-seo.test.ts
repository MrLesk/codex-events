import { describe, expect, test } from 'vitest'

import { getAccountHackathonSeoContent } from '../../../../app/utils/account-hackathon-seo'

describe('account hackathon seo helpers', () => {
  test('returns participant-facing metadata for the overview tab', () => {
    expect(getAccountHackathonSeoContent('overview', 'Buildathon')).toEqual({
      title: 'Buildathon Overview | Codex Hackathons',
      description: 'See your status, timeline, and key details for Buildathon.'
    })
  })

  test('returns participant-facing metadata for the workspace tab', () => {
    expect(getAccountHackathonSeoContent('workspace', 'Buildathon')).toEqual({
      title: 'Workspace | Buildathon | Codex Hackathons',
      description: 'Manage your participation, team workspace, and submission for Buildathon.'
    })
  })

  test('returns participant-facing metadata for the credits tab', () => {
    expect(getAccountHackathonSeoContent('credits', 'Buildathon')).toEqual({
      title: 'Credits | Buildathon | Codex Hackathons',
      description: 'Claim or manage hackathon credits for Buildathon.'
    })
  })

  test('returns admin-facing metadata for the operations tab', () => {
    expect(getAccountHackathonSeoContent('operations', 'Buildathon')).toEqual({
      title: 'Manage Buildathon | Codex Hackathons',
      description: 'Run approvals, judging, and outcomes for Buildathon.'
    })
  })

  test('returns gallery metadata for the gallery tab', () => {
    expect(getAccountHackathonSeoContent('gallery', 'Buildathon')).toEqual({
      title: 'Gallery | Buildathon | Codex Hackathons',
      description: 'Browse hackathon gallery photos from Buildathon.'
    })
  })

  test('returns internal metadata for the feedback tab', () => {
    expect(getAccountHackathonSeoContent('feedback', 'Buildathon')).toEqual({
      title: 'Feedback | Buildathon | Codex Hackathons',
      description: 'Review post-hackathon feedback for Buildathon.'
    })
  })

  test('returns admin-facing metadata for the submissions tab', () => {
    expect(getAccountHackathonSeoContent('submissions', 'Buildathon')).toEqual({
      title: 'Submissions | Buildathon | Codex Hackathons',
      description: 'See team submissions and submission status for Buildathon.'
    })
  })

  test('returns judge-facing metadata for the judging tab', () => {
    expect(getAccountHackathonSeoContent('judging', 'Buildathon')).toEqual({
      title: 'Judging | Buildathon | Codex Hackathons',
      description: 'Review your judging queue and progress for Buildathon.'
    })
  })

  test('returns admin-facing metadata for the settings tab', () => {
    expect(getAccountHackathonSeoContent('settings', 'Buildathon')).toEqual({
      title: 'Settings | Buildathon | Codex Hackathons',
      description: 'Update the configuration, terms, and judging criteria for Buildathon.'
    })
  })
})
