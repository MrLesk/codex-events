import type { H3Event } from 'h3'

import { and, asc, eq, inArray, isNull, like, or } from 'drizzle-orm'
import { z } from 'zod'

import { requirePlatformActor } from '../auth/actor'
import { assertTeamAdminAccess, resolveHackathonAuthorization, resolveTeamAuthorization } from '../auth/authorization'
import { getDatabase, type AppDatabase } from '../database/client'
import {
  teamJoinRequests,
  teamMembers,
  teams,
  userApplications,
  users
} from '../database/schema'
import type { hackathons } from '../database/schema'
import { ApiError } from './api-error'
import { requireApprovedUserForHackathon } from './applications'
import { assertAllowedState, assertGuard } from './lifecycle-guard'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from './hackathon-management'

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slugs must use lowercase letters, numbers, and hyphens only.')

const teamNameSchema = z.string().trim().min(1)

export const teamParamsSchema = routeIdParamsSchema.extend({
  teamId: z.string().trim().min(1)
})

export const teamMemberParamsSchema = teamParamsSchema.extend({
  userId: z.string().trim().min(1)
})

export const teamJoinRequestParamsSchema = routeIdParamsSchema.extend({
  requestId: z.string().trim().min(1)
})

export const listTeamsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional()
})

export const createTeamBodySchema = z.object({
  name: teamNameSchema,
  slug: slugSchema,
  isOpenToJoinRequests: z.coerce.boolean().default(true)
})

export const updateTeamBodySchema = z.object({
  name: teamNameSchema.optional(),
  slug: slugSchema.optional()
}).refine(
  input => Object.keys(input).length > 0,
  'At least one team field must be provided.'
)

export const updateJoinPolicyBodySchema = z.object({
  isOpenToJoinRequests: z.coerce.boolean()
})

export const createJoinRequestBodySchema = z.object({
  teamId: z.string().trim().min(1)
})

type HackathonRecord = typeof hackathons.$inferSelect
type TeamRecord = typeof teams.$inferSelect
type TeamMemberRecord = typeof teamMembers.$inferSelect
type TeamJoinRequestRecord = typeof teamJoinRequests.$inferSelect
type UserRecord = typeof users.$inferSelect

export function assertHackathonAllowsTeamFormation(hackathon: HackathonRecord) {
  assertAllowedState(hackathon.state, ['registration_open', 'submission_open'], {
    code: 'hackathon_state_invalid',
    message: 'Team formation is only available while registration or submission is open.',
    details: {
      hackathonId: hackathon.id,
      state: hackathon.state
    }
  })
}

export function isTeamFormationState(state: HackathonRecord['state']) {
  return state === 'registration_open' || state === 'submission_open'
}

export function serializeTeamMember(
  member: TeamMemberRecord,
  user?: UserRecord | null,
  options?: {
    includeSensitiveUserFields?: boolean
  }
) {
  const includeSensitiveUserFields = options?.includeSensitiveUserFields ?? true

  return {
    id: member.id,
    teamId: member.teamId,
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt,
    leftAt: member.leftAt,
    createdAt: member.createdAt,
    ...(user
      ? {
          user: {
            id: user.id,
            displayName: user.displayName,
            ...(includeSensitiveUserFields
              ? {
                  email: user.email,
                  xProfileUrl: user.xProfileUrl,
                  linkedinProfileUrl: user.linkedinProfileUrl,
                  githubProfileUrl: user.githubProfileUrl,
                  chatgptEmail: user.chatgptEmail,
                  openaiOrgId: user.openaiOrgId,
                  lumaUsername: user.lumaUsername
                }
              : {})
          }
        }
      : {})
  }
}

export function serializeTeam(
  team: TeamRecord,
  options?: {
    members?: Array<ReturnType<typeof serializeTeamMember>>
    activeMemberCount?: number
  }
) {
  return {
    id: team.id,
    hackathonId: team.hackathonId,
    name: team.name,
    slug: team.slug,
    isOpenToJoinRequests: team.isOpenToJoinRequests,
    createdByUserId: team.createdByUserId,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    ...(typeof options?.activeMemberCount === 'number'
      ? {
          activeMemberCount: options.activeMemberCount
        }
      : {}),
    ...(options?.members
      ? {
          members: options.members
        }
      : {})
  }
}

