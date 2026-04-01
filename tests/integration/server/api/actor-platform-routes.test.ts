import { afterEach, describe, expect, test, vi } from 'vitest'

import { eq } from 'drizzle-orm'

import accountDeleteHandler from '../../../../server/api/account.delete'
import accountHackathonsGetHandler from '../../../../server/api/account/hackathons.get'
import accountPatchHandler from '../../../../server/api/account.patch'
import accountProfileIconDeleteHandler from '../../../../server/api/account/profile-icon.delete'
import accountProfileIconGetHandler from '../../../../server/api/account/profile-icon.get'
import accountProfileIconPostHandler from '../../../../server/api/account/profile-icon.post'
import accountRegistrationPostHandler from '../../../../server/api/account/registration.post'
import sessionHandler from '../../../../server/api/session.get'
import platformDocumentAcceptancePostHandler from '../../../../server/api/platform-document-acceptances.post'
import platformDocumentCurrentGetHandler from '../../../../server/api/platform-documents/current.get'
import platformDocumentVersionsGetHandler from '../../../../server/api/platform-documents/[documentType]/versions.get'
import {
  auditLogs,
  hackathons,
  hackathonRoleAssignments,
  hackathonTermsDocuments,
  platformDocuments,
  submissions,
  teamMembers,
  teams,
  userAuthIdentities,
  userApplications,
  userPlatformDocumentAcceptances,
  users
} from '../../../../server/database/schema'
import { authenticatedUploadRateLimitBindingName } from '../../../../server/utils/rate-limit'
import { fixtureTimestamp } from '../../../support/backend/runtime'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

