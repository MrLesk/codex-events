import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertHackathonAllowsTeamFormation,
  assertJoinRequestPending,
  assertLeaveOrRemovalAllowed,
  assertTeamDiscoveryAllowed
} from '../../../../server/utils/team-formation'

function createHackathon(state: 'registration_open' | 'submission_open' | 'judging_preparation') {
  return {
    id: 'hackathon_1',
    name: 'Fixture Hackathon',
    slug: 'fixture-hackathon',
    description: 'Fixture hackathon',
    backgroundImageUrl: null,
    bannerImageUrl: null,
    city: 'Vienna',
    country: 'Austria',
    address: 'Fixture Address',
    registrationOpensAt: '2026-03-20T12:00:00.000Z',
    registrationClosesAt: '2026-03-23T12:00:00.000Z',
    submissionOpensAt: '2026-03-23T12:00:00.000Z',
    submissionClosesAt: '2026-03-25T12:00:00.000Z',
    state,
    maxTeamMembers: 4,
    requireXProfile: false,
    requireLinkedinProfile: false,
    requireGithubProfile: false,
    currentApplicationTermsDocumentId: null,
    currentWinnerTermsDocumentId: null,
    createdByUserId: 'creator_1',
    createdAt: '2026-03-20T10:00:00.000Z',
    updatedAt: '2026-03-20T10:00:00.000Z'
  } as const
}

describe('team formation utilities', () => {
  test('team formation is limited to registration_open and submission_open', () => {
    expect(() => assertHackathonAllowsTeamFormation(createHackathon('registration_open'))).not.toThrow()
    expect(() => assertHackathonAllowsTeamFormation(createHackathon('submission_open'))).not.toThrow()
    expect(() => assertHackathonAllowsTeamFormation(createHackathon('judging_preparation'))).toThrowError(ApiError)
  })

  test('team discovery allows approved users only while team formation is open', () => {
    expect(() => assertTeamDiscoveryAllowed(createHackathon('registration_open'), {
      isHackathonAdmin: false,
      isTeamMember: false,
      applicationStatus: 'approved'
    })).not.toThrow()

    expect(() => assertTeamDiscoveryAllowed(createHackathon('judging_preparation'), {
      isHackathonAdmin: false,
      isTeamMember: false,
      applicationStatus: 'approved'
    })).toThrowError(ApiError)

    expect(() => assertTeamDiscoveryAllowed(createHackathon('judging_preparation'), {
      isHackathonAdmin: false,
      isTeamMember: true,
      applicationStatus: null
    })).not.toThrow()
  })

  test('leave and removal rules preserve an active admin', () => {
    expect(() => assertLeaveOrRemovalAllowed(
      createHackathon('registration_open'),
      [
        {
          id: 'member_admin',
          teamId: 'team_1',
          userId: 'user_admin',
          role: 'admin',
          joinedAt: '2026-03-22T12:00:00.000Z',
          leftAt: null,
          createdAt: '2026-03-22T12:00:00.000Z'
        }
      ],
      {
        id: 'member_admin',
        teamId: 'team_1',
        userId: 'user_admin',
        role: 'admin',
        joinedAt: '2026-03-22T12:00:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:00:00.000Z'
      }
    )).toThrowError(ApiError)
  })

  test('leave and removal rules preserve one active member after submission closes', () => {
    expect(() => assertLeaveOrRemovalAllowed(
      createHackathon('judging_preparation'),
      [
        {
          id: 'member_1',
          teamId: 'team_1',
          userId: 'user_1',
          role: 'member',
          joinedAt: '2026-03-22T12:00:00.000Z',
          leftAt: null,
          createdAt: '2026-03-22T12:00:00.000Z'
        }
      ],
      {
        id: 'member_1',
        teamId: 'team_1',
        userId: 'user_1',
        role: 'member',
        joinedAt: '2026-03-22T12:00:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:00:00.000Z'
      }
    )).toThrowError(ApiError)
  })

  test('only pending join requests can be changed', () => {
    expect(() => assertJoinRequestPending({
      id: 'request_1',
      teamId: 'team_1',
      userId: 'user_1',
      status: 'pending',
      requestedAt: '2026-03-22T12:00:00.000Z',
      reviewedAt: null,
      reviewedByUserId: null,
      createdAt: '2026-03-22T12:00:00.000Z'
    })).not.toThrow()

    expect(() => assertJoinRequestPending({
      id: 'request_1',
      teamId: 'team_1',
      userId: 'user_1',
      status: 'approved',
      requestedAt: '2026-03-22T12:00:00.000Z',
      reviewedAt: '2026-03-22T13:00:00.000Z',
      reviewedByUserId: 'user_admin',
      createdAt: '2026-03-22T12:00:00.000Z'
    })).toThrowError(ApiError)
  })
})
