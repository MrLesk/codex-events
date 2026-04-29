import { describe, expect, test } from 'vitest'

import {
  countAdminOverviewHackathonsByTab,
  getAdminOverviewHackathonStartsAt,
  getAdminOverviewTabForHackathon
} from '../../../../../app/domains/hackathons/admin-overview'

function createHackathon(overrides: Partial<{
  agendaItems: Array<{ startsAt: string }>
  state: 'draft' | 'registration_open' | 'submission_open' | 'judging_preparation' | 'blind_review' | 'shortlist' | 'pitch' | 'pitch_review' | 'final_deliberation' | 'winners_announced' | 'completed'
  submissionOpensAt: string
}> = {}) {
  return {
    agendaItems: [],
    state: 'registration_open' as const,
    submissionOpensAt: '2026-05-20T10:00:00.000Z',
    ...overrides
  }
}

describe('admin overview hackathon helpers', () => {
  test('derives the start time from the earliest agenda item before submission opens', () => {
    expect(getAdminOverviewHackathonStartsAt(createHackathon({
      submissionOpensAt: '2026-05-20T10:00:00.000Z',
      agendaItems: [
        { startsAt: '2026-05-18T09:00:00.000Z' },
        { startsAt: '2026-05-22T09:00:00.000Z' }
      ]
    }))).toBe('2026-05-18T09:00:00.000Z')
  })

  test('keeps draft hackathons in upcoming even when their derived start time is in the past', () => {
    expect(getAdminOverviewTabForHackathon(createHackathon({
      state: 'draft',
      submissionOpensAt: '2026-01-10T10:00:00.000Z',
      agendaItems: [
        { startsAt: '2026-01-08T09:00:00.000Z' }
      ]
    }), Date.parse('2026-03-01T00:00:00.000Z'))).toBe('upcoming')
  })

  test('classifies completed hackathons as past and future-starting non-drafts as upcoming', () => {
    expect(getAdminOverviewTabForHackathon(createHackathon({
      state: 'completed',
      submissionOpensAt: '2026-08-01T10:00:00.000Z'
    }), Date.parse('2026-04-01T00:00:00.000Z'))).toBe('past')

    expect(getAdminOverviewTabForHackathon(createHackathon({
      state: 'registration_open',
      submissionOpensAt: '2026-08-01T10:00:00.000Z'
    }), Date.parse('2026-04-01T00:00:00.000Z'))).toBe('upcoming')
  })

  test('counts hackathons across active upcoming and past tabs', () => {
    expect(countAdminOverviewHackathonsByTab([
      createHackathon({
        state: 'registration_open',
        submissionOpensAt: '2026-03-15T10:00:00.000Z'
      }),
      createHackathon({
        state: 'draft',
        submissionOpensAt: '2026-02-10T10:00:00.000Z'
      }),
      createHackathon({
        state: 'blind_review',
        submissionOpensAt: '2026-06-01T10:00:00.000Z'
      }),
      createHackathon({
        state: 'completed',
        submissionOpensAt: '2026-01-10T10:00:00.000Z'
      })
    ], Date.parse('2026-04-01T00:00:00.000Z'))).toEqual({
      active: 1,
      upcoming: 2,
      past: 1
    })
  })
})