describe('TASK-3.5 actor-facing API routes', () => {
  const databases: Array<ReturnType<typeof createApiRouteTestHarness>> = []
  const profileIconBindingName = 'PROFILE_ICONS'
  const pngSignatureBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  function createOversizedPngBytes(size: number) {
    const data = new Uint8Array(size)
    data.set(pngSignatureBytes)
    return data
  }

  function createRateLimiter(success = true) {
    return {
      limit: vi.fn(async () => ({ success }))
    }
  }

  function createFixtureJwt(payload: Record<string, unknown>) {
    return [
      Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
      Buffer.from(JSON.stringify(payload)).toString('base64url'),
      'signature'
    ].join('.')
  }

  class InMemoryR2Bucket {
    private readonly objects = new Map<string, { body: Uint8Array, contentType?: string }>()

    async get(key: string) {
      const object = this.objects.get(key)

      if (!object) {
        return null
      }

      return {
        async arrayBuffer() {
          return object.body.buffer.slice(
            object.body.byteOffset,
            object.body.byteOffset + object.body.byteLength
          )
        },
        httpMetadata: {
          contentType: object.contentType
        }
      }
    }

    async put(
      key: string,
      value: ArrayBuffer | ArrayBufferView,
      options?: { httpMetadata?: { contentType?: string } }
    ) {
      const body = value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : new Uint8Array(value.buffer, value.byteOffset, value.byteLength)

      this.objects.set(key, {
        body: new Uint8Array(body),
        contentType: options?.httpMetadata?.contentType
      })
    }

    async delete(key: string) {
      this.objects.delete(key)
    }
  }

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
      country: 'Austria',
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
            email: 'judge@example.com',
            company: null,
            bio: null,
            profileIconUpdatedAt: null
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

  test('GET /api/account/hackathons returns current and past hackathons for the platform user', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/account/hackathons', handler: accountHackathonsGetHandler }
      ],
      sessionUser: {
        sub: 'auth0|participant',
        email: 'participant@example.com',
        name: 'Participant'
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values([
      {
        id: 'creator_1',
        auth0Subject: 'auth0|creator',
        email: 'creator@example.com',
        displayName: 'Creator'
      },
      {
        id: 'participant_1',
        auth0Subject: 'auth0|participant',
        email: 'participant@example.com',
        displayName: 'Participant'
      }
    ])

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
    await harness.database.insert(userPlatformDocumentAcceptances).values([
      {
        id: 'acceptance_privacy_1',
        userId: 'participant_1',
        platformDocumentId: 'privacy_v1',
        acceptedAt: '2026-03-03T00:00:00.000Z'
      },
      {
        id: 'acceptance_terms_1',
        userId: 'participant_1',
        platformDocumentId: 'terms_v1',
        acceptedAt: '2026-03-03T00:00:00.000Z'
      }
    ])

    await harness.database.insert(hackathons).values([
      {
        id: 'hackathon_current',
        name: 'Current Hackathon',
        slug: 'current-hackathon',
        description: 'Current program',
        city: 'Vienna',
        country: 'Austria',
        address: 'Address',
        registrationOpensAt: '2026-03-20T12:00:00.000Z',
        registrationClosesAt: '2026-03-23T12:00:00.000Z',
        submissionOpensAt: '2026-03-23T12:00:00.000Z',
        submissionClosesAt: '2026-03-25T12:00:00.000Z',
        state: 'submission_open',
        maxTeamMembers: 5,
        createdByUserId: 'creator_1'
      },
      {
        id: 'hackathon_past',
        name: 'Past Hackathon',
        slug: 'past-hackathon',
        description: 'Past program',
        city: 'London',
        country: 'United Kingdom',
        address: 'Address',
        registrationOpensAt: '2026-01-10T12:00:00.000Z',
        registrationClosesAt: '2026-01-13T12:00:00.000Z',
        submissionOpensAt: '2026-01-13T12:00:00.000Z',
        submissionClosesAt: '2026-01-15T12:00:00.000Z',
        state: 'completed',
        maxTeamMembers: 4,
        createdByUserId: 'creator_1'
      }
    ])

    await harness.database.insert(hackathonTermsDocuments).values([
      {
        id: 'hackathon_current_terms_v1',
        hackathonId: 'hackathon_current',
        documentType: 'application_terms',
        version: 1,
        title: 'Current application terms',
        content: 'Current application terms',
        publishedAt: '2026-03-18T00:00:00.000Z'
      },
      {
        id: 'hackathon_past_terms_v1',
        hackathonId: 'hackathon_past',
        documentType: 'application_terms',
        version: 1,
        title: 'Past application terms',
        content: 'Past application terms',
        publishedAt: '2026-01-08T00:00:00.000Z'
      }
    ])

    await harness.database.insert(userApplications).values([
      {
        id: 'application_current',
        hackathonId: 'hackathon_current',
        userId: 'participant_1',
        status: 'approved',
        submittedAt: '2026-03-20T13:00:00.000Z',
        applicationTermsDocumentId: 'hackathon_current_terms_v1',
        applicationTermsAcceptedAt: '2026-03-20T13:00:00.000Z'
      },
      {
        id: 'application_past',
        hackathonId: 'hackathon_past',
        userId: 'participant_1',
        status: 'approved',
        submittedAt: '2026-01-10T13:00:00.000Z',
        applicationTermsDocumentId: 'hackathon_past_terms_v1',
        applicationTermsAcceptedAt: '2026-01-10T13:00:00.000Z'
      }
    ])

    await harness.database.insert(teams).values([
      {
        id: 'team_current',
        hackathonId: 'hackathon_current',
        name: 'Current Team',
        slug: 'current-team',
        createdByUserId: 'participant_1'
      }
    ])

    await harness.database.insert(teamMembers).values({
      id: 'membership_current',
      teamId: 'team_current',
      userId: 'participant_1',
      role: 'admin',
      joinedAt: '2026-03-20T16:00:00.000Z',
      leftAt: null
    })

    await harness.database.insert(submissions).values({
      id: 'submission_current',
      teamId: 'team_current',
      status: 'submitted',
      projectName: 'Current Project',
      submittedAt: '2026-03-24T11:00:00.000Z',
      createdAt: '2026-03-24T10:00:00.000Z',
      updatedAt: '2026-03-24T11:00:00.000Z'
    })

    await harness.database.insert(hackathonRoleAssignments).values({
      id: 'role_staff_current',
      hackathonId: 'hackathon_current',
      userId: 'participant_1',
      role: 'staff',
      isStaff: true,
      createdAt: '2026-03-20T17:00:00.000Z'
    })

    const response = await harness.request('/api/account/hackathons')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        current: [
          {
            id: 'hackathon_current',
            slug: 'current-hackathon',
            applicationStatus: 'approved',
            team: {
              id: 'team_current',
              slug: 'current-team',
              role: 'admin'
            },
            submissionStatus: 'submitted',
            roles: ['staff']
          }
        ],
        past: [
          {
            id: 'hackathon_past',
            slug: 'past-hackathon',
            applicationStatus: 'approved',
            team: null,
            submissionStatus: null,
            roles: []
          }
        ]
      }
    })
  })

  test('GET /api/session keeps a missing platform account as an authenticated identity even when legacy signup consent claims are present', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/session', handler: sessionHandler }
      ],
      sessionUser: {
        'sub': 'auth0|consented-user',
        'email': 'consented-user@example.com',
        'name': 'Consented User',
        'https://codex-hackathons/consents/privacy_policy': true,
        'https://codex-hackathons/consents/platform_terms': true
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

    const response = await harness.request('/api/session')
    const createdUser = await harness.database.query.users.findFirst({
      where: eq(users.auth0Subject, 'auth0|consented-user')
    })
    const acceptances = await harness.database.select().from(userPlatformDocumentAcceptances)
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        actor: {
          kind: 'authenticated_identity',
          hasPlatformAccount: false,
          hasAcceptedCurrentPlatformDocuments: false,
          platformUser: null
        }
      }
    })
    expect(createdUser).toBeUndefined()
    expect(acceptances).toHaveLength(0)
    expect(auditEntries).toHaveLength(0)
  })

  test('GET /api/session exposes same-email account-link metadata for verified social identities', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/session', handler: sessionHandler }
      ],
      sessionUser: {
        sub: 'google-oauth2|existing-google-user',
        email: 'existing-user@example.com',
        email_verified: true,
        name: 'Existing User'
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'existing_platform_user',
      auth0Subject: 'auth0|existing-password-user',
      email: 'existing-user@example.com',
      displayName: 'Existing User'
    })

    const response = await harness.request('/api/session')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        actor: {
          kind: 'authenticated_identity',
          hasPlatformAccount: false,
          accountLink: {
            required: true,
            email: 'existing-user@example.com',
            linkLoginHref: '/auth/link/login'
          },
          platformUser: null
        }
      }
    })
  })

  test('GET /api/session exposes a derived GitHub profile URL for GitHub-backed sessions', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/session', handler: sessionHandler }
      ],
      sessionUser: {
        sub: 'github|fixture-user',
        email: 'fixture-user@example.com',
        nickname: 'fixture-user',
        name: 'Fixture User'
      }
    })
    databases.push(harness)

    const response = await harness.request('/api/session')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        actor: {
          kind: 'authenticated_identity',
          sessionUser: {
            sub: 'github|fixture-user',
            githubProfileUrl: 'https://github.com/fixture-user'
          }
        }
      }
    })
  })

  test('GET /api/session reconciles a linked social identity through Auth0 and stores the missing identity row', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/session', handler: sessionHandler }
      ],
      sessionUser: {
        sub: 'google-oauth2|existing-google-user',
        email: 'existing-user@example.com',
        email_verified: true,
        name: 'Existing User'
      },
      runtimeConfig: {
        auth0: {
          managementDomain: 'codex-hackathons-dev.eu.auth0.com',
          managementClientId: 'management-client-id',
          managementClientSecret: 'management-client-secret',
          managementAudience: 'https://codex-hackathons-dev.eu.auth0.com/api/v2/'
        }
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'existing_platform_user',
      auth0Subject: 'auth0|existing-password-user',
      email: 'existing-user@example.com',
      displayName: 'Existing User'
    })

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

      if (url === 'https://codex-hackathons-dev.eu.auth0.com/oauth/token') {
        return new Response(JSON.stringify({
          access_token: createFixtureJwt({
            permissions: ['read:users']
          }),
          scope: 'read:users'
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        })
      }

      if (url === 'https://codex-hackathons-dev.eu.auth0.com/api/v2/users/auth0%7Cexisting-password-user') {
        return new Response(JSON.stringify({
          identities: [
            {
              provider: 'auth0',
              user_id: 'existing-password-user'
            },
            {
              provider: 'google-oauth2',
              user_id: 'existing-google-user'
            }
          ]
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        })
      }

      return new Response('not found', { status: 404 })
    })

    vi.stubGlobal('fetch', fetchMock)

    const response = await harness.request('/api/session')
    const storedGoogleIdentity = await harness.database.query.userAuthIdentities.findFirst({
      where: eq(userAuthIdentities.auth0Subject, 'google-oauth2|existing-google-user')
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        actor: {
          kind: 'platform_user',
          hasPlatformAccount: true,
          platformUser: {
            id: 'existing_platform_user',
            email: 'existing-user@example.com'
          }
        }
      }
    })
    expect(storedGoogleIdentity).toMatchObject({
      userId: 'existing_platform_user',
      auth0Subject: 'google-oauth2|existing-google-user'
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('GET /api/session marks a platform account consent-blocked when current required platform documents are not accepted', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/session', handler: sessionHandler }
      ],
      sessionUser: {
        sub: 'auth0|consent-blocked-user',
        email: 'consent-blocked@example.com',
        name: 'Consent Blocked'
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'user_consent_blocked',
      auth0Subject: 'auth0|consent-blocked-user',
      email: 'consent-blocked@example.com',
      displayName: 'Consent Blocked'
    })
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

    const response = await harness.request('/api/session')

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        actor: {
          kind: 'platform_user',
          hasPlatformAccount: true,
          hasAcceptedCurrentPlatformDocuments: false,
          platformUser: {
            id: 'user_consent_blocked'
          }
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

  test('POST /api/account/registration creates the platform user and records required document acceptances', async () => {
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
          firstName: '',
          familyName: '',
          githubProfileUrl: null,
          chatgptEmail: null,
          openaiOrgId: null,
          lumaUsername: null,
          profileIconUpdatedAt: null
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
    const createdPrimaryIdentity = await harness.database.query.userAuthIdentities.findFirst({
      where: eq(userAuthIdentities.auth0Subject, 'auth0|new-user')
    })
    const acceptances = await harness.database.select().from(userPlatformDocumentAcceptances)
    const auditEntries = await harness.database.select().from(auditLogs)
    const sessionResponse = await harness.request('/api/session')

    expect(createdUser?.email).toBe('new-user@example.com')
    expect(createdUser?.displayName).toBe('New User')
    expect(createdUser?.firstName).toBe('')
    expect(createdUser?.familyName).toBe('')
    expect(createdUser?.githubProfileUrl).toBeNull()
    expect(createdUser?.chatgptEmail).toBeNull()
    expect(createdUser?.openaiOrgId).toBeNull()
    expect(createdUser?.lumaUsername).toBeNull()
    expect(createdUser?.profileIconUpdatedAt).toBeNull()
    expect(createdPrimaryIdentity).toMatchObject({
      userId: createdUser?.id,
      auth0Subject: 'auth0|new-user'
    })
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
          hasAcceptedCurrentPlatformDocuments: true,
          platformUser: {
            id: createdUser?.id,
            email: 'new-user@example.com',
            displayName: 'New User',
            firstName: '',
            familyName: '',
            chatgptEmail: null,
            openaiOrgId: null,
            lumaUsername: null,
            profileIconUpdatedAt: null
          }
        }
      }
    })
  })

  test('POST /api/account/registration stores the GitHub profile URL for GitHub-backed sessions', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/account/registration', handler: accountRegistrationPostHandler },
        { method: 'get', path: '/api/session', handler: sessionHandler }
      ],
      sessionUser: {
        sub: 'github|new-github-user',
        email: 'new-github-user@example.com',
        nickname: 'new-github-user',
        name: 'New GitHub User'
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
          email: 'new-github-user@example.com',
          githubProfileUrl: 'https://github.com/new-github-user'
        }
      }
    })

    const createdUser = await harness.database.query.users.findFirst({
      where: eq(users.auth0Subject, 'github|new-github-user')
    })
    const sessionResponse = await harness.request('/api/session')

    expect(createdUser?.githubProfileUrl).toBe('https://github.com/new-github-user')
    expect(await sessionResponse.json()).toMatchObject({
      data: {
        actor: {
          kind: 'platform_user',
          sessionUser: {
            sub: 'github|new-github-user',
            githubProfileUrl: 'https://github.com/new-github-user'
          },
          platformUser: {
            githubProfileUrl: 'https://github.com/new-github-user'
          }
        }
      }
    })
  })

  test('POST /api/account/registration uses the email as the initial presentation label without seeding canonical names', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/account/registration', handler: accountRegistrationPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|email-only-user',
        email: 'email-only-user@example.com'
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

    const createdUser = await harness.database.query.users.findFirst({
      where: eq(users.auth0Subject, 'auth0|email-only-user')
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        user: {
          email: 'email-only-user@example.com',
          displayName: 'email-only-user@example.com',
          firstName: '',
          familyName: ''
        }
      }
    })
    expect(createdUser).toMatchObject({
      email: 'email-only-user@example.com',
      displayName: 'email-only-user@example.com',
      firstName: '',
      familyName: ''
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

  test('POST /api/account/registration requests account linking for a verified social identity that matches an existing password account email', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/account/registration', handler: accountRegistrationPostHandler }
      ],
      sessionUser: {
        sub: 'google-oauth2|existing-google-user',
        email: 'existing-user@example.com',
        email_verified: true,
        name: 'Existing User'
      },
      runtimeConfig: {
        auth0: {
          appBaseUrl: 'https://dev.codex-hackathons.com',
          managementDomain: 'codex-hackathons-dev.eu.auth0.com',
          managementClientId: 'management-client-id',
          managementClientSecret: 'management-client-secret',
          managementAudience: 'https://codex-hackathons-dev.eu.auth0.com/api/v2/',
          databaseConnectionName: 'Username-Password-Authentication',
          accountLinkChallengeSecret: 'link-secret'
        }
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'existing_platform_user',
      auth0Subject: 'auth0|existing-password-user',
      email: 'existing-user@example.com',
      displayName: 'Existing User'
    })
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
        platformTermsDocumentId: 'terms_v1',
        returnTo: '/hackathons/fixture/register'
      })
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'platform_account_link_required',
        details: {
          email: 'existing-user@example.com',
          linkLoginHref: '/auth/link/login'
        }
      }
    })
    expect(response.headers.get('set-cookie')).toContain('codex_platform_account_link=')
  })

  test('POST /api/account/registration keeps unverified social identities blocked on existing platform account email conflicts', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/account/registration', handler: accountRegistrationPostHandler }
      ],
      sessionUser: {
        sub: 'google-oauth2|unverified-google-user',
        email: 'existing-user@example.com',
        email_verified: false,
        name: 'Existing User'
      },
      runtimeConfig: {
        auth0: {
          appBaseUrl: 'https://dev.codex-hackathons.com',
          managementDomain: 'codex-hackathons-dev.eu.auth0.com',
          managementClientId: 'management-client-id',
          managementClientSecret: 'management-client-secret',
          managementAudience: 'https://codex-hackathons-dev.eu.auth0.com/api/v2/',
          databaseConnectionName: 'Username-Password-Authentication',
          accountLinkChallengeSecret: 'link-secret'
        }
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'existing_platform_user',
      auth0Subject: 'auth0|existing-password-user',
      email: 'existing-user@example.com',
      displayName: 'Existing User'
    })
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
        platformTermsDocumentId: 'terms_v1',
        returnTo: '/hackathons/fixture/register'
      })
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'platform_account_email_conflict',
        details: {
          email: 'existing-user@example.com'
        }
      }
    })
    expect(response.headers.get('set-cookie')).toBeNull()
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
        firstName: 'Identity',
        familyName: 'Only'
      })
    })

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'platform_account_required'
      }
    })
  })

  test('PATCH /api/account rejects platform users who have not accepted the current platform documents', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'patch', path: '/api/account', handler: accountPatchHandler }
      ],
      sessionUser: {
        sub: 'auth0|consent-patch-user',
        email: 'consent-patch@example.com',
        name: 'Consent Patch'
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'user_consent_patch',
      auth0Subject: 'auth0|consent-patch-user',
      email: 'consent-patch@example.com',
      displayName: 'Consent Patch'
    })
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

    const response = await harness.request('/api/account', {
      method: 'PATCH',
      body: JSON.stringify({
        firstName: 'Consent',
        familyName: 'Patch'
      })
    })

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({
      error: {
        code: 'platform_consent_required'
      }
    })
  })

  test('PATCH /api/account updates canonical names and display name without changing existing profile urls', async () => {
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
      firstName: 'Display',
      familyName: 'Name User',
      company: 'Analytical Engines Ltd.',
      bio: 'Builds careful systems.',
      githubProfileUrl: 'https://github.com/display-name-user',
      chatgptEmail: 'display-name@chatgpt.example',
      openaiOrgId: 'org_display_name',
      lumaUsername: 'display-name-user'
    })

    const response = await harness.request('/api/account', {
      method: 'PATCH',
      body: JSON.stringify({
        firstName: 'Display',
        familyName: 'Name Updated'
      })
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      data: {
        user: {
          id: 'user_display_name',
          displayName: 'Display Name Updated',
          firstName: 'Display',
          familyName: 'Name Updated',
          company: 'Analytical Engines Ltd.',
          bio: 'Builds careful systems.',
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
      firstName: 'Display',
      familyName: 'Name Updated',
      company: 'Analytical Engines Ltd.',
      bio: 'Builds careful systems.',
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
      firstName: 'Account',
      familyName: 'User'
    })

    const response = await harness.request('/api/account', {
      method: 'PATCH',
      body: JSON.stringify({
        firstName: 'Updated',
        familyName: 'Account User',
        company: 'Codex Labs',
        bio: 'Building tools for hackathon participants.',
        xProfileUrl: 'x.com/account-user',
        linkedinProfileUrl: 'linkedin.com/in/account-user',
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
          firstName: 'Updated',
          familyName: 'Account User',
          company: 'Codex Labs',
          bio: 'Building tools for hackathon participants.',
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
      displayName: 'Updated Account User',
      firstName: 'Updated',
      familyName: 'Account User',
      company: 'Codex Labs',
      bio: 'Building tools for hackathon participants.',
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

  test('PATCH /api/account rejects unsupported social profile URL domains', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'patch', path: '/api/account', handler: accountPatchHandler }
      ],
      sessionUser: {
        sub: 'auth0|domain-user',
        email: 'domain-user@example.com',
        name: 'Domain User'
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'user_domain',
      auth0Subject: 'auth0|domain-user',
      email: 'domain-user@example.com',
      displayName: 'Domain User',
      firstName: 'Domain',
      familyName: 'User'
    })

    const response = await harness.request('/api/account', {
      method: 'PATCH',
      body: JSON.stringify({
        firstName: 'Domain',
        familyName: 'User',
        githubProfileUrl: 'github.cox/domain-user'
      })
    })

    expect(response.status).toBe(400)
  })

  test('profile-icon account routes upload, read, and remove the caller profile icon', async () => {
    const profileIconsBucket = new InMemoryR2Bucket()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/account/profile-icon', handler: accountProfileIconPostHandler },
        { method: 'get', path: '/api/account/profile-icon', handler: accountProfileIconGetHandler },
        { method: 'delete', path: '/api/account/profile-icon', handler: accountProfileIconDeleteHandler },
        { method: 'get', path: '/api/session', handler: sessionHandler }
      ],
      sessionUser: {
        sub: 'auth0|profile-icon-user',
        email: 'profile-icon-user@example.com',
        name: 'Profile Icon User'
      },
      cloudflareEnv: {
        [profileIconBindingName]: profileIconsBucket,
        [authenticatedUploadRateLimitBindingName]: createRateLimiter()
      },
      runtimeConfig: {
        profileIcons: {
          binding: profileIconBindingName
        }
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'user_profile_icon',
      auth0Subject: 'auth0|profile-icon-user',
      email: 'profile-icon-user@example.com',
      displayName: 'Profile Icon User'
    })

    const uploadForm = new FormData()
    uploadForm.append(
      'file',
      new Blob([pngSignatureBytes], { type: 'image/png' }),
      'profile.png'
    )

    const uploadResponse = await harness.request('/api/account/profile-icon', {
      method: 'POST',
      body: uploadForm
    })

    expect(uploadResponse.status).toBe(200)
    expect(await uploadResponse.json()).toMatchObject({
      data: {
        user: {
          id: 'user_profile_icon'
        }
      }
    })

    const iconResponse = await harness.request('/api/account/profile-icon')

    expect(iconResponse.status).toBe(200)
    expect(iconResponse.headers.get('cache-control')).toBe('private, max-age=31536000, immutable')
    expect(iconResponse.headers.get('vary')).toBe('Cookie')
    expect(iconResponse.headers.get('content-type')).toBe('image/png')
    expect(iconResponse.headers.get('x-content-type-options')).toBe('nosniff')
    expect(new Uint8Array(await iconResponse.arrayBuffer())).toEqual(pngSignatureBytes)

    const sessionResponse = await harness.request('/api/session')
    const sessionPayload = await sessionResponse.json()

    expect(sessionPayload).toMatchObject({
      data: {
        actor: {
          platformUser: {
            profileIconUpdatedAt: expect.any(String)
          }
        }
      }
    })

    const removeResponse = await harness.request('/api/account/profile-icon', {
      method: 'DELETE'
    })

    expect(removeResponse.status).toBe(200)
    expect(await removeResponse.json()).toMatchObject({
      data: {
        user: {
          id: 'user_profile_icon',
          profileIconUpdatedAt: null
        }
      }
    })

    const removedIconResponse = await harness.request('/api/account/profile-icon')

    expect(removedIconResponse.status).toBe(404)
    expect(await removedIconResponse.json()).toMatchObject({
      error: {
        code: 'profile_icon_not_found'
      }
    })
  })

  test('POST /api/account/profile-icon rejects invalid content types and oversized files', async () => {
    const profileIconsBucket = new InMemoryR2Bucket()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/account/profile-icon', handler: accountProfileIconPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|profile-icon-guard-user',
        email: 'profile-icon-guard@example.com',
        name: 'Profile Icon Guard'
      },
      cloudflareEnv: {
        [profileIconBindingName]: profileIconsBucket,
        [authenticatedUploadRateLimitBindingName]: createRateLimiter()
      },
      runtimeConfig: {
        profileIcons: {
          binding: profileIconBindingName
        }
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'user_profile_icon_guard',
      auth0Subject: 'auth0|profile-icon-guard-user',
      email: 'profile-icon-guard@example.com',
      displayName: 'Profile Icon Guard'
    })

    const invalidImageForm = new FormData()
    invalidImageForm.append(
      'file',
      new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' }),
      'profile.png'
    )

    const invalidTypeResponse = await harness.request('/api/account/profile-icon', {
      method: 'POST',
      body: invalidImageForm
    })

    expect(invalidTypeResponse.status).toBe(400)
    expect(await invalidTypeResponse.json()).toMatchObject({
      error: {
        code: 'profile_icon_content_type_invalid'
      }
    })

    const oversizedForm = new FormData()
    oversizedForm.append(
      'file',
      new Blob([createOversizedPngBytes(1024 * 1024 + 1)], { type: 'image/png' }),
      'profile.png'
    )

    const oversizedResponse = await harness.request('/api/account/profile-icon', {
      method: 'POST',
      body: oversizedForm
    })

    expect(oversizedResponse.status).toBe(400)
    expect(await oversizedResponse.json()).toMatchObject({
      error: {
        code: 'profile_icon_file_too_large'
      }
    })
  })

  test('POST /api/account/profile-icon returns 429 when the authenticated upload rate limit is exceeded', async () => {
    const profileIconsBucket = new InMemoryR2Bucket()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/account/profile-icon', handler: accountProfileIconPostHandler }
      ],
      sessionUser: {
        sub: 'auth0|profile-icon-guard-user',
        email: 'profile-icon-guard@example.com',
        name: 'Profile Icon Guard'
      },
      cloudflareEnv: {
        [profileIconBindingName]: profileIconsBucket,
        [authenticatedUploadRateLimitBindingName]: createRateLimiter(false)
      },
      runtimeConfig: {
        profileIcons: {
          binding: profileIconBindingName
        }
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'user_profile_icon_guard',
      auth0Subject: 'auth0|profile-icon-guard-user',
      email: 'profile-icon-guard@example.com',
      displayName: 'Profile Icon Guard'
    })

    const uploadForm = new FormData()
    uploadForm.append(
      'file',
      new Blob([pngSignatureBytes], { type: 'image/png' }),
      'profile.png'
    )

    const response = await harness.request('/api/account/profile-icon', {
      method: 'POST',
      body: uploadForm
    })

    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({
      error: {
        code: 'upload_rate_limited',
        message: 'Too many uploads were submitted. Please wait before trying again.'
      }
    })
  })

  test('DELETE /api/account soft-deletes the user and writes an audit record', async () => {
    const profileIconsBucket = new InMemoryR2Bucket()
    await profileIconsBucket.put(
      'users/user_delete/profile-icon',
      new Uint8Array([9, 9, 9]),
      {
        httpMetadata: {
          contentType: 'image/png'
        }
      }
    )

    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'delete', path: '/api/account', handler: accountDeleteHandler }
      ],
      sessionUser: {
        sub: 'auth0|delete-me',
        email: 'delete-me@example.com'
      },
      cloudflareEnv: {
        [profileIconBindingName]: profileIconsBucket,
        [authenticatedUploadRateLimitBindingName]: createRateLimiter()
      },
      runtimeConfig: {
        profileIcons: {
          binding: profileIconBindingName
        }
      }
    })
    databases.push(harness)

    await harness.database.insert(users).values({
      id: 'user_delete',
      auth0Subject: 'auth0|delete-me',
      email: 'delete-me@example.com',
      displayName: 'Delete Me',
      isPlatformAdmin: true,
      profileIconUpdatedAt: fixtureTimestamp()
    })
    await harness.database.insert(hackathons).values({
      id: 'hackathon_1',
      name: 'Fixture Hackathon',
      slug: 'fixture-hackathon-delete',
      description: 'Fixture hackathon',
      city: 'Vienna',
      country: 'Austria',
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
    const deletedIdentities = await harness.database.select().from(userAuthIdentities)
    const deletedAcceptances = await harness.database.select().from(userPlatformDocumentAcceptances)
    const deletedAssignments = await harness.database.select().from(hackathonRoleAssignments)
    const auditEntries = await harness.database.select().from(auditLogs)

    expect(deletedUser?.deletedAt).toBeTruthy()
    expect(deletedUser?.displayName).toBe('Deleted User')
    expect(deletedUser?.isPlatformAdmin).toBe(false)
    expect(deletedUser?.profileIconUpdatedAt).toBeNull()
    expect(deletedIdentities).toHaveLength(0)
    expect(deletedAcceptances).toHaveLength(0)
    expect(deletedAssignments).toHaveLength(0)
    expect(await profileIconsBucket.get('users/user_delete/profile-icon')).toBeNull()
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