export function serializeTeamJoinRequest(
  request: TeamJoinRequestRecord,
  options?: {
    user?: UserRecord | null
  }
) {
  return {
    id: request.id,
    teamId: request.teamId,
    userId: request.userId,
    status: request.status,
    requestedAt: request.requestedAt,
    reviewedAt: request.reviewedAt,
    reviewedByUserId: request.reviewedByUserId,
    createdAt: request.createdAt,
    ...(options?.user
      ? {
          user: {
            id: options.user.id,
            email: options.user.email,
            displayName: options.user.displayName,
            xProfileUrl: options.user.xProfileUrl,
            linkedinProfileUrl: options.user.linkedinProfileUrl,
            githubProfileUrl: options.user.githubProfileUrl,
            chatgptEmail: options.user.chatgptEmail,
            openaiOrgId: options.user.openaiOrgId,
            lumaUsername: options.user.lumaUsername
          }
        }
      : {})
  }
}

export async function getUsersByIds(database: AppDatabase, userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, UserRecord>()
  }

  const relatedUsers = await database.query.users.findMany({
    where: and(
      inArray(users.id, userIds),
      isNull(users.deletedAt)
    )
  })

  return new Map(relatedUsers.map(user => [user.id, user]))
}

export async function getTeamOrThrow(database: AppDatabase, hackathonId: string, teamId: string) {
  const team = await database.query.teams.findFirst({
    where: and(
      eq(teams.id, teamId),
      eq(teams.hackathonId, hackathonId)
    )
  })

  if (!team) {
    throw new ApiError({
      statusCode: 404,
      code: 'team_not_found',
      message: 'The requested team was not found.',
      details: {
        hackathonId,
        teamId
      }
    })
  }

  return team
}

export async function getActiveTeamMembers(database: AppDatabase, teamId: string) {
  return await database.query.teamMembers.findMany({
    where: and(
      eq(teamMembers.teamId, teamId),
      isNull(teamMembers.leftAt)
    ),
    orderBy: [asc(teamMembers.createdAt)]
  })
}

export async function getActiveTeamMemberOrThrow(database: AppDatabase, teamId: string, userId: string) {
  const member = await database.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      isNull(teamMembers.leftAt)
    )
  })

  if (!member) {
    throw new ApiError({
      statusCode: 404,
      code: 'team_member_not_found',
      message: 'The requested team member was not found.',
      details: {
        teamId,
        userId
      }
    })
  }

  return member
}

export async function getOwnActiveTeamMembershipForHackathon(
  database: AppDatabase,
  hackathonId: string,
  userId: string
) {
  const memberships = await database.query.teamMembers.findMany({
    where: and(
      eq(teamMembers.userId, userId),
      isNull(teamMembers.leftAt)
    )
  })

  if (memberships.length === 0) {
    return null
  }

  const relatedTeams = await database.query.teams.findMany({
    where: inArray(teams.id, memberships.map(membership => membership.teamId))
  })

  const allowedTeamIds = new Set(
    relatedTeams
      .filter(team => team.hackathonId === hackathonId)
      .map(team => team.id)
  )

  return memberships.find(membership => allowedTeamIds.has(membership.teamId)) ?? null
}

export async function assertNoActiveTeamMembershipForHackathon(
  database: AppDatabase,
  hackathonId: string,
  userId: string
) {
  const membership = await getOwnActiveTeamMembershipForHackathon(database, hackathonId, userId)

  assertGuard(!membership, {
    code: 'team_membership_exists',
    message: 'A user can belong to at most one active team per hackathon.',
    details: {
      hackathonId,
      userId
    }
  })
}

export async function getOwnApplicationStatus(
  database: AppDatabase,
  hackathonId: string,
  userId: string
) {
  const application = await database.query.userApplications.findFirst({
    where: and(
      eq(userApplications.hackathonId, hackathonId),
      eq(userApplications.userId, userId)
    )
  })

  return application?.status ?? null
}

export async function assertTeamSlugAvailable(
  database: AppDatabase,
  hackathonId: string,
  slug: string,
  options?: {
    excludeTeamId?: string
  }
) {
  const existing = await database.query.teams.findFirst({
    where: and(
      eq(teams.hackathonId, hackathonId),
      eq(teams.slug, slug)
    )
  })

  assertGuard(!existing || existing.id === options?.excludeTeamId, {
    code: 'team_slug_exists',
    message: 'A team with this slug already exists in the hackathon.',
    details: {
      hackathonId,
      slug
    }
  })
}

