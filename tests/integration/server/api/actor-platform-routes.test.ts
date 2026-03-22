import { afterEach, describe, expect, test, vi } from 'vitest'

import { eq } from 'drizzle-orm'

import accountDeleteHandler from '../../../../server/api/account.delete'
import sessionHandler from '../../../../server/api/session.get'
import platformDocumentAcceptancePostHandler from '../../../../server/api/platform-document-acceptances.post'
import platformDocumentCurrentGetHandler from '../../../../server/api/platform-documents/current.get'
import platformDocumentVersionsGetHandler from '../../../../server/api/platform-documents/[documentType]/versions.get'
import {
  auditLogs,
  hackathons,
  hackathonRoleAssignments,
  platformDocuments,
  userPlatformDocumentAcceptances,
  users
} from '../../../../server/database/schema'
import { fixtureTimestamp } from '../../../support/backend/runtime'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('TASK-3.5 actor-facing API routes', () => {
  const databases: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(() => {
    vi.unstubAllGlobals()

    while (databases.length > 0) {
      databases.pop()?.d1Database.close()
    }
  })

  test('GET /api/session returns authenticated actor context and hackathon roles', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/session', handler: sessionHandler }
      ],
      sessionUser: {
        sub: 'auth0|judge',
        email: 'judge@example.com',
        name: 'Judge Persona'
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'user_judge',
      auth0Subject: 'auth0|judge',
      email: 'judge@example.com',
      displayName: 'Judge Persona'
    })
    await harness.database.insert(hackathons).values({
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon',
      description: 'Fixture hackathon',
      city: 'Vienna',
      address: 'Fixture Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      createdByUserId: 'user_judge'
    })

    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'role_1',
      hackathonId: 'hackathon_1',
      userId: 'user_judge',
      role: 'judge',
      isInJudgePool: true,
      createdAt: fixtureTimestamp()
    })

    const response = await harness.request('/api/session')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        actor: {
          kind: 'platform_user',
          hasPlatformAccount: true,
          isPlatformAdmin: false,
          platformUser: {
            id: 'user_judge',
            email: 'judge@example.com'
          },
          hackathonRoles: [
            {
              hackathonId: 'hackathon_1',
              role: 'judge',
              isInJudgePool: true
            }
          ]
        }
      }
    })
  })

  test('GET /api/platform-documents/current returns current documents publicly', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/platform-documents/current', handler: platformDocumentCurrentGetHandler }
      ]
    })
    databases.push(harness)

    await harness.database.insert(platformDocuments).values([
      {
        id: 'privacy_v1',
        documentType: 'privacy_policy',
        version: 1,
        title: 'Privacy Policy v1',
        content: 'Old privacy',
        publishedAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'privacy_v2',
        documentType: 'privacy_policy',
        version: 2,
        title: 'Privacy Policy v2',
        content: 'Current privacy',
        publishedAt: '2026-03-02T00:00:00.000Z'
      },
      {
        id: 'terms_v1',
        documentType: 'platform_terms',
        version: 1,
        title: 'Platform Terms v1',
        content: 'Current terms',
        publishedAt: '2026-03-03T00:00:00.000Z'
      }
    ])

    const response = await harness.request('/api/platform-documents/current')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        privacy_policy: {
          id: 'privacy_v2',
          version: 2
        },
        platform_terms: {
          id: 'terms_v1',
          version: 1
        }
      }
    })
  })

  test('GET /api/platform-documents/:documentType/versions requires auth and lists versions descending', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        {
          method: 'get',
          path: '/api/platform-documents/:documentType/versions',
          handler: platformDocumentVersionsGetHandler
        }
      ],
      sessionUser: {
        sub: 'auth0|reader',
        email: 'reader@example.com'
      }
    })
    databases.push(harness)

    await harness.database.insert(platformDocuments).values([
      {
        id: 'privacy_v1',
        documentType: 'privacy_policy',
        version: 1,
        title: 'Privacy Policy v1',
        content: 'One',
        publishedAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'privacy_v2',
        documentType: 'privacy_policy',
        version: 2,
        title: 'Privacy Policy v2',
        content: 'Two',
        publishedAt: '2026-03-02T00:00:00.000Z'
      }
    ])

    const response = await harness.request('/api/platform-documents/privacy_policy/versions')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: [
        { id: 'privacy_v2', version: 2 },
        { id: 'privacy_v1', version: 1 }
      ],
      meta: {
        total: 2
      }
    })
  })

  test('POST /api/platform-document-acceptances records only the current exact document version', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/platform-document-acceptances', handler: platformDocumentAcceptancePostHandler }
      ],
      sessionUser: {
        sub: 'auth0|user',
        email: 'user@example.com'
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'user_1',
      auth0Subject: 'auth0|user',
      email: 'user@example.com',
      displayName: 'Regular User'
    })

    await harness.database.insert(platformDocuments).values([
      {
        id: 'privacy_v1',
        documentType: 'privacy_policy',
        version: 1,
        title: 'Privacy Policy v1',
        content: 'Old privacy',
        publishedAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'privacy_v2',
        documentType: 'privacy_policy',
        version: 2,
        title: 'Privacy Policy v2',
        content: 'Current privacy',
        publishedAt: '2026-03-02T00:00:00.000Z'
      }
    ])

    const outdatedResponse = await harness.request('/api/platform-document-acceptances', {
      method: 'POST',
      body: JSON.stringify({
        platformDocumentId: 'privacy_v1'
      })
    })

    expect(outdatedResponse.status).toBe(409)
    expect(await outdatedResponse.json()).toMatchObject({
      error: {
        code: 'platform_document_outdated'
      }
    })

    const successResponse = await harness.request('/api/platform-document-acceptances', {
      method: 'POST',
      body: JSON.stringify({
        platformDocumentId: 'privacy_v2'
      })
    })

    expect(successResponse.status).toBe(200)
    expect(await successResponse.json()).toMatchObject({
      data: {
        acceptance: {
          userId: 'user_1',
          platformDocumentId: 'privacy_v2'
        },
        document: {
          id: 'privacy_v2',
          version: 2
        }
      }
    })

    const storedAcceptances = await harness.database.select().from(userPlatformDocumentAcceptances)
    expect(storedAcceptances).toHaveLength(1)
  })

  test('DELETE /api/account soft-deletes the user and writes an audit record', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'delete', path: '/api/account', handler: accountDeleteHandler }
      ],
      sessionUser: {
        sub: 'auth0|delete-me',
        email: 'delete-me@example.com'
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'user_delete',
      auth0Subject: 'auth0|delete-me',
      email: 'delete-me@example.com',
      displayName: 'Delete Me',
      isPlatformAdmin: true
    })
    await harness.database.insert(hackathons).values({
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon-delete',
      description: 'Fixture hackathon',
      city: 'Vienna',
      address: 'Fixture Address',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      submissionOpensAt: '2026-03-23T12:00:00.000Z',
      submissionClosesAt: '2026-03-25T12:00:00.000Z',
      state: 'registration_open',
      maxTeamMembers: 5,
      createdByUserId: 'user_delete'
    })
    await harness.database.insert(platformDocuments).values({
      id: 'terms_v1',
      documentType: 'platform_terms',
      version: 1,
      title: 'Platform Terms v1',
      content: 'Terms',
      publishedAt: '2026-03-03T00:00:00.000Z'
    })
    await harness.database.insert(userPlatformDocumentAcceptances).values({
      id: 'acceptance_1',
      userId: 'user_delete',
      platformDocumentId: 'terms_v1',
      acceptedAt: fixtureTimestamp()
    })
    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'role_delete',
      hackathonId: 'hackathon_1',
      userId: 'user_delete',
      role: 'hackathon_admin',
      isInJudgePool: false,
      createdAt: fixtureTimestamp()
    })

    const response = await harness.request('/api/account', {
      method: 'DELETE'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        userId: 'user_delete'
      }
    })

    const deletedUser = await harness.database.query.users.findFirst({
      where: eq(users.id, 'user_delete')
    })
    const deletedAcceptances = await harness.database.select().from(userPlatformDocumentAcceptances)
    const deletedAssignments = await harness.database.select().from(hackathonRoleAssignments)
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(deletedUser?.deletedAt).toBeTruthy()
    expect(deletedUser?.displayName).toBe('Deleted User')
    expect(deletedUser?.isPlatformAdmin).toBe(false)
    expect(deletedAcceptances).toHaveLength(0)
    expect(deletedAssignments).toHaveLength(0)
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'user_delete',
        entityType: 'user',
        entityId: 'user_delete',
        action: 'account.deleted'
      })
    ])
  })
})
