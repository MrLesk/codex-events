import type { H3Event } from 'h3'

import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertBlindJudgeAssignmentAccess,
  assertHackathonAdminAccess,
  assertTeamAdminAccess,
  resolveHackathonAuthorization,
  resolveJudgeAssignmentAuthorization,
  resolveTeamAuthorization
} from '../../../../server/auth/authorization'
import { setDatabase } from '../../../../server/database/client'

type SessionUser = {
  sub: string
}

function createEvent(sessionUser?: SessionUser | null) {
  const event = {
    context: {
      cloudflare: { env: {} }
    }
  } as H3Event

  vi.stubGlobal('useAuth0', vi.fn(() => ({
    getSession: vi.fn(async () => sessionUser ? { user: sessionUser } : null)
  })))

  return event
}

function createDatabaseMock(options?: {
  user?: Record<string, unknown> | null
  hackathonRoleAssignment?: Record<string, unknown> | null
  teamMembership?: Record<string, unknown> | null
  judgeAssignment?: Record<string, unknown> | null
}) {
  return {
    query: {
      users: {
        findFirst: vi.fn(async () => options?.user ?? undefined)
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
        isPlatformAdmin: true,
        onboardingState: 'completed'
      }
    }))

    await expect(resolveHackathonAuthorization(event, 'hackathon_1')).resolves.toMatchObject({
      isPlatformAdmin: true,
      isHackathonAdmin: true,
      canReviewThroughAssignment: true,
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
        isPlatformAdmin: false,
        onboardingState: 'completed'
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
      isInJudgePool: true
    })
  })

  test('rejects missing hackathon-admin access', () => {
    expect(() => assertHackathonAdminAccess({
      hackathonId: 'hackathon_1',
      isPlatformAdmin: false,
      explicitRole: null,
      isHackathonAdmin: false,
      canReviewThroughAssignment: false,
      isInJudgePool: false
    })).toThrow(ApiError)
  })

  test('rejects platform users whose onboarding is still pending', async () => {
    const event = createEvent({ sub: 'auth0|pending' })
    setDatabase(event, createDatabaseMock({
      user: {
        id: 'user_pending',
        auth0Subject: 'auth0|pending',
        email: 'pending@example.com',
        displayName: 'Pending',
        isPlatformAdmin: false,
        onboardingState: 'profile_pending'
      }
    }))

    await expect(resolveHackathonAuthorization(event, 'hackathon_1')).rejects.toMatchObject({
      statusCode: 403,
      code: 'platform_onboarding_incomplete'
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
        isPlatformAdmin: false,
        onboardingState: 'completed'
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
        isPlatformAdmin: false,
        onboardingState: 'completed'
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

  test('forces hackathon admins onto the blind-review context when acting through an assignment', async () => {
    const event = createEvent({ sub: 'auth0|admin' })
    setDatabase(event, createDatabaseMock({
      user: {
        id: 'user_admin',
        auth0Subject: 'auth0|admin',
        email: 'admin@example.com',
        displayName: 'Admin',
        isPlatformAdmin: false,
        onboardingState: 'completed'
      },
      hackathonRoleAssignment: {
        role: 'hackathon_admin',
        isInJudgePool: false
      },
      judgeAssignment: {
        id: 'assignment_1',
        hackathonId: 'hackathon_1',
        judgeUserId: 'user_judge'
      }
    }))

    await expect(resolveJudgeAssignmentAuthorization(event, 'assignment_1')).resolves.toMatchObject({
      actingRole: 'admin_via_assignment',
      canAccess: true,
      visibility: 'blind'
    })
  })

  test('rejects users without assignment or admin access', async () => {
    const event = createEvent({ sub: 'auth0|other' })
    setDatabase(event, createDatabaseMock({
      user: {
        id: 'user_other',
        auth0Subject: 'auth0|other',
        email: 'other@example.com',
        displayName: 'Other',
        isPlatformAdmin: false,
        onboardingState: 'completed'
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
