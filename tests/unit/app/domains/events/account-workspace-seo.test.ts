import { describe, expect, test } from 'vitest'

import { getAccountEventSeoContent } from '../../../../../app/domains/events/account-workspace-seo'

describe('account event seo helpers', () => {
  test('returns participant-facing metadata for the overview tab', () => {
    expect(getAccountEventSeoContent('overview', 'Buildathon')).toEqual({
      title: 'Buildathon Overview | Codex Events',
      description: 'See your status, timeline, and key details for Buildathon.'
    })
  })

  test('returns participant-facing metadata for the workspace tab', () => {
    expect(getAccountEventSeoContent('workspace', 'Buildathon')).toEqual({
      title: 'Workspace | Buildathon | Codex Events',
      description: 'Manage your participation, team workspace, and submission for Buildathon.'
    })
  })

  test('returns participant-facing metadata for the credits tab', () => {
    expect(getAccountEventSeoContent('credits', 'Buildathon')).toEqual({
      title: 'Credits | Buildathon | Codex Events',
      description: 'Claim or manage event credits for Buildathon.'
    })
  })

  test('returns admin-facing metadata for the operations tab', () => {
    expect(getAccountEventSeoContent('operations', 'Buildathon')).toEqual({
      title: 'Manage Buildathon | Codex Events',
      description: 'Run approvals, judging, and outcomes for Buildathon.'
    })
  })

  test('returns gallery metadata for the gallery tab', () => {
    expect(getAccountEventSeoContent('gallery', 'Buildathon')).toEqual({
      title: 'Gallery | Buildathon | Codex Events',
      description: 'Browse event gallery photos from Buildathon.'
    })
  })

  test('returns internal metadata for the feedback tab', () => {
    expect(getAccountEventSeoContent('feedback', 'Buildathon')).toEqual({
      title: 'Feedback | Buildathon | Codex Events',
      description: 'Review post-event feedback for Buildathon.'
    })
  })

  test('returns admin-facing metadata for the submissions tab', () => {
    expect(getAccountEventSeoContent('submissions', 'Buildathon')).toEqual({
      title: 'Submissions | Buildathon | Codex Events',
      description: 'See team submissions and submission status for Buildathon.'
    })
  })

  test('returns judge-facing metadata for the judging tab', () => {
    expect(getAccountEventSeoContent('judging', 'Buildathon')).toEqual({
      title: 'Judging | Buildathon | Codex Events',
      description: 'Review your judging queue and progress for Buildathon.'
    })
  })

  test('returns admin-facing metadata for the settings tab', () => {
    expect(getAccountEventSeoContent('settings', 'Buildathon')).toEqual({
      title: 'Settings | Buildathon | Codex Events',
      description: 'Update the configuration, terms, and judging criteria for Buildathon.'
    })
  })
})
