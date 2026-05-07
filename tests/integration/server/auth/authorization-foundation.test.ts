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
  platformDocuments,
  submissions,
  teamMembers,
  teams,
  userPlatformDocumentAcceptances,
  users
} from '../../../../server/database/schema'
import { createBackendTestEvent, fixtureTimestamp } from '../../../support/backend/runtime'

describe('backend integration foundation', () => {
  const d1Databases: Array<ReturnType<typeof createBackendTestEvent>['d1Database']> = []

  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (d1Databases.length > 0) {
      await d1Databases.pop()?.close()
    }
  })

  async function seedCurrentPlatformConsent(
    database: ReturnType<typeof createBackendTestEvent>['database'],
    userId: string
  ) {
    await database.insert(platformDocuments).values([
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
    await database.insert(userPlatformDocumentAcceptances).values([
      {
        id: `${userId}_privacy_acceptance`,
        userId,
        platformDocumentId: 'privacy_v1',
        acceptedAt: '2026-03-03T00:00:00.000Z'
      },
      {
        id: `${userId}_terms_acceptance`,
        userId,
        platformDocumentId: 'terms_v1',
        acceptedAt: '2026-03-03T00:00:00.000Z'
      }
    ])
  }

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
      },
      {
        id: 'user_staff',
        auth0Subject: 'auth0|staff',
        email: 'staff@example.com',
        displayName: 'Staff Persona'
      }
    ])
    await seedCurrentPlatformConsent(database, 'user_judge')

    await database.insert(hackathons).values({
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
      createdByUserId: 'user_platform_admin'
    })

    await database.insert(hackathonRoleAssignments).values([
      {
        id: 'role_admin',
        hackathonId: 'hackathon_1',
        userId: 'user_hackathon_admin',
        role: 'hackathon_admin',
        isInJudgePool: false,
        isStaff: false,
        createdAt: now
      },
      {
        id: 'role_judge',
        hackathonId: 'hackathon_1',
        userId: 'user_judge',
        role: 'judge',
        isInJudgePool: true,
        isStaff: false,
        createdAt: now
      },
      {
        id: 'role_staff',
        hackathonId: 'hackathon_1',
        userId: 'user_staff',
        role: 'staff',
        isInJudgePool: false,
        isStaff: true,
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
      isInJudgePool: true,
      isStaff: false,
      canViewParticipantsAndTeams: false
    })
    expect(teamAuthorization).toMatchObject({
      isTeamAdmin: true
    })
    expect(assignmentAuthorization).toMatchObject({
      actingRole: 'assigned_judge',
      visibility: 'blind'
    })
  })

  test('resolves explicit staff authorization against the real Drizzle query layer', async () => {
    const { event, d1Database, database } = createBackendTestEvent({
      sessionUser: {
        sub: 'auth0|staff',
        email: 'staff@example.com',
        name: 'Staff Persona'
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
        id: 'user_staff',
        auth0Subject: 'auth0|staff',
        email: 'staff@example.com',
        displayName: 'Staff Persona'
      }
    ])
    await seedCurrentPlatformConsent(database, 'user_staff')

    await database.insert(hackathons).values({
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
      createdByUserId: 'user_platform_admin'
    })

    await database.insert(hackathonRoleAssignments).values({
      id: 'role_staff',
      hackathonId: 'hackathon_1',
      userId: 'user_staff',
      role: 'staff',
      isInJudgePool: false,
      isStaff: true,
      createdAt: now
    })

    await expect(resolveHackathonAuthorization(event, 'hackathon_1')).resolves.toMatchObject({
      explicitRole: 'staff',
      isHackathonAdmin: false,
      canReviewThroughAssignment: false,
      isInJudgePool: false,
      isStaff: true,
      canViewParticipantsAndTeams: true
    })
  })
})