export async function listVisibleTeams(
  database: AppDatabase,
  hackathonId: string,
  query: z.infer<typeof listTeamsQuerySchema>
) {
  const filters = [eq(teams.hackathonId, hackathonId)]

  if (query.search) {
    filters.push(or(
      like(teams.name, `%${query.search}%`),
      like(teams.slug, `%${query.search}%`)
    )!)
  }

  const allTeams = await database.query.teams.findMany({
    where: and(...filters),
    orderBy: [asc(teams.name), asc(teams.createdAt)]
  })

  const allMembers = allTeams.length > 0
    ? await database.query.teamMembers.findMany({
        where: and(
          inArray(teamMembers.teamId, allTeams.map(team => team.id)),
          isNull(teamMembers.leftAt)
        )
      })
    : []

  const counts = new Map<string, number>()

  for (const member of allMembers) {
    counts.set(member.teamId, (counts.get(member.teamId) ?? 0) + 1)
  }

  const start = (query.page - 1) * query.page_size
  const pagedTeams = allTeams.slice(start, start + query.page_size)

  return {
    data: pagedTeams.map(team => serializeTeam(team, {
      activeMemberCount: counts.get(team.id) ?? 0
    })),
    total: allTeams.length
  }
}

export async function getTeamWithMembersOrThrow(
  database: AppDatabase,
  hackathonId: string,
  teamId: string,
  options?: {
    includeSensitiveUserFields?: boolean
  }
) {
  const team = await getTeamOrThrow(database, hackathonId, teamId)
  const members = await getActiveTeamMembers(database, team.id)
  const usersById = await getUsersByIds(database, members.map(member => member.userId))

  return {
    team,
    members: members.map(member => serializeTeamMember(
      member,
      usersById.get(member.userId) ?? null,
      options
    ))
  }
}

export function assertTeamOpenToJoinRequests(team: TeamRecord) {
  assertGuard(team.isOpenToJoinRequests, {
    code: 'team_join_requests_closed',
    message: 'The team is not currently open to join requests.',
    details: {
      teamId: team.id
    }
  })
}

export async function assertTeamHasCapacity(
  database: AppDatabase,
  hackathon: HackathonRecord,
  teamId: string
) {
  const members = await getActiveTeamMembers(database, teamId)

  assertGuard(members.length < hackathon.maxTeamMembers, {
    code: 'team_capacity_reached',
    message: 'The team has reached the maximum member limit for the hackathon.',
    details: {
      teamId,
      hackathonId: hackathon.id,
      maxTeamMembers: hackathon.maxTeamMembers
    }
  })

  return members
}

export function assertPendingJoinRequestAllowed(
  request: TeamJoinRequestRecord | null,
  teamId: string,
  userId: string
) {
  assertGuard(!request, {
    code: 'team_join_request_exists',
    message: 'A pending join request already exists for this user and team.',
    details: {
      teamId,
      userId
    }
  })
}

export async function getPendingJoinRequestForUser(
  database: AppDatabase,
  teamId: string,
  userId: string
) {
  return await database.query.teamJoinRequests.findFirst({
    where: and(
      eq(teamJoinRequests.teamId, teamId),
      eq(teamJoinRequests.userId, userId),
      eq(teamJoinRequests.status, 'pending')
    )
  })
}

export async function getJoinRequestOrThrow(
  database: AppDatabase,
  hackathonId: string,
  requestId: string
) {
  const request = await database.query.teamJoinRequests.findFirst({
    where: eq(teamJoinRequests.id, requestId)
  })

  if (!request) {
    throw new ApiError({
      statusCode: 404,
      code: 'team_join_request_not_found',
      message: 'The requested team join request was not found.',
      details: {
        hackathonId,
        requestId
      }
    })
  }

  await getTeamOrThrow(database, hackathonId, request.teamId)

  return request
}

export function assertJoinRequestPending(request: TeamJoinRequestRecord) {
  assertAllowedState(request.status, ['pending'], {
    code: 'team_join_request_state_invalid',
    message: 'Only pending team join requests can be changed.',
    details: {
      requestId: request.id
    }
  })
}

