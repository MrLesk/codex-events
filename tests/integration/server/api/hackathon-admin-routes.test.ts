import { afterEach, describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

import roleListHandler from '../../../../server/api/hackathons/[hackathonId]/roles/index.get'
import roleCandidatesListHandler from '../../../../server/api/hackathons/[hackathonId]/roles/candidates/index.get'
import rolePutHandler from '../../../../server/api/hackathons/[hackathonId]/roles/[userId].put'
import rolePatchHandler from '../../../../server/api/hackathons/[hackathonId]/roles/[userId].patch'
import roleDeleteHandler from '../../../../server/api/hackathons/[hackathonId]/roles/[userId].delete'
import currentTermsHandler from '../../../../server/api/hackathons/[hackathonId]/terms/current.get'
import termsVersionsGetHandler from '../../../../server/api/hackathons/[hackathonId]/terms/[documentType]/versions.get'
import termsVersionsPostHandler from '../../../../server/api/hackathons/[hackathonId]/terms/[documentType]/versions.post'
import setCurrentTermsHandler from '../../../../server/api/hackathons/[hackathonId]/terms/[documentType]/actions/set-current.post'
import criteriaListHandler from '../../../../server/api/hackathons/[hackathonId]/evaluation-criteria/index.get'
import criteriaPostHandler from '../../../../server/api/hackathons/[hackathonId]/evaluation-criteria/index.post'
import criteriaPatchHandler from '../../../../server/api/hackathons/[hackathonId]/evaluation-criteria/[criterionId].patch'
import prizesListHandler from '../../../../server/api/hackathons/[hackathonId]/prizes/index.get'
import prizesPostHandler from '../../../../server/api/hackathons/[hackathonId]/prizes/index.post'
import prizesPatchHandler from '../../../../server/api/hackathons/[hackathonId]/prizes/[prizeId].patch'
import prizesDeleteHandler from '../../../../server/api/hackathons/[hackathonId]/prizes/[prizeId].delete'
import {
  auditLogs,
  evaluationCriteria,
  hackathonRoleAssignments,
  hackathonTermsDocuments,
  hackathons,
  prizes,
  users
} from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

async function seedHackathonContext(
  harness: ReturnType<typeof createApiRouteTestHarness>,
  options?: {
    includeHackathonAdminAssignment?: boolean
    state?: typeof hackathons.$inferInsert.state
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
      id: 'judge_user',
      auth0Subject: 'auth0|judge',
      email: 'judge@example.com',
      displayName: 'Judge User'
    },
    {
      id: 'staff_user',
      auth0Subject: 'auth0|staff',
      email: 'staff@example.com',
      displayName: 'Staff User'
    },
    {
      id: 'regular_user',
      auth0Subject: 'auth0|regular_user',
      email: 'regular@example.com',
      displayName: 'Regular User'
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
    maxTeamMembers: 5,
    currentApplicationTermsDocumentId: null,
    currentWinnerTermsDocumentId: null,
    createdByUserId: 'platform_admin'
  })

  if (options?.includeHackathonAdminAssignment !== false) {
    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'role_hackathon_admin',
      hackathonId: 'hackathon_1',
      userId: 'hackathon_admin',
      role: 'hackathon_admin',
      isInJudgePool: false,
      createdAt: '2026-03-22T12:00:00.000Z'
    })
  }
}

