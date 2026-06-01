import { describe, expect, test } from 'vitest'

import type { EventParticipationRecord } from '../../../../../app/domains/events/participation'

import {
  formatParticipationStageLabel,
  formatParticipationStatusLabel,
  getEventParticipationOutcomeNotice,
  getEventParticipationRankNotice,
  getEventParticipationPrimaryAction,
  getParticipationStageColor,
  getParticipationStatusColor,
  isEventParticipationUpcoming
} from '../../../../../app/domains/events/participation'

function buildRecord(
  overrides: Partial<EventParticipationRecord> = {}
): EventParticipationRecord {
  return {
    event: {
      id: 'event-vienna',
      name: 'Codex Community Event - Vienna',
      slug: 'vienna',
      city: 'Vienna',
      country: 'Austria',
      state: 'registration_open',
      startsAt: '2026-03-28T09:00:00Z',
      registrationOpensAt: '2026-03-01T09:00:00Z',
      registrationClosesAt: '2026-03-15T09:00:00Z',
      submissionClosesAt: '2026-04-18T18:00:00Z'
    },
    isPast: false,
    lastActivityAt: '2026-03-10T09:00:00Z',
    application: {
      id: 'application-1',
      status: 'submitted',
      submittedAt: '2026-03-09T09:00:00Z',
      withdrawnAt: null,
      reviewedAt: null,
      updatedAt: '2026-03-10T09:00:00Z'
    },
    activeTeam: null,
    latestTeam: null,
    latestSubmission: null,
    outcome: null,
    ...overrides
  }
}