export function assertTeamDiscoveryAllowed(
  hackathon: HackathonRecord,
  options: {
    isHackathonAdmin: boolean
    isTeamMember: boolean
    applicationStatus: Awaited<ReturnType<typeof getOwnApplicationStatus>>
  }
) {
  if (options.isHackathonAdmin || options.isTeamMember) {
    return
  }

  assertGuard(
    options.applicationStatus === 'approved' && isTeamFormationState(hackathon.state),
    {
      code: 'team_visibility_forbidden',
      message: 'This operation requires approved participation or team membership in the hackathon.',
      details: {
        hackathonId: hackathon.id,
        state: hackathon.state
      },
      statusCode: 403
    }
  )
}

export async function listTeamJoinRequests(database: AppDatabase, teamId: string) {
  const requests = await database.query.teamJoinRequests.findMany({
    where: eq(teamJoinRequests.teamId, teamId),
    orderBy: [asc(teamJoinRequests.createdAt)]
  })

  const usersById = await getUsersByIds(database, requests.map(request => request.userId))

  return requests.map(request => serializeTeamJoinRequest(request, {
    user: usersById.get(request.userId) ?? null
  }))
}

export async function assertRequestingUserApprovedForHackathon(
  database: AppDatabase,
  hackathonId: string,
  userId: string
) {
  const status = await getOwnApplicationStatus(database, hackathonId, userId)

  assertGuard(status === 'approved', {
    code: 'approved_user_required',
    message: 'This operation requires an approved application for the hackathon.',
    details: {
      hackathonId,
      userId
    },
    statusCode: 403
  })
}

export function assertLeaveOrRemovalAllowed(
  hackathon: HackathonRecord,
  members: TeamMemberRecord[],
  targetMember: TeamMemberRecord
) {
  if (targetMember.role === 'admin') {
    const otherActiveAdmins = members.filter(member =>
      member.id !== targetMember.id
      && member.role === 'admin'
      && member.leftAt === null
    )

    assertGuard(otherActiveAdmins.length > 0, {
      code: 'team_admin_required',
      message: 'Active teams must retain at least one active team admin.',
      details: {
        teamId: targetMember.teamId
      }
    })
  }

  if (!['registration_open', 'submission_open'].includes(hackathon.state)) {
    const otherActiveMembers = members.filter(member =>
      member.id !== targetMember.id
      && member.leftAt === null
    )

    assertGuard(otherActiveMembers.length > 0, {
      code: 'team_member_required',
      message: 'Teams must retain at least one active member after submission closes.',
      details: {
        teamId: targetMember.teamId,
        hackathonId: hackathon.id
      }
    })
  }
}

export async function requireTeamVisibilityContext(event: H3Event, hackathonId: string) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const hackathonAuthorization = await resolveHackathonAuthorization(event, hackathonId)

  if (hackathonAuthorization.isHackathonAdmin) {
    return { actor, database, hackathon, hackathonAuthorization }
  }

  const applicationStatus = await getOwnApplicationStatus(database, hackathonId, actor.platformUser.id)
  const membership = await getOwnActiveTeamMembershipForHackathon(database, hackathonId, actor.platformUser.id)

  assertTeamDiscoveryAllowed(hackathon, {
    isHackathonAdmin: hackathonAuthorization.isHackathonAdmin,
    isTeamMember: Boolean(membership),
    applicationStatus
  })

  return {
    actor,
    database,
    hackathon,
    hackathonAuthorization,
    applicationStatus,
    membership
  }
}

export async function requireTeamFormationApprovedContext(event: H3Event, hackathonId: string) {
  const { actor, hackathon, application } = await requireApprovedUserForHackathon(event, hackathonId)
  assertHackathonAllowsTeamFormation(hackathon)

  return {
    actor,
    hackathon,
    application,
    database: getDatabase(event)
  }
}

export async function requireTeamAdminContext(event: H3Event, hackathonId: string, teamId: string) {
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const team = await getTeamOrThrow(database, hackathonId, teamId)
  const teamAuthorization = await resolveTeamAuthorization(event, teamId)

  assertTeamAdminAccess(teamAuthorization)

  return {
    database,
    hackathon,
    team,
    teamAuthorization
  }
}
