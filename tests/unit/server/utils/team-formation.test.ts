import { afterEach, describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  hackathons,
  submissions,
  teamMembers,
  teams,
  users
} from '../../../../server/database/schema'
import {
  assertHackathonAllowsTeamFormation,
  assertJoinRequestPending,
  assertLeaveOrRemovalAllowed,
  assertTeamDiscoveryAllowed,
  createTeamSlug,
  serializeTeamMember
} from '../../../../server/utils/team-formation'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

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
})
