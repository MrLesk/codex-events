import { afterEach, describe, expect, test, vi } from 'vitest'

import { and, eq } from 'drizzle-orm'

import createTeamHandler from '../../../../server/api/hackathons/[hackathonId]/teams/index.post'
import listTeamsHandler from '../../../../server/api/hackathons/[hackathonId]/teams/index.get'
import getTeamHandler from '../../../../server/api/hackathons/[hackathonId]/teams/[teamId]/index.get'
import patchTeamHandler from '../../../../server/api/hackathons/[hackathonId]/teams/[teamId]/index.patch'
import patchJoinPolicyHandler from '../../../../server/api/hackathons/[hackathonId]/teams/[teamId]/join-policy.patch'
import leaveTeamHandler from '../../../../server/api/hackathons/[hackathonId]/teams/[teamId]/actions/leave.post'
import removeMemberHandler from '../../../../server/api/hackathons/[hackathonId]/teams/[teamId]/members/[userId]/actions/remove.post'
import createJoinRequestHandler from '../../../../server/api/hackathons/[hackathonId]/team-join-requests/index.post'
import listJoinRequestsHandler from '../../../../server/api/hackathons/[hackathonId]/teams/[teamId]/join-requests/index.get'
import cancelJoinRequestHandler from '../../../../server/api/hackathons/[hackathonId]/team-join-requests/[requestId]/actions/cancel.post'
import approveJoinRequestHandler from '../../../../server/api/hackathons/[hackathonId]/team-join-requests/[requestId]/actions/approve.post'
import rejectJoinRequestHandler from '../../../../server/api/hackathons/[hackathonId]/team-join-requests/[requestId]/actions/reject.post'
import {
  auditLogs,
  hackathonRoleAssignments,
  hackathonTermsDocuments,
  hackathons,
  teamJoinRequests,
  teamMembers,
  teams,
  userApplications,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

function createRoutes() {
  return [
    { method: 'get' as const, path: '/api/hackathons/:hackathonId/teams', handler: listTeamsHandler },
    { method: 'post' as const, path: '/api/hackathons/:hackathonId/teams', handler: createTeamHandler },
    { method: 'get' as const, path: '/api/hackathons/:hackathonId/teams/:teamId', handler: getTeamHandler },
    { method: 'patch' as const, path: '/api/hackathons/:hackathonId/teams/:teamId', handler: patchTeamHandler },
    {
      method: 'patch' as const,
      path: '/api/hackathons/:hackathonId/teams/:teamId/join-policy',
      handler: patchJoinPolicyHandler
    },
    {
      method: 'post' as const,
      path: '/api/hackathons/:hackathonId/teams/:teamId/actions/leave',
      handler: leaveTeamHandler
    },
    {
      method: 'post' as const,
      path: '/api/hackathons/:hackathonId/teams/:teamId/members/:userId/actions/remove',
      handler: removeMemberHandler
    },
    {
      method: 'post' as const,
      path: '/api/hackathons/:hackathonId/team-join-requests',
      handler: createJoinRequestHandler
    },
    {
      method: 'get' as const,
      path: '/api/hackathons/:hackathonId/teams/:teamId/join-requests',
      handler: listJoinRequestsHandler
    },
    {
      method: 'post' as const,
      path: '/api/hackathons/:hackathonId/team-join-requests/:requestId/actions/cancel',
      handler: cancelJoinRequestHandler
    },
    {
      method: 'post' as const,
      path: '/api/hackathons/:hackathonId/team-join-requests/:requestId/actions/approve',
      handler: approveJoinRequestHandler
    },
    {
      method: 'post' as const,
      path: '/api/hackathons/:hackathonId/team-join-requests/:requestId/actions/reject',
      handler: rejectJoinRequestHandler
    }
  ]
}

async function seedTeamFormationContext(
  harness: ReturnType<typeof createApiRouteTestHarness>,
  options?: {
    state?: 'registration_open' | 'submission_open' | 'judging_preparation'
    teamOpen?: boolean
  }
) {
  await harness.database.insert(users).values([
    {
      id: 'platform_admin',
      auth0Subject: 'auth0|platform_admin',
      email: 'platform-admin@example.com',
      displayName: 'Platform Admin',
      isPlatformAdmin: true
    },
    {
      id: 'hackathon_admin',
      auth0Subject: 'auth0|hackathon_admin',
      email: 'hackathon-admin@example.com',
      displayName: 'Hackathon Admin'
    },
    {
      id: 'team_admin',
      auth0Subject: 'auth0|team_admin',
      email: 'team-admin@example.com',
      displayName: 'Team Admin',
      xProfileUrl: 'https://x.com/team-admin',
      linkedinProfileUrl: 'https://linkedin.com/in/team-admin',
      githubProfileUrl: 'https://github.com/team-admin',
      chatgptEmail: 'team-admin-chatgpt@example.com',
      openaiOrgId: 'org_team_admin',
      lumaUsername: 'team-admin'
    },
    {
      id: 'team_member',
      auth0Subject: 'auth0|team_member',
      email: 'team-member@example.com',
      displayName: 'Team Member',
      githubProfileUrl: 'https://github.com/team-member'
    },
    {
      id: 'requester',
      auth0Subject: 'auth0|requester',
      email: 'requester@example.com',
      displayName: 'Requester',
      githubProfileUrl: 'https://github.com/requester'
    },
    {
      id: 'other_requester',
      auth0Subject: 'auth0|other_requester',
      email: 'other-requester@example.com',
      displayName: 'Other Requester',
      githubProfileUrl: 'https://github.com/other-requester'
    },
    {
      id: 'second_team_admin',
      auth0Subject: 'auth0|second_team_admin',
      email: 'second-admin@example.com',
      displayName: 'Second Team Admin',
      githubProfileUrl: 'https://github.com/second-admin'
    }
  ])

  await harness.database.insert(hackathons).values({
    id: 'hackathon_1',
    name: 'Fixture Hackathon',
    slug: 'fixture-hackathon',
    description: 'Fixture hackathon',
    city: 'Vienna',
    country: 'Austria',
    address: 'Fixture Address',
    registrationOpensAt: '2026-03-20T12:00:00.000Z',
    registrationClosesAt: '2026-03-23T12:00:00.000Z',
    submissionOpensAt: '2026-03-23T12:00:00.000Z',
    submissionClosesAt: '2026-03-25T12:00:00.000Z',
    state: options?.state ?? 'registration_open',
    maxTeamMembers: 4,
    requireGithubProfile: false,
    currentApplicationTermsDocumentId: null,
    currentWinnerTermsDocumentId: null,
    createdByUserId: 'platform_admin'
  })

  await harness.database.insert(hackathonRoleAssignments).values({
    id: 'role_hackathon_admin',
    hackathonId: 'hackathon_1',
    userId: 'hackathon_admin',
    role: 'hackathon_admin',
    isInJudgePool: false,
    createdAt: '2026-03-22T12:00:00.000Z'
  })

  await harness.database.insert(hackathonTermsDocuments).values({
    id: 'terms_app_1',
    hackathonId: 'hackathon_1',
    documentType: 'application_terms',
    version: 1,
    title: 'Application Terms v1',
    content: 'Application terms',
    publishedAt: '2026-03-20T12:00:00.000Z',
    createdAt: '2026-03-20T12:00:00.000Z'
  })

  await harness.database.insert(userApplications).values([
    approvedApplication('application_team_admin', 'team_admin'),
    approvedApplication('application_team_member', 'team_member'),
    approvedApplication('application_requester', 'requester'),
    approvedApplication('application_other_requester', 'other_requester'),
    approvedApplication('application_second_team_admin', 'second_team_admin')
  ])

  await harness.database.insert(teams).values([
    {
      id: 'team_1',
      hackathonId: 'hackathon_1',
      name: 'Alpha Team',
      slug: 'alpha-team',
      isOpenToJoinRequests: options?.teamOpen ?? true,
      createdByUserId: 'team_admin',
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    },
    {
      id: 'team_2',
      hackathonId: 'hackathon_1',
      name: 'Beta Team',
      slug: 'beta-team',
      isOpenToJoinRequests: true,
      createdByUserId: 'second_team_admin',
      createdAt: '2026-03-22T12:00:00.000Z',
      updatedAt: '2026-03-22T12:00:00.000Z'
    }
  ])

  await harness.database.insert(teamMembers).values([
    {
      id: 'membership_admin',
      teamId: 'team_1',
      userId: 'team_admin',
      role: 'admin',
      joinedAt: '2026-03-22T12:00:00.000Z',
      createdAt: '2026-03-22T12:00:00.000Z'
    },
    {
      id: 'membership_member',
      teamId: 'team_1',
      userId: 'team_member',
      role: 'member',
      joinedAt: '2026-03-22T12:00:00.000Z',
      createdAt: '2026-03-22T12:00:00.000Z'
    },
    {
      id: 'membership_second_admin',
      teamId: 'team_2',
      userId: 'second_team_admin',
      role: 'admin',
      joinedAt: '2026-03-22T12:00:00.000Z',
      createdAt: '2026-03-22T12:00:00.000Z'
    }
  ])
}

function approvedApplication(id: string, userId: string) {
  return {
    id,
    hackathonId: 'hackathon_1',
    userId,
    status: 'approved' as const,
    submittedAt: '2026-03-22T11:00:00.000Z',
    reviewedAt: '2026-03-22T11:30:00.000Z',
    reviewedByUserId: 'hackathon_admin',
    applicationTermsDocumentId: 'terms_app_1',
    applicationTermsAcceptedAt: '2026-03-22T11:00:00.000Z',
    createdAt: '2026-03-22T11:00:00.000Z',
    updatedAt: '2026-03-22T11:30:00.000Z'
  }
}

describe('TASK-3.6 team formation routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('approved users can list teams during formation and create a new team with themselves as admin', async () => {
    const harness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|requester',
        email: 'requester@example.com'
      }
    })
    harnesses.push(harness)
    await seedTeamFormationContext(harness)

    const listResponse = await harness.request('/api/hackathons/hackathon_1/teams?page=1&page_size=10')
    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toMatchObject({
      meta: {
        total: 2
      },
      data: expect.arrayContaining([
        expect.objectContaining({
          id: 'team_1',
          activeMemberCount: 2
        })
      ])
    })

    const createResponse = await harness.request('/api/hackathons/hackathon_1/teams', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Requester Team',
        slug: 'requester-team',
        isOpenToJoinRequests: false
      })
    })

    expect(createResponse.status).toBe(200)
    expect(await createResponse.json()).toMatchObject({
      data: {
        name: 'Requester Team',
        slug: 'requester-team',
        isOpenToJoinRequests: false,
        members: [
          expect.objectContaining({
            userId: 'requester',
            role: 'admin'
          })
        ]
      }
    })

    const createdTeam = await harness.database.query.teams.findFirst({
      where: and(
        eq(teams.hackathonId, 'hackathon_1'),
        eq(teams.slug, 'requester-team')
      )
    })
    expect(createdTeam).toBeTruthy()
  })

  test('team admins can rename teams and update join openness', async () => {
    const harness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|team_admin',
        email: 'team-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedTeamFormationContext(harness)

    const renameResponse = await harness.request('/api/hackathons/hackathon_1/teams/team_1', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Renamed Alpha',
        slug: 'renamed-alpha'
      })
    })

    expect(renameResponse.status).toBe(200)
    expect(await renameResponse.json()).toMatchObject({
      data: {
        id: 'team_1',
        name: 'Renamed Alpha',
        slug: 'renamed-alpha'
      }
    })

    const policyResponse = await harness.request('/api/hackathons/hackathon_1/teams/team_1/join-policy', {
      method: 'PATCH',
      body: JSON.stringify({
        isOpenToJoinRequests: false
      })
    })

    expect(policyResponse.status).toBe(200)
    expect(await policyResponse.json()).toMatchObject({
      data: {
        id: 'team_1',
        isOpenToJoinRequests: false
      }
    })
  })

  test('team detail redacts member contact data for approved non-members but preserves it for members and admins', async () => {
    const outsiderHarness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|requester',
        email: 'requester@example.com'
      }
    })
    harnesses.push(outsiderHarness)
    await seedTeamFormationContext(outsiderHarness)

    const outsiderResponse = await outsiderHarness.request('/api/hackathons/hackathon_1/teams/team_1')
    expect(outsiderResponse.status).toBe(200)
    const outsiderBody = await outsiderResponse.json()
    const outsiderAdminMember = outsiderBody.data.members.find((member: { userId: string }) => member.userId === 'team_admin')
    expect(outsiderAdminMember).toMatchObject({
      userId: 'team_admin',
      user: {
        id: 'team_admin',
        displayName: 'Team Admin'
      }
    })
    expect(outsiderAdminMember.user).not.toHaveProperty('email')
    expect(outsiderAdminMember.user).not.toHaveProperty('xProfileUrl')
    expect(outsiderAdminMember.user).not.toHaveProperty('linkedinProfileUrl')
    expect(outsiderAdminMember.user).not.toHaveProperty('githubProfileUrl')
    expect(outsiderAdminMember.user).not.toHaveProperty('chatgptEmail')
    expect(outsiderAdminMember.user).not.toHaveProperty('openaiOrgId')
    expect(outsiderAdminMember.user).not.toHaveProperty('lumaUsername')

    const memberHarness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|team_member',
        email: 'team-member@example.com'
      }
    })
    harnesses.push(memberHarness)
    await seedTeamFormationContext(memberHarness)

    const memberResponse = await memberHarness.request('/api/hackathons/hackathon_1/teams/team_1')
    expect(memberResponse.status).toBe(200)
    await expect(memberResponse.json()).resolves.toMatchObject({
      data: {
        members: expect.arrayContaining([
          expect.objectContaining({
            userId: 'team_admin',
            user: expect.objectContaining({
              email: 'team-admin@example.com',
              xProfileUrl: 'https://x.com/team-admin',
              linkedinProfileUrl: 'https://linkedin.com/in/team-admin',
              githubProfileUrl: 'https://github.com/team-admin',
              chatgptEmail: 'team-admin-chatgpt@example.com',
              openaiOrgId: 'org_team_admin',
              lumaUsername: 'team-admin'
            })
          })
        ])
      }
    })

    const adminHarness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(adminHarness)
    await seedTeamFormationContext(adminHarness)

    const adminResponse = await adminHarness.request('/api/hackathons/hackathon_1/teams/team_1')
    expect(adminResponse.status).toBe(200)
    await expect(adminResponse.json()).resolves.toMatchObject({
      data: {
        members: expect.arrayContaining([
          expect.objectContaining({
            userId: 'team_admin',
            user: expect.objectContaining({
              email: 'team-admin@example.com',
              chatgptEmail: 'team-admin-chatgpt@example.com',
              openaiOrgId: 'org_team_admin',
              lumaUsername: 'team-admin'
            })
          })
        ])
      }
    })
  })

  test('team admins can remove members and membership changes are audited', async () => {
    const harness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|team_admin',
        email: 'team-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedTeamFormationContext(harness)

    const response = await harness.request('/api/hackathons/hackathon_1/teams/team_1/members/team_member/actions/remove', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        teamId: 'team_1',
        userId: 'team_member'
      }
    })

    const storedMembership = await harness.database.query.teamMembers.findFirst({
      where: eq(teamMembers.id, 'membership_member')
    })
    expect(storedMembership?.leftAt).toBeTruthy()

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'team_member',
        entityId: 'membership_member',
        action: 'team_member.removed'
      })
    ]))
  })

  test('the last active admin cannot leave the team', async () => {
    const harness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|team_admin',
        email: 'team-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedTeamFormationContext(harness)

    const response = await harness.request('/api/hackathons/hackathon_1/teams/team_1/actions/leave', {
      method: 'POST'
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'team_admin_required'
      }
    })
  })

  test('approved users can create and cancel their own pending join requests', async () => {
    const harness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|requester',
        email: 'requester@example.com'
      }
    })
    harnesses.push(harness)
    await seedTeamFormationContext(harness)

    const createResponse = await harness.request('/api/hackathons/hackathon_1/team-join-requests', {
      method: 'POST',
      body: JSON.stringify({
        teamId: 'team_1'
      })
    })

    expect(createResponse.status).toBe(200)
    const createPayload = await createResponse.json()
    expect(createPayload).toMatchObject({
      data: {
        teamId: 'team_1',
        userId: 'requester',
        status: 'pending'
      }
    })

    const cancelResponse = await harness.request(
      `/api/hackathons/hackathon_1/team-join-requests/${createPayload.data.id}/actions/cancel`,
      {
        method: 'POST'
      }
    )

    expect(cancelResponse.status).toBe(200)
    expect(await cancelResponse.json()).toMatchObject({
      data: {
        id: createPayload.data.id,
        status: 'canceled'
      }
    })
  })

  test('team admins can approve join requests, creating membership and an audit entry', async () => {
    const harness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|team_admin',
        email: 'team-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedTeamFormationContext(harness)

    await harness.database.insert(teamJoinRequests).values({
      id: 'request_1',
      teamId: 'team_1',
      userId: 'requester',
      status: 'pending',
      requestedAt: '2026-03-22T12:30:00.000Z',
      createdAt: '2026-03-22T12:30:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/team-join-requests/request_1/actions/approve', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        id: 'request_1',
        status: 'approved',
        reviewedByUserId: 'team_admin'
      }
    })

    const membership = await harness.database.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, 'team_1'),
        eq(teamMembers.userId, 'requester')
      )
    })
    expect(membership).toMatchObject({
      role: 'member',
      leftAt: null
    })

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'team_join_request',
        entityId: 'request_1',
        action: 'team_join_request.approved'
      })
    ]))
  })

  test('team admins can list and reject join requests', async () => {
    const harness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|team_admin',
        email: 'team-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedTeamFormationContext(harness)

    await harness.database.insert(teamJoinRequests).values({
      id: 'request_2',
      teamId: 'team_1',
      userId: 'other_requester',
      status: 'pending',
      requestedAt: '2026-03-22T12:45:00.000Z',
      createdAt: '2026-03-22T12:45:00.000Z'
    })

    const listResponse = await harness.request('/api/hackathons/hackathon_1/teams/team_1/join-requests')
    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toMatchObject({
      meta: {
        total: 1
      },
      data: [
        expect.objectContaining({
          id: 'request_2',
          user: expect.objectContaining({
            id: 'other_requester'
          })
        })
      ]
    })

    const rejectResponse = await harness.request('/api/hackathons/hackathon_1/team-join-requests/request_2/actions/reject', {
      method: 'POST'
    })

    expect(rejectResponse.status).toBe(200)
    expect(await rejectResponse.json()).toMatchObject({
      data: {
        id: 'request_2',
        status: 'rejected',
        reviewedByUserId: 'team_admin'
      }
    })
  })
})