describe('TASK-3.5 hackathon admin route groups', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('role management supports list, create, update, delete, and judge-pool guards', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/roles', handler: roleListHandler },
        { method: 'get', path: '/api/hackathons/:hackathonId/roles/candidates', handler: roleCandidatesListHandler },
        { method: 'put', path: '/api/hackathons/:hackathonId/roles/:userId', handler: rolePutHandler },
        { method: 'patch', path: '/api/hackathons/:hackathonId/roles/:userId', handler: rolePatchHandler },
        { method: 'delete', path: '/api/hackathons/:hackathonId/roles/:userId', handler: roleDeleteHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedHackathonContext(harness)

    const listResponse = await harness.request('/api/hackathons/hackathon_1/roles')
    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          userId: 'hackathon_admin',
          role: 'hackathon_admin'
        })
      ],
      meta: {
        total: 1
      }
    })

    const candidatePageOneResponse = await harness.request(
      '/api/hackathons/hackathon_1/roles/candidates?search=admin&page=1&page_size=1'
    )
    expect(candidatePageOneResponse.status).toBe(200)
    expect(await candidatePageOneResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'platform_admin',
          isPlatformAdmin: true
        })
      ],
      meta: {
        page: 1,
        pageSize: 1,
        total: 2
      }
    })

    const candidatePageTwoResponse = await harness.request(
      '/api/hackathons/hackathon_1/roles/candidates?search=admin&page=2&page_size=1'
    )
    expect(candidatePageTwoResponse.status).toBe(200)
    expect(await candidatePageTwoResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'hackathon_admin',
          isPlatformAdmin: false
        })
      ],
      meta: {
        page: 2,
        pageSize: 1,
        total: 2
      }
    })

    const candidateByIdResponse = await harness.request(
      '/api/hackathons/hackathon_1/roles/candidates?search=regular_user&page=1&page_size=10'
    )
    expect(candidateByIdResponse.status).toBe(200)
    expect(await candidateByIdResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'regular_user'
        })
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1
      }
    })

    const createResponse = await harness.request('/api/hackathons/hackathon_1/roles/judge_user', {
      method: 'PUT',
      body: JSON.stringify({
        role: 'judge',
        isInJudgePool: true,
        isStaff: false
      })
    })
    expect(createResponse.status).toBe(200)
    expect(await createResponse.json()).toMatchObject({
      data: {
        userId: 'judge_user',
        role: 'judge',
        isInJudgePool: true,
        isStaff: false
      }
    })

    const createStaffResponse = await harness.request('/api/hackathons/hackathon_1/roles/staff_user', {
      method: 'PUT',
      body: JSON.stringify({
        role: 'staff',
        isInJudgePool: false,
        isStaff: true
      })
    })
    expect(createStaffResponse.status).toBe(200)
    expect(await createStaffResponse.json()).toMatchObject({
      data: {
        userId: 'staff_user',
        role: 'staff',
        isInJudgePool: false,
        isStaff: true
      }
    })

    const createAdminResponse = await harness.request('/api/hackathons/hackathon_1/roles/regular_user', {
      method: 'PUT',
      body: JSON.stringify({
        role: 'hackathon_admin',
        isInJudgePool: false,
        isStaff: false
      })
    })
    expect(createAdminResponse.status).toBe(200)
    expect(await createAdminResponse.json()).toMatchObject({
      data: {
        userId: 'regular_user',
        role: 'hackathon_admin',
        isInJudgePool: false,
        isStaff: false
      }
    })

    const invalidPatchResponse = await harness.request('/api/hackathons/hackathon_1/roles/judge_user', {
      method: 'PATCH',
      body: JSON.stringify({
        isInJudgePool: false
      })
    })
    expect(invalidPatchResponse.status).toBe(409)
    expect(await invalidPatchResponse.json()).toMatchObject({
      error: {
        code: 'judge_role_flags_invalid'
      }
    })

    const adminCapabilityPatchResponse = await harness.request('/api/hackathons/hackathon_1/roles/hackathon_admin', {
      method: 'PATCH',
      body: JSON.stringify({
        isInJudgePool: true,
        isStaff: true
      })
    })
    expect(adminCapabilityPatchResponse.status).toBe(200)
    expect(await adminCapabilityPatchResponse.json()).toMatchObject({
      data: {
        userId: 'hackathon_admin',
        role: 'hackathon_admin',
        isInJudgePool: true,
        isStaff: true
      }
    })

    const deleteResponse = await harness.request('/api/hackathons/hackathon_1/roles/judge_user', {
      method: 'DELETE'
    })
    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toMatchObject({
      data: {
        userId: 'judge_user',
        deleted: true
      }
    })
  })

  test('hackathon admin can create and remove role assignments for the same hackathon', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'put', path: '/api/hackathons/:hackathonId/roles/:userId', handler: rolePutHandler },
        { method: 'delete', path: '/api/hackathons/:hackathonId/roles/:userId', handler: roleDeleteHandler }
      ],
      sessionUser: {
        sub: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedHackathonContext(harness)

    const createJudgeResponse = await harness.request('/api/hackathons/hackathon_1/roles/judge_user', {
      method: 'PUT',
      body: JSON.stringify({
        role: 'judge',
        isInJudgePool: true,
        isStaff: false
      })
    })
    expect(createJudgeResponse.status).toBe(200)
    expect(await createJudgeResponse.json()).toMatchObject({
      data: {
        userId: 'judge_user',
        role: 'judge'
      }
    })

    const removeJudgeResponse = await harness.request('/api/hackathons/hackathon_1/roles/judge_user', {
      method: 'DELETE'
    })
    expect(removeJudgeResponse.status).toBe(200)
    expect(await removeJudgeResponse.json()).toMatchObject({
      data: {
        userId: 'judge_user',
        deleted: true
      }
    })
  })

  test('candidate search still works when the hackathon has no current hackathon-admin assignments', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/roles/candidates', handler: roleCandidatesListHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedHackathonContext(harness, {
      includeHackathonAdminAssignment: false
    })

    const candidateResponse = await harness.request('/api/hackathons/hackathon_1/roles/candidates?page=1&page_size=10')
    expect(candidateResponse.status).toBe(200)
    const candidatePayload = await candidateResponse.json()
    expect(candidatePayload).toMatchObject({
      meta: {
        page: 1,
        pageSize: 10,
        total: 5
      }
    })
    expect(candidatePayload.data[0]).toMatchObject({
      id: 'platform_admin',
      isPlatformAdmin: true
    })
    expect(candidatePayload.data[1]).toMatchObject({
      id: 'hackathon_admin',
      isPlatformAdmin: false
    })
  })

  test('terms routes expose current terms and allow admin versioning plus current-reference updates', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/terms/current', handler: currentTermsHandler },
        { method: 'get', path: '/api/hackathons/:hackathonId/terms/:documentType/versions', handler: termsVersionsGetHandler },
        { method: 'post', path: '/api/hackathons/:hackathonId/terms/:documentType/versions', handler: termsVersionsPostHandler },
        { method: 'post', path: '/api/hackathons/:hackathonId/terms/:documentType/actions/set-current', handler: setCurrentTermsHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedHackathonContext(harness)

    await harness.database.insert(hackathonTermsDocuments).values([
      {
        id: 'terms_app_1',
        hackathonId: 'hackathon_1',
        documentType: 'application_terms',
        version: 1,
        title: 'Application Terms v1',
        content: 'Application terms',
        publishedAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'terms_win_1',
        hackathonId: 'hackathon_1',
        documentType: 'winner_terms',
        version: 1,
        title: 'Winner Terms v1',
        content: 'Winner terms',
        publishedAt: '2026-03-02T00:00:00.000Z'
      }
    ])

    await harness.database
      .update(hackathons)
      .set({
        currentApplicationTermsDocumentId: 'terms_app_1',
        currentWinnerTermsDocumentId: 'terms_win_1'
      })
      .where(eq(hackathons.id, 'hackathon_1'))

    const currentResponse = await harness.request('/api/hackathons/hackathon_1/terms/current')
    expect(currentResponse.status).toBe(200)
    expect(await currentResponse.json()).toMatchObject({
      data: {
        application_terms: {
          id: 'terms_app_1'
        },
        winner_terms: {
          id: 'terms_win_1'
        }
      }
    })

    const createVersionResponse = await harness.request('/api/hackathons/hackathon_1/terms/application_terms/versions', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Application Terms v2',
        content: 'Application terms v2'
      })
    })
    expect(createVersionResponse.status).toBe(200)
    const createVersionPayload = await createVersionResponse.json()
    expect(createVersionPayload).toMatchObject({
      data: {
        documentType: 'application_terms',
        version: 2
      }
    })

    const hackathonAfterCreate = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_1')
    })
    expect(hackathonAfterCreate).toMatchObject({
      currentApplicationTermsDocumentId: 'terms_app_1',
      currentWinnerTermsDocumentId: 'terms_win_1'
    })

    const setCurrentResponse = await harness.request('/api/hackathons/hackathon_1/terms/application_terms/actions/set-current', {
      method: 'POST',
      body: JSON.stringify({
        hackathonTermsDocumentId: createVersionPayload.data.id
      })
    })
    expect(setCurrentResponse.status).toBe(200)
    expect(await setCurrentResponse.json()).toMatchObject({
      data: {
        currentApplicationTermsDocumentId: createVersionPayload.data.id
      }
    })
  })

  test('creating the first terms version for each document type auto-selects it as current', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/terms/current', handler: currentTermsHandler },
        { method: 'post', path: '/api/hackathons/:hackathonId/terms/:documentType/versions', handler: termsVersionsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedHackathonContext(harness)

    const createApplicationTermsResponse = await harness.request('/api/hackathons/hackathon_1/terms/application_terms/versions', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Application Terms v1',
        content: 'Application terms v1'
      })
    })
    expect(createApplicationTermsResponse.status).toBe(200)
    const applicationTermsPayload = await createApplicationTermsResponse.json()
    expect(applicationTermsPayload).toMatchObject({
      data: {
        documentType: 'application_terms',
        version: 1
      }
    })

    const hackathonAfterApplicationTerms = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_1')
    })
    expect(hackathonAfterApplicationTerms).toMatchObject({
      currentApplicationTermsDocumentId: applicationTermsPayload.data.id,
      currentWinnerTermsDocumentId: null
    })

    const createWinnerTermsResponse = await harness.request('/api/hackathons/hackathon_1/terms/winner_terms/versions', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Winner Terms v1',
        content: 'Winner terms v1'
      })
    })
    expect(createWinnerTermsResponse.status).toBe(200)
    const winnerTermsPayload = await createWinnerTermsResponse.json()
    expect(winnerTermsPayload).toMatchObject({
      data: {
        documentType: 'winner_terms',
        version: 1
      }
    })

    const currentTermsResponse = await harness.request('/api/hackathons/hackathon_1/terms/current')
    expect(currentTermsResponse.status).toBe(200)
    expect(await currentTermsResponse.json()).toMatchObject({
      data: {
        application_terms: {
          id: applicationTermsPayload.data.id
        },
        winner_terms: {
          id: winnerTermsPayload.data.id
        }
      }
    })
  })

  test('creating a later terms version does not auto-select it when earlier versions exist without a current reference', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/terms/current', handler: currentTermsHandler },
        { method: 'post', path: '/api/hackathons/:hackathonId/terms/:documentType/versions', handler: termsVersionsPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedHackathonContext(harness)

    await harness.database.insert(hackathonTermsDocuments).values({
      id: 'terms_app_1',
      hackathonId: 'hackathon_1',
      documentType: 'application_terms',
      version: 1,
      title: 'Application Terms v1',
      content: 'Application terms v1',
      publishedAt: '2026-03-01T00:00:00.000Z'
    })

    const createVersionResponse = await harness.request('/api/hackathons/hackathon_1/terms/application_terms/versions', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Application Terms v2',
        content: 'Application terms v2'
      })
    })
    expect(createVersionResponse.status).toBe(200)
    expect(await createVersionResponse.json()).toMatchObject({
      data: {
        documentType: 'application_terms',
        version: 2
      }
    })

    const hackathonAfterCreate = await harness.database.query.hackathons.findFirst({
      where: eq(hackathons.id, 'hackathon_1')
    })
    expect(hackathonAfterCreate).toMatchObject({
      currentApplicationTermsDocumentId: null,
      currentWinnerTermsDocumentId: null
    })

    const currentTermsResponse = await harness.request('/api/hackathons/hackathon_1/terms/current')
    expect(currentTermsResponse.status).toBe(200)
    expect(await currentTermsResponse.json()).toMatchObject({
      data: {
        application_terms: null,
        winner_terms: null
      }
    })
  })

  test('evaluation criteria routes support public reads and admin create/update', async () => {
    const publicHarness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/evaluation-criteria', handler: criteriaListHandler }
      ]
    })
    harnesses.push(publicHarness)
    await seedHackathonContext(publicHarness)

    await publicHarness.database.insert(evaluationCriteria).values({
      id: 'criterion_1',
      hackathonId: 'hackathon_1',
      name: 'Impact',
      description: 'Measures impact',
      weight: 40,
      displayOrder: 1,
      createdAt: '2026-03-22T12:00:00.000Z'
    })

    const listResponse = await publicHarness.request('/api/hackathons/hackathon_1/evaluation-criteria')
    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'criterion_1',
          name: 'Impact'
        })
      ]
    })

    const adminHarness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/hackathons/:hackathonId/evaluation-criteria', handler: criteriaPostHandler },
        { method: 'patch', path: '/api/hackathons/:hackathonId/evaluation-criteria/:criterionId', handler: criteriaPatchHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(adminHarness)
    await seedHackathonContext(adminHarness)

    const createResponse = await adminHarness.request('/api/hackathons/hackathon_1/evaluation-criteria', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Execution',
        description: 'Measures execution',
        weight: 30,
        displayOrder: 2
      })
    })
    expect(createResponse.status).toBe(200)
    const createPayload = await createResponse.json()

    const updateResponse = await adminHarness.request(`/api/hackathons/hackathon_1/evaluation-criteria/${createPayload.data.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        weight: 35
      })
    })
    expect(updateResponse.status).toBe(200)
    expect(await updateResponse.json()).toMatchObject({
      data: {
        id: createPayload.data.id,
        weight: 35
      }
    })
  })

  test('prize routes support public reads and admin create/update/delete', async () => {
    const publicHarness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/hackathons/:hackathonId/prizes', handler: prizesListHandler }
      ]
    })
    harnesses.push(publicHarness)
    await seedHackathonContext(publicHarness)

    await publicHarness.database.insert(prizes).values([
      {
        id: 'prize_1',
        hackathonId: 'hackathon_1',
        name: 'First Prize',
        description: 'Main prize',
        rewardType: 'api_credits',
        rewardValue: '5000',
        rewardCurrency: 'USD',
        awardScope: 'team',
        rankStart: 1,
        rankEnd: 1,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'prize_2',
        hackathonId: 'hackathon_1',
        name: 'Top 3 Bonus',
        description: 'Bonus for finalists',
        rewardType: 'other',
        rewardValue: 'Mentorship',
        rewardCurrency: null,
        awardScope: 'team',
        rankStart: 1,
        rankEnd: 3,
        createdAt: '2026-03-22T12:01:00.000Z'
      },
      {
        id: 'prize_3',
        hackathonId: 'hackathon_1',
        name: 'Second Prize',
        description: 'Runner-up prize',
        rewardType: 'api_credits',
        rewardValue: '3000',
        rewardCurrency: 'USD',
        awardScope: 'team',
        rankStart: 2,
        rankEnd: 2,
        createdAt: '2026-03-22T12:00:00.000Z'
      },
      {
        id: 'prize_4',
        hackathonId: 'hackathon_1',
        name: 'Third Prize',
        description: 'Third-place prize',
        rewardType: 'api_credits',
        rewardValue: '1500',
        rewardCurrency: 'USD',
        awardScope: 'team',
        rankStart: 3,
        rankEnd: 3,
        createdAt: '2026-03-22T12:00:00.000Z'
      }
    ])

    const listResponse = await publicHarness.request('/api/hackathons/hackathon_1/prizes')
    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toMatchObject({
      data: [
        expect.objectContaining({
          id: 'prize_1',
          name: 'First Prize'
        }),
        expect.objectContaining({
          id: 'prize_3',
          name: 'Second Prize'
        }),
        expect.objectContaining({
          id: 'prize_4',
          name: 'Third Prize'
        }),
        expect.objectContaining({
          id: 'prize_2',
          name: 'Top 3 Bonus'
        })
      ]
    })

    const adminHarness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/hackathons/:hackathonId/prizes', handler: prizesPostHandler },
        { method: 'patch', path: '/api/hackathons/:hackathonId/prizes/:prizeId', handler: prizesPatchHandler },
        { method: 'delete', path: '/api/hackathons/:hackathonId/prizes/:prizeId', handler: prizesDeleteHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(adminHarness)
    await seedHackathonContext(adminHarness)

    const createResponse = await adminHarness.request('/api/hackathons/hackathon_1/prizes', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Runner Up',
        description: 'Runner up prize',
        rewardType: 'subscription',
        rewardValue: '12 months',
        rewardCurrency: null,
        awardScope: 'member',
        rankStart: 2,
        rankEnd: 3
      })
    })
    expect(createResponse.status).toBe(200)
    const createPayload = await createResponse.json()

    const updateResponse = await adminHarness.request(`/api/hackathons/hackathon_1/prizes/${createPayload.data.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        rewardValue: '18 months'
      })
    })
    expect(updateResponse.status).toBe(200)
    expect(await updateResponse.json()).toMatchObject({
      data: {
        id: createPayload.data.id,
        rewardValue: '18 months'
      }
    })

    const deleteResponse = await adminHarness.request(`/api/hackathons/hackathon_1/prizes/${createPayload.data.id}`, {
      method: 'DELETE'
    })
    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toMatchObject({
      data: {
        id: createPayload.data.id,
        name: 'Runner Up'
      }
    })
  })

  test('admin-visible routes write audit records for administrative writes', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/hackathons/:hackathonId/evaluation-criteria', handler: criteriaPostHandler },
        { method: 'post', path: '/api/hackathons/:hackathonId/prizes', handler: prizesPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      }
    })
    harnesses.push(harness)
    await seedHackathonContext(harness)

    await harness.request('/api/hackathons/hackathon_1/evaluation-criteria', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Novelty',
        description: 'Measures novelty',
        weight: 20,
        displayOrder: 1
      })
    })
    await harness.request('/api/hackathons/hackathon_1/prizes', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Main Prize',
        description: 'Main prize',
        rewardType: 'api_credits',
        rewardValue: '5000',
        rewardCurrency: 'USD',
        awardScope: 'team',
        rankStart: 1,
        rankEnd: 1
      })
    })

    const auditEntries = await harness.database.select().from(auditLogs)
    expect(auditEntries).toEqual([
      expect.objectContaining({ action: 'evaluation_criterion.created' }),
      expect.objectContaining({ action: 'prize.created' })
    ])
  })
})
