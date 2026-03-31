import type { H3Event } from 'h3'

import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertBlindJudgeAssignmentAccess,
  assertHackathonAdminAccess,
  assertHackathonParticipantVisibilityAccess,
  assertTeamAdminAccess,
  resolveHackathonAuthorization,
  resolveJudgeAssignmentAuthorization,
  resolveTeamAuthorization
} from '../../../../server/auth/authorization'
import { setDatabase } from '../../../../server/database/client'

type SessionUser = {
  sub: string
}

type EventContext = H3Event['context'] & {
  runtimeConfig?: {
    auth0?: Record<string, unknown>
  }
}

function createEvent(sessionUser?: SessionUser | null) {
  const event = {
    context: {
      cloudflare: { env: {} },
      runtimeConfig: {
        auth0: {}
      }
    } satisfies EventContext
  } as H3Event

  vi.stubGlobal('useAuth0', vi.fn(() => ({
    getSession: vi.fn(async () => sessionUser ? { user: sessionUser } : null)
  })))
  vi.stubGlobal('useRuntimeConfig', ((runtimeEvent: H3Event) => runtimeEvent.context.runtimeConfig) as typeof useRuntimeConfig)

  return event
}

function createDatabaseMock(options?: {
  user?: Record<string, unknown> | null
  hackathonRoleAssignment?: Record<string, unknown> | null
  teamMembership?: Record<string, unknown> | null
  judgeAssignment?: Record<string, unknown> | null
  hasAcceptedCurrentPlatformDocuments?: boolean
  currentDocumentsAvailable?: boolean
}) {
  let currentDocumentCallCount = 0
  const hasAcceptedCurrentPlatformDocuments = options?.hasAcceptedCurrentPlatformDocuments ?? true
  const currentDocumentsAvailable = options?.currentDocumentsAvailable ?? true
  const auth0Subject = typeof options?.user?.auth0Subject === 'string'
    ? options.user.auth0Subject
    : null

  return {
    query: {
      userAuthIdentities: {
        findFirst: vi.fn(async () => auth0Subject && options?.user
          ? {
              id: 'identity_1',
              userId: options.user.id,
              auth0Subject,
              createdAt: '2026-03-22T12:00:00.000Z'
            }
          : undefined)
      },
      users: {
        findFirst: vi.fn(async () => options?.user ?? undefined)
      },
      platformDocuments: {
        findFirst: vi.fn(async () => {
          if (!currentDocumentsAvailable) {
            return undefined
          }

          currentDocumentCallCount += 1

          return currentDocumentCallCount === 1
            ? { id: 'privacy_v1', documentType: 'privacy_policy' }
            : { id: 'terms_v1', documentType: 'platform_terms' }
        }),
        findMany: vi.fn(async () => {
          if (!currentDocumentsAvailable) {
            return []
          }

          return [
            { id: 'privacy_v1', documentType: 'privacy_policy', version: 1 },
            { id: 'terms_v1', documentType: 'platform_terms', version: 1 }
          ]
        })
      },
      userPlatformDocumentAcceptances: {
        findMany: vi.fn(async () => hasAcceptedCurrentPlatformDocuments
          ? [
              { platformDocumentId: 'privacy_v1' },
              { platformDocumentId: 'terms_v1' }
            ]
          : []
        )
      },
      hackathonRoleAssignments: {
        findFirst: vi.fn(async () => options?.hackathonRoleAssignment ?? undefined)
      },
      teamMembers: {
        findFirst: vi.fn(async () => options?.teamMembership ?? undefined)
      },
      judgeAssignments: {
        findFirst: vi.fn(async () => options?.judgeAssignment ?? undefined)
      }
    }
  } as never
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('hackathon authorization', () => {
  test('gives inherited hackathon admin access to platform admins', async () => {
    const event = createEvent({ sub: 'auth0|admin' })
    setDatabase(event, createDatabaseMock({
      user: {
        id: 'user_admin',
        auth0Subject: 'auth0|admin',
        email: 'admin@example.com',
        displayName: 'Admin',
        isPlatformAdmin: true
      }
    }))

    await expect(resolveHackathonAuthorization(event, 'hackathon_1')).resolves.toMatchObject({
      isPlatformAdmin: true,
      isHackathonAdmin: true,
      canReviewThroughAssignment: false,
      canViewParticipantsAndTeams: true,
      explicitRole: 'hackathon_admin'
    })
  })

  test('returns explicit judge permissions for non-admin hackathon judges', async () => {
    const event = createEvent({ sub: 'auth0|judge' })
    setDatabase(event, createDatabaseMock({
      user: {
        id: 'user_judge',
        auth0Subject: 'auth0|judge',
        email: 'judge@example.com',
        displayName: 'Judge',
        isPlatformAdmin: false
      },
      hackathonRoleAssignment: {
        role: 'judge',
        isInJudgePool: true
      }
    }))

    await expect(resolveHackathonAuthorization(event, 'hackathon_1')).resolves.toMatchObject({
      isPlatformAdmin: false,
      explicitRole: 'judge',
      isHackathonAdmin: false,
      canReviewThroughAssignment: true,
      isInJudgePool: true,
      isStaff: false,
      canViewParticipantsAndTeams: false
    })
  })

  test('returns participant visibility access for explicit staff assignments', async () => {
    const event = createEvent({ sub: 'auth0|staff' })
    setDatabase(event, createDatabaseMock({
      user: {
        id: 'user_staff',
        auth0Subject: 'auth0|staff',
        email: 'staff@example.com',
        displayName: 'Staff',
        isPlatformAdmin: false
      },
      hackathonRoleAssignment: {
        role: 'staff',
        isInJudgePool: false,
        isStaff: true
      }
    }))

    await expect(resolveHackathonAuthorization(event, 'hackathon_1')).resolves.toMatchObject({
      explicitRole: 'staff',
      isHackathonAdmin: false,
      canReviewThroughAssignment: false,
      isInJudgePool: false,
      isStaff: true,
      canViewParticipantsAndTeams: true
    })
  })

  test('rejects missing hackathon-admin access', () => {
    expect(() => assertHackathonAdminAccess({
      hackathonId: 'hackathon_1',
      isPlatformAdmin: false,
      explicitRole: null,
      isHackathonAdmin: false,
      canReviewThroughAssignment: false,
      isInJudgePool: false,
      isStaff: false,
      canViewParticipantsAndTeams: false
    })).toThrow(ApiError)
  })

  test('rejects missing participant visibility access', () => {
    expect(() => assertHackathonParticipantVisibilityAccess({
      hackathonId: 'hackathon_1',
      isPlatformAdmin: false,
      explicitRole: 'judge',
      isHackathonAdmin: false,
      canReviewThroughAssignment: true,
      isInJudgePool: true,
      isStaff: false,
      canViewParticipantsAndTeams: false
    })).toThrow(ApiError)
  })

  test('allows platform users to resolve authorization without extra account gating', async () => {
    const event = createEvent({ sub: 'auth0|pending' })
    setDatabase(event, createDatabaseMock({
      user: {
        id: 'user_pending',
        auth0Subject: 'auth0|pending',
        email: 'pending@example.com',
        displayName: 'Pending',
        isPlatformAdmin: false
      }
    }))

    await expect(resolveHackathonAuthorization(event, 'hackathon_1')).resolves.toMatchObject({
      hackathonId: 'hackathon_1',
      isPlatformAdmin: false,
      canReviewThroughAssignment: false,
      canViewParticipantsAndTeams: false
    })
  })
})

describe('team authorization', () => {
  test('detects active team-admin membership', async () => {
    const event = createEvent({ sub: 'auth0|member' })
    setDatabase(event, createDatabaseMock({
      user: {
        id: 'user_member',
        auth0Subject: 'auth0|member',
        email: 'member@example.com',
        displayName: 'Member',
        isPlatformAdmin: false
      },
      teamMembership: {
        role: 'admin'
      }
    }))

    await expect(resolveTeamAuthorization(event, 'team_1')).resolves.toMatchObject({
      role: 'admin',
      isTeamMember: true,
      isTeamAdmin: true
    })
  })

  test('rejects missing team-admin access', () => {
    expect(() => assertTeamAdminAccess({
      teamId: 'team_1',
      role: 'member',
      isTeamMember: true,
      isTeamAdmin: false
    })).toThrow(ApiError)
  })
})

describe('judge assignment authorization', () => {
  test('allows the assigned judge through the blind-review context', async () => {
    const event = createEvent({ sub: 'auth0|judge' })
    setDatabase(event, createDatabaseMock({
      user: {
        id: 'user_judge',
        auth0Subject: 'auth0|judge',
        email: 'judge@example.com',
        displayName: 'Judge',
        isPlatformAdmin: false
      },
      judgeAssignment: {
        id: 'assignment_1',
        hackathonId: 'hackathon_1',
        judgeUserId: 'user_judge'
      }
    }))

    await expect(resolveJudgeAssignmentAuthorization(event, 'assignment_1')).resolves.toMatchObject({
      actingRole: 'assigned_judge',
      canAccess: true,
      visibility: 'blind'
    })
  })

  test('allows hackathon admins to use blind-review access only when the assignment is theirs', async () => {
    const event = createEvent({ sub: 'auth0|admin' })
    setDatabase(event, createDatabaseMock({
      user: {
        id: 'user_admin',
        auth0Subject: 'auth0|admin',
        email: 'admin@example.com',
        displayName: 'Admin',
        isPlatformAdmin: false
      },
      hackathonRoleAssignment: {
        role: 'hackathon_admin',
        isInJudgePool: true,
        isStaff: false
      },
      judgeAssignment: {
        id: 'assignment_1',
        hackathonId: 'hackathon_1',
        judgeUserId: 'user_admin'
      }
    }))

    await expect(resolveJudgeAssignmentAuthorization(event, 'assignment_1')).resolves.toMatchObject({
      actingRole: 'assigned_judge',
      canAccess: true,
      visibility: 'blind'
    })
  })

  test('rejects admins who are not participating through the assignment', async () => {
    const event = createEvent({ sub: 'auth0|admin' })
    setDatabase(event, createDatabaseMock({
      user: {
        id: 'user_admin',
        auth0Subject: 'auth0|admin',
        email: 'admin@example.com',
        displayName: 'Admin',
        isPlatformAdmin: false
      },
      hackathonRoleAssignment: {
        role: 'hackathon_admin',
        isInJudgePool: true,
        isStaff: false
      },
      judgeAssignment: {
        id: 'assignment_1',
        hackathonId: 'hackathon_1',
        judgeUserId: 'user_judge'
      }
    }))

    const authorization = await resolveJudgeAssignmentAuthorization(event, 'assignment_1')

    expect(authorization).toMatchObject({
      actingRole: null,
      canAccess: false,
      visibility: 'forbidden'
    })
    expect(() => assertBlindJudgeAssignmentAccess(authorization)).toThrow(ApiError)
  })
})
