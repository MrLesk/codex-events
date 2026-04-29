import { afterEach, describe, expect, test } from 'vitest'

import { ApiError } from '../../../../../server/http/api-error'
import {
  hackathons,
  submissions,
  teamMembers,
  teams,
  users
} from '../../../../../server/database/schema'
import {
  assertHackathonAllowsTeamFormation,
  assertJoinRequestPending,
  assertLeaveOrRemovalAllowed,
  assertTeamDiscoveryAllowed,
  createTeamSlug,
  listVisibleTeams,
  serializeTeamMember
} from '../../../../../server/domains/teams'
import { createApiRouteTestHarness } from '../../../../support/backend/api-route'

function createHackathon(state: 'registration_open' | 'submission_open' | 'judging_preparation') {
  return {
    id: 'hackathon_1',
    name: 'Fixture Hackathon',
    slug: 'fixture-hackathon',
    description: 'Fixture hackathon',
    backgroundImageUrl: null,
    bannerImageUrl: null,
    discordServerUrl: null,
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
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('creates team slug bases from team names', () => {
    expect(createTeamSlug(' North Star Builders ')).toBe('north-star-builders')
    expect(createTeamSlug('Team!!!')).toBe('team')
  })

  test('team formation is limited to registration_open and submission_open', () => {
    expect(() => assertHackathonAllowsTeamFormation(createHackathon('registration_open'))).not.toThrow()
    expect(() => assertHackathonAllowsTeamFormation(createHackathon('submission_open'))).not.toThrow()
    expect(() => assertHackathonAllowsTeamFormation(createHackathon('judging_preparation'))).toThrowError(ApiError)
  })

  test('team discovery allows approved users throughout the workspace and team members after approval closes', () => {
    expect(() => assertTeamDiscoveryAllowed(createHackathon('registration_open'), {
      isHackathonAdmin: false,
      isTeamMember: false,
      applicationStatus: 'approved'
    })).not.toThrow()

    expect(() => assertTeamDiscoveryAllowed(createHackathon('judging_preparation'), {
      isHackathonAdmin: false,
      isTeamMember: false,
      applicationStatus: 'approved'
    })).not.toThrow()

    expect(() => assertTeamDiscoveryAllowed(createHackathon('judging_preparation'), {
      isHackathonAdmin: false,
      isTeamMember: true,
      applicationStatus: null
    })).not.toThrow()
  })

  test('last-member leave is allowed during team formation when no active submission exists', async () => {
    const harness = createApiRouteTestHarness({
      routes: []
    })
    harnesses.push(harness)

    await harness.database.insert(users).values({
      id: 'user_admin',
      auth0Subject: 'auth0|user_admin',
      email: 'user-admin@example.com',
      displayName: 'User Admin'
    })

    await harness.database.insert(hackathons).values({
      ...createHackathon('registration_open'),
      id: 'hackathon_1',
      createdByUserId: 'user_admin'
    })

    await harness.database.insert(teams).values({
      id: 'team_1',
      hackathonId: 'hackathon_1',
      name: 'Fixture Team',
      slug: 'fixture-team',
      isOpenToJoinRequests: true,
      createdByUserId: 'user_admin'
    })

    const member = {
      id: 'member_admin',
      teamId: 'team_1',
      userId: 'user_admin',
      role: 'admin' as const,
      joinedAt: '2026-03-22T12:00:00.000Z',
      leftAt: null,
      createdAt: '2026-03-22T12:00:00.000Z'
    }

    await harness.database.insert(teamMembers).values(member)

    await expect(assertLeaveOrRemovalAllowed(
      harness.database,
      createHackathon('registration_open'),
      [member],
      member
    )).resolves.toEqual({
      teamDissolved: true
    })
  })

  test('last-member leave is blocked when an active submission exists or after submission closes', async () => {
    const harness = createApiRouteTestHarness({
      routes: []
    })
    harnesses.push(harness)

    await harness.database.insert(users).values({
      id: 'user_1',
      auth0Subject: 'auth0|user_1',
      email: 'user-1@example.com',
      displayName: 'User One'
    })

    await harness.database.insert(hackathons).values({
      ...createHackathon('registration_open'),
      id: 'hackathon_1',
      createdByUserId: 'user_1'
    })

    await harness.database.insert(teams).values({
      id: 'team_1',
      hackathonId: 'hackathon_1',
      name: 'Fixture Team',
      slug: 'fixture-team',
      isOpenToJoinRequests: true,
      createdByUserId: 'user_1'
    })

    const member = {
      id: 'member_1',
      teamId: 'team_1',
      userId: 'user_1',
      role: 'admin' as const,
      joinedAt: '2026-03-22T12:00:00.000Z',
      leftAt: null,
      createdAt: '2026-03-22T12:00:00.000Z'
    }

    await harness.database.insert(teamMembers).values(member)
    await harness.database.insert(submissions).values({
      id: 'submission_1',
      teamId: 'team_1',
      status: 'draft'
    })

    await expect(assertLeaveOrRemovalAllowed(
      harness.database,
      createHackathon('registration_open'),
      [member],
      member
    )).rejects.toThrowError(ApiError)

    await harness.database.delete(submissions)

    await expect(assertLeaveOrRemovalAllowed(
      harness.database,
      createHackathon('judging_preparation'),
      [member],
      member
    )).rejects.toThrowError(ApiError)
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

  test('team member serialization can redact sensitive user fields for non-members', () => {
    const member = {
      id: 'membership_1',
      teamId: 'team_1',
      userId: 'user_1',
      role: 'member',
      joinedAt: '2026-03-22T12:00:00.000Z',
      leftAt: null,
      createdAt: '2026-03-22T12:00:00.000Z'
    } as Parameters<typeof serializeTeamMember>[0]
    const user = {
      id: 'user_1',
      email: 'user@example.com',
      displayName: 'Visible User',
      xProfileUrl: 'https://x.com/visible-user',
      linkedinProfileUrl: 'https://linkedin.com/in/visible-user',
      githubProfileUrl: 'https://github.com/visible-user',
      chatgptEmail: 'visible-user-chatgpt@example.com',
      openaiOrgId: 'org_visible_user',
      lumaUsername: 'visible-user'
    } as NonNullable<Parameters<typeof serializeTeamMember>[1]>

    const fullMember = serializeTeamMember(member, user)
    expect(fullMember.user).toMatchObject({
      email: 'user@example.com',
      githubProfileUrl: 'https://github.com/visible-user',
      chatgptEmail: 'visible-user-chatgpt@example.com',
      openaiOrgId: 'org_visible_user',
      lumaUsername: 'visible-user'
    })

    const redactedMember = serializeTeamMember(member, user, {
      includeSensitiveUserFields: false
    })
    expect(redactedMember.user).toMatchObject({
      id: 'user_1',
      displayName: 'Visible User'
    })
    expect(redactedMember.user).not.toHaveProperty('email')
    expect(redactedMember.user).not.toHaveProperty('xProfileUrl')
    expect(redactedMember.user).not.toHaveProperty('linkedinProfileUrl')
    expect(redactedMember.user).not.toHaveProperty('githubProfileUrl')
    expect(redactedMember.user).not.toHaveProperty('chatgptEmail')
    expect(redactedMember.user).not.toHaveProperty('openaiOrgId')
    expect(redactedMember.user).not.toHaveProperty('lumaUsername')
  })

  test('visible team filter counts stay anchored to the active team set', async () => {
    const harness = createApiRouteTestHarness({
      routes: []
    })
    harnesses.push(harness)

    await harness.database.insert(users).values([
      {
        id: 'user_admin',
        auth0Subject: 'auth0|user_admin',
        email: 'user-admin@example.com',
        displayName: 'User Admin'
      },
      {
        id: 'user_2',
        auth0Subject: 'auth0|user_2',
        email: 'user-2@example.com',
        displayName: 'User Two'
      },
      {
        id: 'user_3',
        auth0Subject: 'auth0|user_3',
        email: 'user-3@example.com',
        displayName: 'User Three'
      },
      {
        id: 'user_4',
        auth0Subject: 'auth0|user_4',
        email: 'user-4@example.com',
        displayName: 'User Four'
      },
      {
        id: 'user_5',
        auth0Subject: 'auth0|user_5',
        email: 'user-5@example.com',
        displayName: 'User Five'
      },
      {
        id: 'user_6',
        auth0Subject: 'auth0|user_6',
        email: 'user-6@example.com',
        displayName: 'User Six'
      },
      {
        id: 'user_7',
        auth0Subject: 'auth0|user_7',
        email: 'user-7@example.com',
        displayName: 'User Seven'
      },
      {
        id: 'user_8',
        auth0Subject: 'auth0|user_8',
        email: 'user-8@example.com',
        displayName: 'User Eight'
      },
      {
        id: 'user_9',
        auth0Subject: 'auth0|user_9',
        email: 'user-9@example.com',
        displayName: 'User Nine'
      }
    ])

    await harness.database.insert(hackathons).values({
      ...createHackathon('registration_open'),
      id: 'hackathon_1',
      createdByUserId: 'user_admin'
    })

    await harness.database.insert(teams).values([
      {
        id: 'team_solo',
        hackathonId: 'hackathon_1',
        name: 'Alpha Solo',
        slug: 'alpha-solo',
        workspaceMode: 'solo',
        isOpenToJoinRequests: true,
        createdByUserId: 'user_admin'
      },
      {
        id: 'team_open',
        hackathonId: 'hackathon_1',
        name: 'Beta Builders',
        slug: 'beta-builders',
        workspaceMode: 'team',
        isOpenToJoinRequests: true,
        createdByUserId: 'user_admin'
      },
      {
        id: 'team_closed',
        hackathonId: 'hackathon_1',
        name: 'Gamma Guild',
        slug: 'gamma-guild',
        workspaceMode: 'team',
        isOpenToJoinRequests: false,
        createdByUserId: 'user_admin'
      },
      {
        id: 'team_full',
        hackathonId: 'hackathon_1',
        name: 'Delta Full',
        slug: 'delta-full',
        workspaceMode: 'team',
        isOpenToJoinRequests: false,
        createdByUserId: 'user_admin'
      },
      {
        id: 'team_inactive',
        hackathonId: 'hackathon_1',
        name: 'Echo Inactive',
        slug: 'echo-inactive',
        workspaceMode: 'team',
        isOpenToJoinRequests: true,
        createdByUserId: 'user_admin'
      }
    ])

    await harness.database.insert(teamMembers).values([
      {
        id: 'member_1',
        teamId: 'team_solo',
        userId: 'user_admin',
        role: 'admin',
        joinedAt: '2026-03-22T12:00:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'member_2',
        teamId: 'team_open',
        userId: 'user_2',
        role: 'admin',
        joinedAt: '2026-03-22T12:00:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'member_3',
        teamId: 'team_open',
        userId: 'user_3',
        role: 'member',
        joinedAt: '2026-03-22T12:00:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'member_4',
        teamId: 'team_closed',
        userId: 'user_4',
        role: 'admin',
        joinedAt: '2026-03-22T12:00:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'member_5',
        teamId: 'team_closed',
        userId: 'user_5',
        role: 'member',
        joinedAt: '2026-03-22T12:00:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'member_6',
        teamId: 'team_full',
        userId: 'user_6',
        role: 'admin',
        joinedAt: '2026-03-22T12:00:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'member_7',
        teamId: 'team_full',
        userId: 'user_7',
        role: 'member',
        joinedAt: '2026-03-22T12:00:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'member_8',
        teamId: 'team_full',
        userId: 'user_8',
        role: 'member',
        joinedAt: '2026-03-22T12:00:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'member_9',
        teamId: 'team_full',
        userId: 'user_9',
        role: 'member',
        joinedAt: '2026-03-22T12:00:00.000Z',
        leftAt: null,
        createdAt: '2026-03-22T12:00:00.000Z'
      }
    ])

    const result = await listVisibleTeams(
      harness.database,
      createHackathon('registration_open'),
      'hackathon_1',
      {
        page: 1,
        page_size: 10,
        workspace_mode: 'solo'
      }
    )

    expect(result.total).toBe(1)
    expect(result.data.map(team => team.id)).toEqual(['team_solo'])
    expect(result.filterCounts).toEqual({
      all: 4,
      open_to_join: 2,
      solo: 1,
      multi_person: 3,
      full: 1
    })
  })
})
