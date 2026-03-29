import { describe, expect, test } from 'vitest'

import {
  buildAssignedRoleRosterRows,
  buildRoleRosterRows
} from '../../../../app/utils/hackathon-role-roster'

describe('hackathon role roster helpers', () => {
  test('builds assigned rows from the matching role assignments and sorts platform admins first', () => {
    const roleAssignments = [{
      id: 'assignment-1',
      hackathonId: 'hackathon-1',
      userId: 'user-2',
      role: 'judge',
      isInJudgePool: true,
      createdAt: '2026-03-01T10:00:00.000Z',
      user: {
        id: 'user-2',
        email: 'bravo@example.com',
        displayName: 'Bravo Builder',
        isPlatformAdmin: false
      }
    }, {
      id: 'assignment-2',
      hackathonId: 'hackathon-1',
      userId: 'user-1',
      role: 'judge',
      isInJudgePool: true,
      createdAt: '2026-03-01T10:00:00.000Z',
      user: {
        id: 'user-1',
        email: 'alpha@example.com',
        displayName: 'Alpha Admin',
        isPlatformAdmin: true
      }
    }] as never

    expect(buildAssignedRoleRosterRows(roleAssignments, 'judge')).toEqual([{
      id: 'user-1',
      email: 'alpha@example.com',
      displayName: 'Alpha Admin',
      isPlatformAdmin: true,
      assignment: roleAssignments[1],
      isAssigned: true,
      isHackathonAdmin: false,
      isInJudgePool: true
    }, {
      id: 'user-2',
      email: 'bravo@example.com',
      displayName: 'Bravo Builder',
      isPlatformAdmin: false,
      assignment: roleAssignments[0],
      isAssigned: true,
      isHackathonAdmin: false,
      isInJudgePool: true
    }])
  })

  test('includes admin reviewers in the judges roster and exposes assignment state for both tabs', () => {
    const candidateUsers = [{
      id: 'user-2',
      email: 'bravo@example.com',
      displayName: 'Bravo Builder',
      isPlatformAdmin: false
    }, {
      id: 'user-1',
      email: 'alpha@example.com',
      displayName: 'Alpha Admin',
      isPlatformAdmin: true
    }, {
      id: 'user-3',
      email: 'charlie@example.com',
      displayName: 'Charlie Judge',
      isPlatformAdmin: false
    }, {
      id: 'user-4',
      email: 'delta@example.com',
      displayName: 'Delta Staff Reviewer',
      isPlatformAdmin: false
    }]

    const roleAssignments = [{
      id: 'assignment-1',
      hackathonId: 'hackathon-1',
      userId: 'user-1',
      role: 'hackathon_admin',
      isInJudgePool: false,
      createdAt: '2026-03-01T10:00:00.000Z',
      user: candidateUsers[1]
    }, {
      id: 'assignment-2',
      hackathonId: 'hackathon-1',
      userId: 'user-3',
      role: 'judge',
      isInJudgePool: true,
      createdAt: '2026-03-01T10:00:00.000Z',
      user: candidateUsers[2]
    }, {
      id: 'assignment-3',
      hackathonId: 'hackathon-1',
      userId: 'user-4',
      role: 'hackathon_admin',
      isInJudgePool: true,
      createdAt: '2026-03-01T10:00:00.000Z',
      user: candidateUsers[3]
    }] as never

    expect(buildRoleRosterRows(candidateUsers, roleAssignments, 'hackathon_admin', '')).toEqual([{
      id: 'user-1',
      email: 'alpha@example.com',
      displayName: 'Alpha Admin',
      isPlatformAdmin: true,
      assignment: roleAssignments[0],
      isAssigned: true,
      isHackathonAdmin: true,
      isInJudgePool: false
    }, {
      id: 'user-4',
      email: 'delta@example.com',
      displayName: 'Delta Staff Reviewer',
      isPlatformAdmin: false,
      assignment: roleAssignments[2],
      isAssigned: true,
      isHackathonAdmin: true,
      isInJudgePool: true
    }, {
      id: 'user-2',
      email: 'bravo@example.com',
      displayName: 'Bravo Builder',
      isPlatformAdmin: false,
      assignment: null,
      isAssigned: false,
      isHackathonAdmin: false,
      isInJudgePool: false
    }, {
      id: 'user-3',
      email: 'charlie@example.com',
      displayName: 'Charlie Judge',
      isPlatformAdmin: false,
      assignment: roleAssignments[1],
      isAssigned: false,
      isHackathonAdmin: false,
      isInJudgePool: true
    }])

    expect(buildRoleRosterRows(candidateUsers, roleAssignments, 'judge', 'bravo')).toEqual([{
      id: 'user-2',
      email: 'bravo@example.com',
      displayName: 'Bravo Builder',
      isPlatformAdmin: false,
      assignment: null,
      isAssigned: false,
      isHackathonAdmin: false,
      isInJudgePool: false
    }])

    expect(buildAssignedRoleRosterRows(roleAssignments, 'judge')).toEqual([{
      id: 'user-4',
      email: 'delta@example.com',
      displayName: 'Delta Staff Reviewer',
      isPlatformAdmin: false,
      assignment: roleAssignments[2],
      isAssigned: true,
      isHackathonAdmin: true,
      isInJudgePool: true
    }, {
      id: 'user-3',
      email: 'charlie@example.com',
      displayName: 'Charlie Judge',
      isPlatformAdmin: false,
      assignment: roleAssignments[1],
      isAssigned: true,
      isHackathonAdmin: false,
      isInJudgePool: true
    }])

    expect(buildRoleRosterRows(candidateUsers, roleAssignments, 'judge', '')).toEqual([{
      id: 'user-1',
      email: 'alpha@example.com',
      displayName: 'Alpha Admin',
      isPlatformAdmin: true,
      assignment: roleAssignments[0],
      isAssigned: false,
      isHackathonAdmin: true,
      isInJudgePool: false
    }, {
      id: 'user-4',
      email: 'delta@example.com',
      displayName: 'Delta Staff Reviewer',
      isPlatformAdmin: false,
      assignment: roleAssignments[2],
      isAssigned: true,
      isHackathonAdmin: true,
      isInJudgePool: true
    }, {
      id: 'user-2',
      email: 'bravo@example.com',
      displayName: 'Bravo Builder',
      isPlatformAdmin: false,
      assignment: null,
      isAssigned: false,
      isHackathonAdmin: false,
      isInJudgePool: false
    }, {
      id: 'user-3',
      email: 'charlie@example.com',
      displayName: 'Charlie Judge',
      isPlatformAdmin: false,
      assignment: roleAssignments[1],
      isAssigned: true,
      isHackathonAdmin: false,
      isInJudgePool: true
    }])
  })
})
