import type { H3Event } from 'h3'

import { and, asc, count, eq, getTableColumns, inArray, isNull, like, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import { requirePlatformActor } from '#server/auth/actor'
import { assertTeamAdminAccess, resolveHackathonAuthorization, resolveTeamAuthorization } from '#server/auth/authorization'
import { getDatabase, type AppDatabase } from '#server/database/client'
import {
  submissions,
  teamJoinRequests,
  teamMembers,
  teamWorkspaceModes,
  teams,
  userApplications,
  users
} from '#server/database/schema'
import type { hackathons } from '#server/database/schema'
import { ApiError } from '#server/http/api-error'
import { requireApprovedUserForHackathon } from '#server/domains/applications'
import { assertAllowedState, assertGuard } from './lifecycle-guard'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from './hackathon-management'

const teamNameSchema = z.string().trim().min(1)
const teamBioSchema = z.string().trim().max(4000)
const d1LookupBatchSize = 75

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
  slug: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  open_to_join: z.coerce.boolean().optional(),
  has_capacity: z.coerce.boolean().optional(),
  workspace_mode: z.enum(teamWorkspaceModes).optional(),
  member_count: z.enum(['multi_person', 'full']).optional()
})

export const createTeamBodySchema = z.object({
  name: teamNameSchema,
  bio: teamBioSchema.optional(),
  workspaceMode: z.enum(teamWorkspaceModes).default('team'),
  isOpenToJoinRequests: z.coerce.boolean().default(true)
})

