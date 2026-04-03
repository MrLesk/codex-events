import { describe, expect, test } from 'vitest'

import type { HackathonParticipationRecord } from '../../../../app/utils/hackathon-participation'

import {
  formatParticipationStageLabel,
  formatParticipationStatusLabel,
  getHackathonParticipationPrimaryAction,
  getParticipationStageColor,
  getParticipationStatusColor
} from '../../../../app/utils/hackathon-participation'

function buildRecord(
  overrides: Partial<HackathonParticipationRecord> = {}
): HackathonParticipationRecord {
  return {
    hackathon: {
      id: 'hackathon-vienna',
      name: 'Codex Community Hackathon - Vienna',
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
    ...overrides
  }
}

describe('hackathon participation badge helpers', () => {
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

    expect(getHackathonParticipationPrimaryAction(record)).toEqual({
      href: '/account/hackathons/vienna',
      label: 'Open overview'
    })
  })
})
