import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { getRequestActor } from '../../../../server/auth/actor'
import {
  resolveHackathonAuthorization,
  resolveJudgeAssignmentAuthorization,
  resolveTeamAuthorization
} from '../../../../server/auth/authorization'
import {
  hackathonRoleAssignments,
  hackathons,
  judgeAssignments,
  submissions,
  teamMembers,
  teams,
  users
} from '../../../../server/database/schema'
import { createBackendTestEvent, fixtureTimestamp } from '../../../support/backend/runtime'

describe('backend integration foundation', () => {
  const d1Databases: Array<ReturnType<typeof createBackendTestEvent>['d1Database']> = []

  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()

    while (d1Databases.length > 0) {
      d1Databases.pop()?.close()
    }
  })

  test('resolves actors and authorization against the real Drizzle query layer', async () => {
    const { event, d1Database, database } = createBackendTestEvent({
      sessionUser: {
        sub: 'auth0|judge',
        email: 'judge@example.com',
        name: 'Judge Persona'
      }
    })
    d1Databases.push(d1Database)
    const now = fixtureTimestamp()

    await database.insert(users).values([
      {
        id: 'user_platform_admin',
        auth0Subject: 'auth0|platform_admin',
        email: 'platform-admin@example.com',
        displayName: 'Platform Admin',
        isPlatformAdmin: true
      },
      {
        id: 'user_judge',
        auth0Subject: 'auth0|judge',
        email: 'judge@example.com',
        displayName: 'Judge Persona'
      },
      {
        id: 'user_hackathon_admin',
        auth0Subject: 'auth0|hackathon_admin',
        email: 'hackathon-admin@example.com',
        displayName: 'Hackathon Admin'
      }
    ])

    await database.insert(hackathons).values({
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
      createdByUserId: 'user_platform_admin'
    })

    await database.insert(hackathonRoleAssignments).values([
      {
        id: 'role_admin',
        hackathonId: 'hackathon_1',
        userId: 'user_hackathon_admin',
        role: 'hackathon_admin',
        isInJudgePool: false,
        createdAt: now
      },
      {
        id: 'role_judge',
        hackathonId: 'hackathon_1',
        userId: 'user_judge',
        role: 'judge',
        isInJudgePool: true,
        createdAt: now
      }
    ])

    await database.insert(teams).values({
      id: 'team_1',
      hackathonId: 'hackathon_1',
      name: 'Team One',
      slug: 'team-one',
      createdByUserId: 'user_judge'
    })

    await database.insert(teamMembers).values({
      id: 'team_member_1',
      teamId: 'team_1',
      userId: 'user_judge',
      role: 'admin',
      joinedAt: now,
      createdAt: now
    })

    await database.insert(submissions).values({
      id: 'submission_1',
      teamId: 'team_1',
      status: 'submitted',
      projectName: 'Project One',
      submittedAt: now
    })

    await database.insert(judgeAssignments).values({
      id: 'assignment_1',
      hackathonId: 'hackathon_1',
      submissionId: 'submission_1',
      judgeUserId: 'user_judge',
      status: 'assigned',
      assignedAt: now
    })

    const actor = await getRequestActor(event)
    const hackathonAuthorization = await resolveHackathonAuthorization(event, 'hackathon_1')
    const teamAuthorization = await resolveTeamAuthorization(event, 'team_1')
    const assignmentAuthorization = await resolveJudgeAssignmentAuthorization(event, 'assignment_1')

    expect(actor).toMatchObject({
      kind: 'platform_user',
      platformUser: {
        id: 'user_judge'
      }
    })
    expect(hackathonAuthorization).toMatchObject({
      explicitRole: 'judge',
      canReviewThroughAssignment: true,
      isInJudgePool: true
    })
    expect(teamAuthorization).toMatchObject({
      isTeamAdmin: true
    })
    expect(assignmentAuthorization).toMatchObject({
      actingRole: 'assigned_judge',
      visibility: 'blind'
    })
  })
})