export const updateTeamBodySchema = z.object({
  name: teamNameSchema.optional(),
  bio: teamBioSchema.optional()
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

export const visibleTeamDirectoryFilterValues = ['all', 'open_to_join', 'solo', 'multi_person', 'full'] as const

export type VisibleTeamDirectoryFilter = typeof visibleTeamDirectoryFilterValues[number]
export type VisibleTeamDirectoryFilterCounts = Record<VisibleTeamDirectoryFilter, number>

type HackathonRecord = typeof hackathons.$inferSelect
type TeamRecord = typeof teams.$inferSelect
type TeamMemberRecord = typeof teamMembers.$inferSelect
type TeamJoinRequestRecord = typeof teamJoinRequests.$inferSelect
type UserRecord = typeof users.$inferSelect

export function createTeamSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

function createTeamSlugSuffix() {
  const randomBytes = new Uint16Array(1)
  crypto.getRandomValues(randomBytes)
  return ((randomBytes[0] ?? 0) % 10_000).toString().padStart(4, '0')
}

export async function resolveAvailableTeamSlug(database: AppDatabase, hackathonId: string, name: string) {
  const baseSlug = createTeamSlug(name)

  assertGuard(baseSlug.length > 0, {
    code: 'team_slug_invalid',
    message: 'Team names must include at least one letter or number.',
    details: {
      hackathonId,
      name
    },
    statusCode: 400
  })

  while (true) {
    const candidateSlug = `${baseSlug}-${createTeamSlugSuffix()}`
    const existingTeam = await database.query.teams.findFirst({
      where: and(
        eq(teams.hackathonId, hackathonId),
        eq(teams.slug, candidateSlug)
      )
    })

    if (!existingTeam) {
      return candidateSlug
    }
  }
}

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
    bio: team.bio,
    slug: team.slug,
    workspaceMode: team.workspaceMode,
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
  const uniqueUserIds = [...new Set(userIds)]

  if (uniqueUserIds.length === 0) {
    return new Map<string, UserRecord>()
  }

  const relatedUsers = (
    await Promise.all(
      chunkValues(uniqueUserIds, d1LookupBatchSize).map(userIdBatch =>
        database.query.users.findMany({
          where: and(
            inArray(users.id, userIdBatch),
            isNull(users.deletedAt)
          )
        })
      )
    )
  ).flat()

  return new Map(relatedUsers.map(user => [user.id, user]))
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
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

export function isTeamDissolved(members: TeamMemberRecord[] | Array<{ leftAt: string | null }>) {
  return members.every(member => member.leftAt !== null) || members.length === 0
}

export async function getActiveSubmissionForTeam(database: AppDatabase, teamId: string) {
  return await database.query.submissions.findFirst({
    where: and(
      eq(submissions.teamId, teamId),
      inArray(submissions.status, ['draft', 'submitted', 'locked'])
    )
  })
}

export async function assertTeamActiveForFormation(database: AppDatabase, teamId: string) {
  const members = await getActiveTeamMembers(database, teamId)

  assertGuard(!isTeamDissolved(members), {
    code: 'team_inactive',
    message: 'This team is no longer active.',
    details: {
      teamId
    },
    statusCode: 409
  })

  return members
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
  const [membership] = await database
    .select(getTableColumns(teamMembers))
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(
      eq(teams.hackathonId, hackathonId),
      eq(teamMembers.userId, userId),
      isNull(teamMembers.leftAt)
    ))
    .limit(1)

  return membership ?? null
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

export async function listVisibleTeams(
  database: AppDatabase,
  hackathon: HackathonRecord,
  hackathonId: string,
  query: z.infer<typeof listTeamsQuerySchema>,
  options?: {
    includeInactiveTeams?: boolean
  }
) {
  const filters = [eq(teams.hackathonId, hackathonId)]

  if (query.slug) {
    filters.push(eq(teams.slug, query.slug))
  }

  if (query.search) {
    filters.push(or(
      like(teams.name, `%${query.search}%`),
      like(teams.slug, `%${query.search}%`)
    )!)
  }
  const includeInactiveTeams = options?.includeInactiveTeams ?? false
  const baseWhere = and(...filters)
  const activeMemberCounts = database
    .select({
      teamId: teamMembers.teamId,
      activeMemberCount: count(teamMembers.id).as('active_member_count')
    })
    .from(teamMembers)
    .where(isNull(teamMembers.leftAt))
    .groupBy(teamMembers.teamId)
    .as('active_member_counts')
  const activeMemberCountSql = sql<number>`coalesce(${activeMemberCounts.activeMemberCount}, 0)`
  const activeVisibilityWhere = includeInactiveTeams ? undefined : sql`${activeMemberCountSql} > 0`
  const filteredWhere = and(
    baseWhere,
    activeVisibilityWhere,
    query.workspace_mode ? eq(teams.workspaceMode, query.workspace_mode) : undefined,
    typeof query.open_to_join === 'boolean' ? eq(teams.isOpenToJoinRequests, query.open_to_join) : undefined,
    typeof query.has_capacity === 'boolean'
      ? (query.has_capacity
          ? sql`${activeMemberCountSql} < ${hackathon.maxTeamMembers}`
          : sql`${activeMemberCountSql} >= ${hackathon.maxTeamMembers}`)
      : undefined,
    query.member_count === 'multi_person' ? sql`${activeMemberCountSql} > 1` : undefined,
    query.member_count === 'full' ? sql`${activeMemberCountSql} >= ${hackathon.maxTeamMembers}` : undefined
  )

  const pagedTeams = await database
    .select({
      ...getTableColumns(teams),
      activeMemberCount: activeMemberCountSql.as('active_member_count')
    })
    .from(teams)
    .leftJoin(activeMemberCounts, eq(teams.id, activeMemberCounts.teamId))
    .where(filteredWhere)
    .orderBy(asc(teams.name), asc(teams.createdAt))
    .limit(query.page_size)
    .offset((query.page - 1) * query.page_size)

  const totalRows = await database
    .select({ total: count() })
    .from(teams)
    .leftJoin(activeMemberCounts, eq(teams.id, activeMemberCounts.teamId))
    .where(filteredWhere)

  const [filterCountRow] = await database
    .select({
      all: count(),
      open_to_join: sql<number>`coalesce(sum(case when ${teams.isOpenToJoinRequests} = 1 and ${activeMemberCountSql} < ${hackathon.maxTeamMembers} then 1 else 0 end), 0)`,
      solo: sql<number>`coalesce(sum(case when ${teams.workspaceMode} = 'solo' then 1 else 0 end), 0)`,
      multi_person: sql<number>`coalesce(sum(case when ${teams.workspaceMode} = 'team' then 1 else 0 end), 0)`,
      full: sql<number>`coalesce(sum(case when ${activeMemberCountSql} >= ${hackathon.maxTeamMembers} then 1 else 0 end), 0)`
    })
    .from(teams)
    .leftJoin(activeMemberCounts, eq(teams.id, activeMemberCounts.teamId))
    .where(and(baseWhere, activeVisibilityWhere))

  const filterCounts: VisibleTeamDirectoryFilterCounts = {
    all: filterCountRow?.all ?? 0,
    open_to_join: filterCountRow?.open_to_join ?? 0,
    solo: filterCountRow?.solo ?? 0,
    multi_person: filterCountRow?.multi_person ?? 0,
    full: filterCountRow?.full ?? 0
  }

  return {
    data: pagedTeams.map(team => serializeTeam(team, {
      activeMemberCount: team.activeMemberCount
    })),
    total: totalRows[0]?.total ?? 0,
    filterCounts
  }
}

export async function getTeamWithMembersOrThrow(
  database: AppDatabase,
  hackathonId: string,
  teamId: string,
  options?: {
    includeSensitiveUserFields?: boolean
    allowInactiveTeam?: boolean
  }
) {
  const team = await getTeamOrThrow(database, hackathonId, teamId)
  const members = await getActiveTeamMembers(database, team.id)

  if (!options?.allowInactiveTeam && isTeamDissolved(members)) {
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
    options.applicationStatus === 'approved',
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

  const requestUsers = await database
    .select(getTableColumns(users))
    .from(users)
    .innerJoin(teamJoinRequests, eq(teamJoinRequests.userId, users.id))
    .where(eq(teamJoinRequests.teamId, teamId))
  const usersById = new Map(requestUsers.map(user => [user.id, user] as const))

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

export async function assertLeaveOrRemovalAllowed(
  database: AppDatabase,
  hackathon: HackathonRecord,
  members: TeamMemberRecord[],
  targetMember: TeamMemberRecord
) {
  const remainingActiveMembers = members.filter(member =>
    member.id !== targetMember.id
    && member.leftAt === null
  )

  if (remainingActiveMembers.length === 0) {
    assertGuard(['registration_open', 'submission_open'].includes(hackathon.state), {
      code: 'team_member_required',
      message: 'Teams must retain at least one active member after submission closes.',
      details: {
        teamId: targetMember.teamId,
        hackathonId: hackathon.id
      }
    })

    const activeSubmission = await getActiveSubmissionForTeam(database, targetMember.teamId)

    assertGuard(!activeSubmission, {
      code: 'team_submission_active',
      message: 'You cannot leave the last active member of a team that still has an active submission.',
      details: {
        teamId: targetMember.teamId,
        hackathonId: hackathon.id,
        submissionId: activeSubmission?.id ?? null,
        submissionStatus: activeSubmission?.status ?? null
      }
    })

    return {
      teamDissolved: true
    }
  }

  if (targetMember.role === 'admin') {
    const otherActiveAdmins = remainingActiveMembers.filter(member =>
      member.role === 'admin'
    )

    assertGuard(otherActiveAdmins.length > 0, {
      code: 'team_admin_required',
      message: 'Active teams must retain at least one active team admin.',
      details: {
        teamId: targetMember.teamId
      }
    })
  }

  return {
    teamDissolved: false
  }
}

export async function requireTeamVisibilityContext(event: H3Event, hackathonId: string) {
  const actor = await requirePlatformActor(event)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const hackathonAuthorization = await resolveHackathonAuthorization(event, hackathonId)

  if (hackathonAuthorization.canViewParticipantsAndTeams) {
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
