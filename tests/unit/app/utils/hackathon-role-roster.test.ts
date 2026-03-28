import { describe, expect, test } from 'vitest'

import {
  filterAssignableRoleUsers,
  listAssignableRosterUsers
} from '../../../../app/utils/hackathon-role-roster'

describe('hackathon role roster helpers', () => {
  test('builds a deduplicated sorted assignable-user list from approved applications and existing assignments', () => {
    const assignableUsers = listAssignableRosterUsers(
      [{
        id: 'application-1',
        hackathonId: 'hackathon-1',
        userId: 'user-2',
        status: 'approved',
        submittedAt: '2026-03-01T10:00:00.000Z',
        reviewedAt: null,
        reviewedByUserId: null,
        applicationTermsDocumentId: 'terms-1',
        applicationTermsAcceptedAt: '2026-03-01T10:00:00.000Z',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z',
        user: {
          id: 'user-2',
          email: 'bravo@example.com',
          displayName: 'Bravo Builder'
        }
      }, {
        id: 'application-2',
        hackathonId: 'hackathon-1',
        userId: 'user-3',
        status: 'rejected',
        submittedAt: '2026-03-01T10:00:00.000Z',
        reviewedAt: null,
        reviewedByUserId: null,
        applicationTermsDocumentId: 'terms-1',
        applicationTermsAcceptedAt: '2026-03-01T10:00:00.000Z',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z',
        user: {
          id: 'user-3',
          email: 'ignored@example.com',
          displayName: 'Ignored User'
        }
      }] as never,
      [{
        id: 'assignment-1',
        hackathonId: 'hackathon-1',
        userId: 'user-1',
        role: 'judge',
        isInJudgePool: true,
        createdAt: '2026-03-01T10:00:00.000Z',
        user: {
          id: 'user-1',
          email: 'alpha@example.com',
          displayName: 'Alpha Admin',
          isPlatformAdmin: false
        }
      }, {
        id: 'assignment-2',
        hackathonId: 'hackathon-1',
        userId: 'user-2',
        role: 'hackathon_admin',
        isInJudgePool: false,
        createdAt: '2026-03-01T10:00:00.000Z',
        user: {
          id: 'user-2',
          email: 'bravo@example.com',
          displayName: 'Bravo Builder',
          isPlatformAdmin: false
        }
      }] as never
    )

    expect(assignableUsers).toEqual([{
      id: 'user-1',
      email: 'alpha@example.com',
      displayName: 'Alpha Admin'
    }, {
      id: 'user-2',
      email: 'bravo@example.com',
      displayName: 'Bravo Builder'
    }])
  })

  test('filters out users who already hold the target role and respects the search query', () => {
    const assignableUsers = [{
      id: 'user-1',
      email: 'alpha@example.com',
      displayName: 'Alpha Admin'
    }, {
      id: 'user-2',
      email: 'bravo@example.com',
      displayName: 'Bravo Builder'
    }, {
      id: 'user-3',
      email: 'charlie@example.com',
      displayName: 'Charlie Judge'
    }]

    const roleAssignments = [{
      id: 'assignment-1',
      hackathonId: 'hackathon-1',
      userId: 'user-1',
      role: 'hackathon_admin',
      isInJudgePool: false,
      createdAt: '2026-03-01T10:00:00.000Z'
    }, {
      id: 'assignment-2',
      hackathonId: 'hackathon-1',
      userId: 'user-3',
      role: 'judge',
      isInJudgePool: true,
      createdAt: '2026-03-01T10:00:00.000Z'
    }] as never

    expect(filterAssignableRoleUsers(assignableUsers, roleAssignments, 'hackathon_admin', '')).toEqual([{
      id: 'user-2',
      email: 'bravo@example.com',
      displayName: 'Bravo Builder'
    }, {
      id: 'user-3',
      email: 'charlie@example.com',
      displayName: 'Charlie Judge'
    }])

    expect(filterAssignableRoleUsers(assignableUsers, roleAssignments, 'judge', 'bravo')).toEqual([{
      id: 'user-2',
      email: 'bravo@example.com',
      displayName: 'Bravo Builder'
    }])
  })
})