describe('event participation badge helpers', () => {
  test('does not treat registration-open events as upcoming even before their start time', () => {
    expect(isEventParticipationUpcoming(buildRecord(), Date.parse('2026-03-01T00:00:00Z'))).toBe(false)
  })

  test('treats future non-registration current events as upcoming', () => {
    expect(isEventParticipationUpcoming(buildRecord({
      event: {
        ...buildRecord().event,
        state: 'submission_open'
      }
    }), Date.parse('2026-03-01T00:00:00Z'))).toBe(true)
  })

  test('uses application submitted plus pending when review is still outstanding', () => {
    const record = buildRecord()

    expect(formatParticipationStageLabel(record)).toBe('Application submitted')
    expect(getParticipationStageColor(record)).toBe('neutral')
    expect(formatParticipationStatusLabel(record)).toBe('Pending review')
    expect(getParticipationStatusColor(record)).toBe('warning')
  })

  test('uses approved when the application was accepted', () => {
    const record = buildRecord({
      application: {
        id: 'application-1',
        status: 'approved',
        submittedAt: '2026-03-09T09:00:00Z',
        withdrawnAt: null,
        reviewedAt: '2026-03-12T09:00:00Z',
        updatedAt: '2026-03-12T09:00:00Z'
      }
    })

    expect(formatParticipationStageLabel(record)).toBe('Application submitted')
    expect(formatParticipationStatusLabel(record)).toBe('Approved')
    expect(getParticipationStatusColor(record)).toBe('success')
  })

  test('uses not approved when the application was rejected', () => {
    const record = buildRecord({
      application: {
        id: 'application-1',
        status: 'rejected',
        submittedAt: '2026-03-09T09:00:00Z',
        withdrawnAt: null,
        reviewedAt: '2026-03-12T09:00:00Z',
        updatedAt: '2026-03-12T09:00:00Z'
      }
    })

    expect(formatParticipationStageLabel(record)).toBe('Application submitted')
    expect(formatParticipationStatusLabel(record)).toBe('Not approved')
    expect(getParticipationStatusColor(record)).toBe('error')
  })

  test('falls back to project state labels when no application record is available', () => {
    const record = buildRecord({
      application: null,
      latestSubmission: {
        id: 'submission-1',
        teamId: 'team-1',
        status: 'submitted',
        projectName: 'Project',
        summary: null,
        repositoryUrl: null,
        demoUrl: null,
        submittedAt: '2026-03-20T09:00:00Z',
        lockedAt: null,
        withdrawnAt: null,
        disqualifiedAt: null,
        createdAt: '2026-03-18T09:00:00Z',
        updatedAt: '2026-03-20T09:00:00Z'
      }
    })

    expect(formatParticipationStageLabel(record)).toBe('Project submitted')
    expect(getParticipationStageColor(record)).toBe('primary')
    expect(formatParticipationStatusLabel(record)).toBe('Project submitted')
    expect(getParticipationStatusColor(record)).toBe('primary')
  })

  test('always routes participation cards to the overview workspace', () => {
    const record = buildRecord({
      application: {
        id: 'application-1',
        status: 'approved',
        submittedAt: '2026-03-09T09:00:00Z',
        withdrawnAt: null,
        reviewedAt: '2026-03-12T09:00:00Z',
        updatedAt: '2026-03-12T09:00:00Z'
      },
      activeTeam: {
        id: 'team-1',
        name: 'North Star Builders',
        slug: 'north-star-builders',
        membershipRole: 'admin',
        joinedAt: '2026-03-15T09:00:00Z',
        leftAt: null,
        isActiveMembership: true,
        activeMemberCount: 3
      }
    })

    expect(getEventParticipationPrimaryAction(record)).toEqual({
      href: '/account/events/vienna',
      label: 'Open overview'
    })
  })

  test('returns a shortlist notice only after the team advances', () => {
    const notice = getEventParticipationOutcomeNotice(buildRecord({
      event: {
        ...buildRecord().event,
        state: 'pitch'
      },
      activeTeam: {
        id: 'team-1',
        name: 'North Star Builders',
        slug: 'north-star-builders',
        membershipRole: 'admin',
        joinedAt: '2026-03-15T09:00:00Z',
        leftAt: null,
        isActiveMembership: true,
        activeMemberCount: 3
      },
      outcome: {
        isShortlisted: true,
        isWinner: false,
        finalRank: null,
        rankedTeamCount: 0,
        prizes: []
      }
    }))

    expect(notice).toEqual({
      color: 'info',
      title: 'Your team is shortlisted',
      description: 'North Star Builders advanced to the live pitch stage.'
    })
  })

  test('does not return a winner notice once winners are announced', () => {
    const notice = getEventParticipationOutcomeNotice(buildRecord({
      event: {
        ...buildRecord().event,
        state: 'winners_announced'
      },
      activeTeam: {
        id: 'team-1',
        name: 'North Star Builders',
        slug: 'north-star-builders',
        membershipRole: 'admin',
        joinedAt: '2026-03-15T09:00:00Z',
        leftAt: null,
        isActiveMembership: true,
        activeMemberCount: 3
      },
      outcome: {
        isShortlisted: true,
        isWinner: true,
        finalRank: 1,
        rankedTeamCount: 24,
        prizes: [
          {
            id: 'prize-1',
            name: 'Grand Prize'
          },
          {
            id: 'prize-2',
            name: 'Best Demo'
          }
        ]
      }
    }))

    expect(notice).toBeNull()
  })

  test('does not return a final rank notice after completion', () => {
    const notice = getEventParticipationOutcomeNotice(buildRecord({
      event: {
        ...buildRecord().event,
        state: 'completed'
      },
      latestTeam: {
        id: 'team-1',
        name: 'North Star Builders',
        slug: 'north-star-builders',
        membershipRole: 'member',
        joinedAt: '2026-03-15T09:00:00Z',
        leftAt: '2026-03-16T09:00:00Z',
        isActiveMembership: false,
        activeMemberCount: 0
      },
      outcome: {
        isShortlisted: false,
        isWinner: false,
        finalRank: 7,
        rankedTeamCount: 24,
        prizes: []
      }
    }))

    expect(notice).toBeNull()
  })

  test('returns a final placement notice after completion when a final rank exists', () => {
    const notice = getEventParticipationRankNotice({
      eventState: 'completed',
      teamName: 'North Star Builders',
      rankSummary: {
        basis: 'final',
        rank: 2,
        rankedTeamCount: 10,
        totalTeamCount: 40
      }
    })

    expect(notice).toEqual({
      color: 'info',
      title: 'Your final placement',
      description: 'North Star Builders finished #2 out of 40 in the completed final ranking.'
    })
  })

  test('returns a blind-review placement notice after completion for post-shortlist teams', () => {
    const notice = getEventParticipationRankNotice({
      eventState: 'completed',
      teamName: 'North Star Builders',
      rankSummary: {
        basis: 'blind_review',
        rank: 14,
        rankedTeamCount: 40,
        totalTeamCount: 40
      }
    })

    expect(notice).toEqual({
      color: 'info',
      title: 'Your blind-review placement',
      description: 'North Star Builders finished #14 out of 40 in blind review. Teams below the finalist cutoff do not receive a final placement.'
    })
  })
})
