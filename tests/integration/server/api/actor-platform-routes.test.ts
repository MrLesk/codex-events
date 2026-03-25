import { afterEach, describe, expect, test, vi } from 'vitest'

import { eq } from 'drizzle-orm'

import accountDeleteHandler from '../../../../server/api/account.delete'
import accountPatchHandler from '../../../../server/api/account.patch'
import accountRegistrationPostHandler from '../../../../server/api/account/registration.post'
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

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (databases.length > 0) {
      await databases.pop()?.d1Database.close()
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
          onboardingState: 'completed',
          isPlatformAdmin: false,
          platformUser: {
            id: 'user_judge',
            email: 'judge@example.com',
            onboardingState: 'completed'
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

  test('POST /api/account/registration creates the platform user in profile onboarding and records required document acceptances', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/account/registration', handler: accountRegistrationPostHandler },
        { method: 'get', path: '/api/session', handler: sessionHandler }
      ],
      sessionUser: {
        sub: 'auth0|new-user',
        email: 'new-user@example.com',
        name: 'New User'
      }
    })
    databases.push(harness)

    await harness.database.insert(platformDocuments).values([
      {
        id: 'privacy_v1',
        documentType: 'privacy_policy',
        version: 1,
        title: 'Privacy Policy v1',
        content: 'Privacy',
        publishedAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'terms_v1',
        documentType: 'platform_terms',
        version: 1,
        title: 'Platform Terms v1',
        content: 'Terms',
        publishedAt: '2026-03-02T00:00:00.000Z'
      }
    ])

    const response = await harness.request('/api/account/registration', {
      method: 'POST',
      body: JSON.stringify({
        privacyPolicyDocumentId: 'privacy_v1',
        platformTermsDocumentId: 'terms_v1'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        user: {
          email: 'new-user@example.com',
          displayName: 'New User',
          onboardingState: 'profile_pending',
          githubProfileUrl: null,
          chatgptEmail: null,
          openaiOrgId: null,
          lumaUsername: null
        },
        acceptedDocumentIds: {
          privacyPolicyDocumentId: 'privacy_v1',
          platformTermsDocumentId: 'terms_v1'
        }
      }
    })

    const createdUser = await harness.database.query.users.findFirst({
      where: eq(users.auth0Subject, 'auth0|new-user')
    })
    const acceptances = await harness.database.select().from(userPlatformDocumentAcceptances)
    const auditEntries = await harness.database.select().from(auditLogs)
    const sessionResponse = await harness.request('/api/session')

    expect(createdUser?.email).toBe('new-user@example.com')
    expect(createdUser?.displayName).toBe('New User')
    expect(createdUser?.onboardingState).toBe('profile_pending')
    expect(createdUser?.githubProfileUrl).toBeNull()
    expect(createdUser?.chatgptEmail).toBeNull()
    expect(createdUser?.openaiOrgId).toBeNull()
    expect(createdUser?.lumaUsername).toBeNull()
    expect(acceptances).toHaveLength(2)
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: createdUser?.id,
        entityType: 'user',
        entityId: createdUser?.id,
        action: 'account.registered'
      })
    ])
    expect(await sessionResponse.json()).toMatchObject({
      data: {
        actor: {
          kind: 'platform_user',
          hasPlatformAccount: true,
          onboardingState: 'profile_pending',
          platformUser: {
            id: createdUser?.id,
            email: 'new-user@example.com',
            displayName: 'New User',
            onboardingState: 'profile_pending',
            chatgptEmail: null,
            openaiOrgId: null,
            lumaUsername: null
          }
        }
      }
    })
  })

  test('POST /api/account/registration rejects outdated or mismatched platform document ids', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/account/registration', handler: accountRegistrationPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|registration-guard-user',
        email: 'registration-guard@example.com',
        name: 'Registration Guard'
      }
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

    const outdatedResponse = await harness.request('/api/account/registration', {
      method: 'POST',
      body: JSON.stringify({
        privacyPolicyDocumentId: 'privacy_v1',
        platformTermsDocumentId: 'terms_v1'
      })
    })

    expect(outdatedResponse.status).toBe(409)
    expect(await outdatedResponse.json()).toMatchObject({
      error: {
        code: 'platform_document_outdated',
        details: {
          documentType: 'privacy_policy'
        }
      }
    })

    const mismatchedResponse = await harness.request('/api/account/registration', {
      method: 'POST',
      body: JSON.stringify({
        privacyPolicyDocumentId: 'terms_v1',
        platformTermsDocumentId: 'terms_v1'
      })
    })

    expect(mismatchedResponse.status).toBe(409)
    expect(await mismatchedResponse.json()).toMatchObject({
      error: {
        code: 'platform_document_type_mismatch',
        details: {
          expectedDocumentType: 'privacy_policy',
          actualDocumentType: 'platform_terms'
        }
      }
    })

    const createdUsers = await harness.database.select().from(users)
    const acceptances = await harness.database.select().from(userPlatformDocumentAcceptances)

    expect(createdUsers).toHaveLength(0)
    expect(acceptances).toHaveLength(0)
  })

  test('PATCH /api/account rejects authenticated identities without a platform account', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'patch', path: '/api/account', handler: accountPatchHandler }
      ],
      sessionUser: {
        sub: 'auth0|identity-only',
        email: 'identity-only@example.com',
        name: 'Identity Only'
      }
    })
    databases.push(harness)

    const response = await harness.request('/api/account', {
      method: 'PATCH',
      body: JSON.stringify({
        displayName: 'Identity Only'
      })
    })

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'platform_account_required'
      }
    })
  })

  test('PATCH /api/account updates the current platform user display name without changing existing profile urls', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'patch', path: '/api/account', handler: accountPatchHandler }
      ],
      sessionUser: {
        sub: 'auth0|display-name-user',
        email: 'display-name@example.com',
        name: 'Display Name User'
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'user_display_name',
      auth0Subject: 'auth0|display-name-user',
      email: 'display-name@example.com',
      displayName: 'Display Name User',
      githubProfileUrl: 'https://github.com/display-name-user',
      chatgptEmail: 'display-name@chatgpt.example',
      openaiOrgId: 'org_display_name',
      lumaUsername: 'display-name-user'
    })

    const response = await harness.request('/api/account', {
      method: 'PATCH',
      body: JSON.stringify({
        displayName: 'Display Name Updated'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        user: {
          id: 'user_display_name',
          displayName: 'Display Name Updated',
          githubProfileUrl: 'https://github.com/display-name-user',
          chatgptEmail: 'display-name@chatgpt.example',
          openaiOrgId: 'org_display_name',
          lumaUsername: 'display-name-user'
        }
      }
    })

    const updatedUser = await harness.database.query.users.findFirst({
      where: eq(users.id, 'user_display_name')
    })

    expect(updatedUser).toMatchObject({
      displayName: 'Display Name Updated',
      githubProfileUrl: 'https://github.com/display-name-user',
      chatgptEmail: 'display-name@chatgpt.example',
      openaiOrgId: 'org_display_name',
      lumaUsername: 'display-name-user'
    })
  })

  test('PATCH /api/account updates the current platform user profile fields', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'patch', path: '/api/account', handler: accountPatchHandler }
      ],
      sessionUser: {
        sub: 'auth0|account-user',
        email: 'account-user@example.com',
        name: 'Account User'
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'user_account',
      auth0Subject: 'auth0|account-user',
      email: 'account-user@example.com',
      displayName: 'Account User',
      onboardingState: 'profile_pending'
    })

    const response = await harness.request('/api/account', {
      method: 'PATCH',
      body: JSON.stringify({
        displayName: 'Updated Account User',
        xProfileUrl: 'https://x.com/account-user',
        linkedinProfileUrl: 'https://linkedin.com/in/account-user',
        githubProfileUrl: '',
        chatgptEmail: 'account-user@chatgpt.example',
        openaiOrgId: 'org_account_user',
        lumaUsername: 'account-user'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        user: {
          id: 'user_account',
          displayName: 'Updated Account User',
          onboardingState: 'completed',
          xProfileUrl: 'https://x.com/account-user',
          linkedinProfileUrl: 'https://linkedin.com/in/account-user',
          githubProfileUrl: null,
          chatgptEmail: 'account-user@chatgpt.example',
          openaiOrgId: 'org_account_user',
          lumaUsername: 'account-user'
        }
      }
    })

    const updatedUser = await harness.database.query.users.findFirst({
      where: eq(users.id, 'user_account')
    })
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(updatedUser).toMatchObject({
      onboardingState: 'completed',
      displayName: 'Updated Account User',
      xProfileUrl: 'https://x.com/account-user',
      linkedinProfileUrl: 'https://linkedin.com/in/account-user',
      githubProfileUrl: null,
      chatgptEmail: 'account-user@chatgpt.example',
      openaiOrgId: 'org_account_user',
      lumaUsername: 'account-user'
    })
    expect(auditEntries).toEqual([
      expect.objectContaining({
        actorUserId: 'user_account',
        entityType: 'user',
        entityId: 'user_account',
        action: 'account.updated'
      })
    ])
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
