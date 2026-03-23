import { afterEach, describe, expect, test, vi } from 'vitest'

import { eq } from 'drizzle-orm'

import getSubmissionHandler from '../../../../server/api/hackathons/[hackathonId]/teams/[teamId]/submission/index.get'
import createSubmissionHandler from '../../../../server/api/hackathons/[hackathonId]/teams/[teamId]/submission/index.post'
import patchSubmissionHandler from '../../../../server/api/hackathons/[hackathonId]/teams/[teamId]/submission/index.patch'
import submitSubmissionHandler from '../../../../server/api/hackathons/[hackathonId]/teams/[teamId]/submission/actions/submit.post'
import withdrawSubmissionHandler from '../../../../server/api/hackathons/[hackathonId]/teams/[teamId]/submission/actions/withdraw.post'
import adminWithdrawSubmissionHandler from '../../../../server/api/hackathons/[hackathonId]/teams/[teamId]/submission/actions/admin-withdraw.post'
import disqualifySubmissionHandler from '../../../../server/api/hackathons/[hackathonId]/teams/[teamId]/submission/actions/disqualify.post'
import listNoSubmissionTeamsHandler from '../../../../server/api/hackathons/[hackathonId]/no-submission-teams/index.get'
import {
  auditLogs,
  hackathonRoleAssignments,
  hackathonTermsDocuments,
  hackathons,
  submissions,
  teamMembers,
  teams,
  userApplications,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

function createRoutes() {
  return [
    {
      method: 'get' as const,
      path: '/api/hackathons/:hackathonId/teams/:teamId/submission',
      handler: getSubmissionHandler
    },
    {
      method: 'post' as const,
      path: '/api/hackathons/:hackathonId/teams/:teamId/submission',
      handler: createSubmissionHandler
    },
    {
      method: 'patch' as const,
      path: '/api/hackathons/:hackathonId/teams/:teamId/submission',
      handler: patchSubmissionHandler
    },
    {
      method: 'post' as const,
      path: '/api/hackathons/:hackathonId/teams/:teamId/submission/actions/submit',
      handler: submitSubmissionHandler
    },
    {
      method: 'post' as const,
      path: '/api/hackathons/:hackathonId/teams/:teamId/submission/actions/withdraw',
      handler: withdrawSubmissionHandler
    },
    {
      method: 'post' as const,
      path: '/api/hackathons/:hackathonId/teams/:teamId/submission/actions/admin-withdraw',
      handler: adminWithdrawSubmissionHandler
    },
    {
      method: 'post' as const,
      path: '/api/hackathons/:hackathonId/teams/:teamId/submission/actions/disqualify',
      handler: disqualifySubmissionHandler
    },
    {
      method: 'get' as const,
      path: '/api/hackathons/:hackathonId/no-submission-teams',
      handler: listNoSubmissionTeamsHandler
    }
  ]
}

async function seedSubmissionContext(
  harness: ReturnType<typeof createApiRouteTestHarness>,
  options?: {
    state?: 'submission_open' | 'judging_preparation' | 'judge_review'
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
      displayName: 'Team Admin'
    },
    {
      id: 'team_member',
      auth0Subject: 'auth0|team_member',
      email: 'team-member@example.com',
      displayName: 'Team Member'
    },
    {
      id: 'outsider',
      auth0Subject: 'auth0|outsider',
      email: 'outsider@example.com',
      displayName: 'Outsider'
    },
    {
      id: 'other_team_admin',
      auth0Subject: 'auth0|other_team_admin',
      email: 'other-team-admin@example.com',
      displayName: 'Other Team Admin'
    }
  ])

  await harness.database.insert(hackathons).values({
    id: 'hackathon_1',
    name: 'Submission Hackathon',
    slug: 'submission-hackathon',
    description: 'Submission Hackathon',
    city: 'Vienna',
    address: 'Fixture Address',
    registrationOpensAt: '2026-03-20T12:00:00.000Z',
    registrationClosesAt: '2026-03-23T12:00:00.000Z',
    submissionOpensAt: '2026-03-23T12:00:00.000Z',
    submissionClosesAt: '2026-03-25T12:00:00.000Z',
    state: options?.state ?? 'submission_open',
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
    approvedApplication('application_outsider', 'outsider'),
    approvedApplication('application_other_team_admin', 'other_team_admin')
  ])

  await harness.database.insert(teams).values([
    {
      id: 'team_1',
      hackathonId: 'hackathon_1',
      name: 'Alpha Team',
      slug: 'alpha-team',
      isOpenToJoinRequests: true,
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
      createdByUserId: 'other_team_admin',
      createdAt: '2026-03-22T12:30:00.000Z',
      updatedAt: '2026-03-22T12:30:00.000Z'
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
      id: 'membership_other_admin',
      teamId: 'team_2',
      userId: 'other_team_admin',
      role: 'admin',
      joinedAt: '2026-03-22T12:30:00.000Z',
      createdAt: '2026-03-22T12:30:00.000Z'
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

describe('TASK-3.7 submission routes', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('team admins can create, update, fetch, and submit a submission draft', async () => {
    const harness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|team_admin',
        email: 'team-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedSubmissionContext(harness)

    const createResponse = await harness.request('/api/hackathons/hackathon_1/teams/team_1/submission', {
      method: 'POST',
      body: JSON.stringify({
        projectName: 'Alpha Project'
      })
    })

    expect(createResponse.status).toBe(200)
    expect(await createResponse.json()).toMatchObject({
      data: {
        teamId: 'team_1',
        status: 'draft',
        projectName: 'Alpha Project'
      }
    })

    const patchResponse = await harness.request('/api/hackathons/hackathon_1/teams/team_1/submission', {
      method: 'PATCH',
      body: JSON.stringify({
        summary: 'Refined summary',
        repositoryUrl: 'https://github.com/example/alpha'
      })
    })

    expect(patchResponse.status).toBe(200)
    expect(await patchResponse.json()).toMatchObject({
      data: {
        status: 'draft',
        summary: 'Refined summary',
        repositoryUrl: 'https://github.com/example/alpha'
      }
    })

    const getResponse = await harness.request('/api/hackathons/hackathon_1/teams/team_1/submission')
    expect(getResponse.status).toBe(200)
    expect(await getResponse.json()).toMatchObject({
      data: {
        status: 'draft',
        projectName: 'Alpha Project',
        summary: 'Refined summary'
      }
    })

    const submitResponse = await harness.request('/api/hackathons/hackathon_1/teams/team_1/submission/actions/submit', {
      method: 'POST'
    })

    expect(submitResponse.status).toBe(200)
    expect(await submitResponse.json()).toMatchObject({
      data: {
        status: 'submitted'
      }
    })

    const storedSubmission = await harness.database.query.submissions.findFirst({
      where: eq(submissions.teamId, 'team_1')
    })

    expect(storedSubmission).toMatchObject({
      status: 'submitted',
      projectName: 'Alpha Project'
    })
  })

  test('submission visibility is limited to team members and hackathon admins', async () => {
    const memberHarness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|team_member',
        email: 'team-member@example.com'
      }
    })
    harnesses.push(memberHarness)
    await seedSubmissionContext(memberHarness)
    await memberHarness.database.insert(submissions).values({
      id: 'submission_1',
      teamId: 'team_1',
      status: 'submitted',
      projectName: 'Visible Project',
      summary: 'Visible Summary',
      repositoryUrl: null,
      demoUrl: null,
      submittedAt: '2026-03-24T12:00:00.000Z',
      lockedAt: null,
      withdrawnAt: null,
      disqualifiedAt: null,
      createdAt: '2026-03-24T12:00:00.000Z',
      updatedAt: '2026-03-24T12:00:00.000Z'
    })

    const memberResponse = await memberHarness.request('/api/hackathons/hackathon_1/teams/team_1/submission')
    expect(memberResponse.status).toBe(200)
    expect(await memberResponse.json()).toMatchObject({
      data: {
        status: 'submitted'
      }
    })

    const outsiderHarness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|outsider',
        email: 'outsider@example.com'
      }
    })
    harnesses.push(outsiderHarness)
    await seedSubmissionContext(outsiderHarness)
    await outsiderHarness.database.insert(submissions).values({
      id: 'submission_1',
      teamId: 'team_1',
      status: 'submitted',
      projectName: 'Visible Project',
      summary: 'Visible Summary',
      repositoryUrl: null,
      demoUrl: null,
      submittedAt: '2026-03-24T12:00:00.000Z',
      lockedAt: null,
      withdrawnAt: null,
      disqualifiedAt: null,
      createdAt: '2026-03-24T12:00:00.000Z',
      updatedAt: '2026-03-24T12:00:00.000Z'
    })

    const outsiderResponse = await outsiderHarness.request('/api/hackathons/hackathon_1/teams/team_1/submission')
    expect(outsiderResponse.status).toBe(403)
    expect(await outsiderResponse.json()).toMatchObject({
      error: {
        code: 'team_submission_access_denied'
      }
    })
  })

  test('team-admin withdrawal writes an audit record', async () => {
    const harness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|team_admin',
        email: 'team-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedSubmissionContext(harness)

    await harness.database.insert(submissions).values({
      id: 'submission_1',
      teamId: 'team_1',
      status: 'submitted',
      projectName: 'Alpha Project',
      summary: 'Summary',
      repositoryUrl: null,
      demoUrl: null,
      submittedAt: '2026-03-24T12:00:00.000Z',
      lockedAt: null,
      withdrawnAt: null,
      disqualifiedAt: null,
      createdAt: '2026-03-24T12:00:00.000Z',
      updatedAt: '2026-03-24T12:00:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/teams/team_1/submission/actions/withdraw', {
      method: 'POST'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        status: 'withdrawn'
      }
    })

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'submission',
        entityId: 'submission_1',
        action: 'submission.withdrawn'
      })
    ]))
  })

  test('hackathon admins can admin-withdraw only with an active team-admin request', async () => {
    const harness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedSubmissionContext(harness)

    await harness.database.insert(submissions).values({
      id: 'submission_1',
      teamId: 'team_1',
      status: 'submitted',
      projectName: 'Alpha Project',
      summary: 'Summary',
      repositoryUrl: null,
      demoUrl: null,
      submittedAt: '2026-03-24T12:00:00.000Z',
      lockedAt: null,
      withdrawnAt: null,
      disqualifiedAt: null,
      createdAt: '2026-03-24T12:00:00.000Z',
      updatedAt: '2026-03-24T12:00:00.000Z'
    })

    const invalidResponse = await harness.request('/api/hackathons/hackathon_1/teams/team_1/submission/actions/admin-withdraw', {
      method: 'POST',
      body: JSON.stringify({
        requestedByUserId: 'team_member'
      })
    })

    expect(invalidResponse.status).toBe(409)
    expect(await invalidResponse.json()).toMatchObject({
      error: {
        code: 'team_request_required'
      }
    })

    const validResponse = await harness.request('/api/hackathons/hackathon_1/teams/team_1/submission/actions/admin-withdraw', {
      method: 'POST',
      body: JSON.stringify({
        requestedByUserId: 'team_admin',
        reason: 'Requested by team'
      })
    })

    expect(validResponse.status).toBe(200)
    expect(await validResponse.json()).toMatchObject({
      data: {
        status: 'withdrawn'
      }
    })

    const auditRows = await harness.database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'submission',
        entityId: 'submission_1',
        action: 'submission.admin_withdrawn'
      })
    ]))
  })

  test('hackathon admins can disqualify locked submissions during judge review', async () => {
    const harness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedSubmissionContext(harness, {
      state: 'judge_review'
    })

    await harness.database.insert(submissions).values({
      id: 'submission_1',
      teamId: 'team_1',
      status: 'locked',
      projectName: 'Alpha Project',
      summary: 'Summary',
      repositoryUrl: null,
      demoUrl: null,
      submittedAt: '2026-03-24T12:00:00.000Z',
      lockedAt: '2026-03-25T12:00:00.000Z',
      withdrawnAt: null,
      disqualifiedAt: null,
      createdAt: '2026-03-24T12:00:00.000Z',
      updatedAt: '2026-03-25T12:00:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/teams/team_1/submission/actions/disqualify', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Competition removal'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        status: 'disqualified'
      }
    })

    const storedSubmission = await harness.database.query.submissions.findFirst({
      where: eq(submissions.id, 'submission_1')
    })

    expect(storedSubmission?.status).toBe('disqualified')
  })

  test('draft submissions cannot be disqualified and remain part of the no-submission model', async () => {
    const harness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedSubmissionContext(harness, {
      state: 'judge_review'
    })

    await harness.database.insert(submissions).values({
      id: 'submission_1',
      teamId: 'team_1',
      status: 'draft',
      projectName: 'Alpha Draft',
      summary: 'Draft summary',
      repositoryUrl: null,
      demoUrl: null,
      submittedAt: null,
      lockedAt: null,
      withdrawnAt: null,
      disqualifiedAt: null,
      createdAt: '2026-03-24T12:00:00.000Z',
      updatedAt: '2026-03-24T12:00:00.000Z'
    })

    const response = await harness.request('/api/hackathons/hackathon_1/teams/team_1/submission/actions/disqualify', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Should fail'
      })
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'submission_state_invalid'
      }
    })
  })

  test('no-submission teams include draft and withdrawn teams but exclude submitted teams', async () => {
    const harness = createApiRouteTestHarness({
      routes: createRoutes(),
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedSubmissionContext(harness)

    await harness.database.insert(submissions).values([
      {
        id: 'submission_draft',
        teamId: 'team_1',
        status: 'draft',
        projectName: 'Alpha Draft',
        summary: 'Draft summary',
        repositoryUrl: null,
        demoUrl: null,
        submittedAt: null,
        lockedAt: null,
        withdrawnAt: null,
        disqualifiedAt: null,
        createdAt: '2026-03-24T12:00:00.000Z',
        updatedAt: '2026-03-24T12:00:00.000Z'
      },
      {
        id: 'submission_submitted',
        teamId: 'team_2',
        status: 'submitted',
        projectName: 'Beta Submitted',
        summary: 'Submitted summary',
        repositoryUrl: null,
        demoUrl: null,
        submittedAt: '2026-03-24T13:00:00.000Z',
        lockedAt: null,
        withdrawnAt: null,
        disqualifiedAt: null,
        createdAt: '2026-03-24T13:00:00.000Z',
        updatedAt: '2026-03-24T13:00:00.000Z'
      }
    ])

    const response = await harness.request('/api/hackathons/hackathon_1/no-submission-teams')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: [
        {
          team: {
            id: 'team_1'
          },
          submission: {
            status: 'draft'
          }
        }
      ]
    })
  })
})
