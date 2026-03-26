import type { H3Event } from 'h3'

import { and, eq, isNull } from 'drizzle-orm'

import { getDatabase } from '../database/client'
import { hackathonRoleAssignments, judgeAssignments, teamMembers } from '../database/schema'
import { ApiError } from '../utils/api-error'
import {
  getRequestActor,
  type PlatformActor
} from './actor'

export interface HackathonAuthorization {
  hackathonId: string
  isPlatformAdmin: boolean
  explicitRole: 'hackathon_admin' | 'judge' | null
  isHackathonAdmin: boolean
  canReviewThroughAssignment: boolean
  isInJudgePool: boolean
}

export interface TeamAuthorization {
  teamId: string
  role: 'member' | 'admin' | null
  isTeamMember: boolean
  isTeamAdmin: boolean
}

export interface JudgeAssignmentAuthorization {
  assignmentId: string
  hackathonId: string
  assignedJudgeUserId: string
  actingRole: 'assigned_judge' | 'admin_via_assignment' | null
  canAccess: boolean
  visibility: 'blind' | 'forbidden'
}

function requireResolvedPlatformActor(actor: Awaited<ReturnType<typeof getRequestActor>>): PlatformActor {
  if (actor.kind === 'platform_user') {
    return actor
  }

  throw new ApiError({
    statusCode: actor.kind === 'anonymous' ? 401 : 403,
    code: actor.kind === 'anonymous' ? 'unauthenticated' : 'platform_account_required',
    message: actor.kind === 'anonymous'
      ? 'This operation requires an authenticated session.'
      : 'This operation requires a platform account.'
  })
}

export async function resolveHackathonAuthorization(
  event: H3Event,
  hackathonId: string
): Promise<HackathonAuthorization> {
  const actor = requireResolvedPlatformActor(await getRequestActor(event))

  if (actor.platformUser.isPlatformAdmin) {
    return {
      hackathonId,
      isPlatformAdmin: true,
      explicitRole: 'hackathon_admin',
      isHackathonAdmin: true,
      canReviewThroughAssignment: true,
      isInJudgePool: false
    }
  }

  const database = getDatabase(event)
  const assignment = await database.query.hackathonRoleAssignments.findFirst({
    where: and(
      eq(hackathonRoleAssignments.hackathonId, hackathonId),
      eq(hackathonRoleAssignments.userId, actor.platformUser.id)
    )
  })

  const explicitRole = assignment?.role ?? null
  const isHackathonAdmin = explicitRole === 'hackathon_admin'

  return {
    hackathonId,
    isPlatformAdmin: false,
    explicitRole,
    isHackathonAdmin,
    canReviewThroughAssignment: isHackathonAdmin || explicitRole === 'judge',
    isInJudgePool: assignment?.isInJudgePool ?? false
  }
}

export function assertHackathonAdminAccess(authorization: HackathonAuthorization) {
  if (authorization.isHackathonAdmin) {
    return
  }

  throw new ApiError({
    statusCode: 403,
    code: 'hackathon_admin_required',
    message: 'This operation requires hackathon admin access.',
    details: { hackathonId: authorization.hackathonId }
  })
}

export function assertPlatformAdminAccess(actor: PlatformActor) {
  if (actor.platformUser.isPlatformAdmin) {
    return
  }

  throw new ApiError({
    statusCode: 403,
    code: 'platform_admin_required',
    message: 'This operation requires platform admin access.',
    details: {
      userId: actor.platformUser.id
    }
  })
}

export async function resolveTeamAuthorization(
  event: H3Event,
  teamId: string
): Promise<TeamAuthorization> {
  const actor = requireResolvedPlatformActor(await getRequestActor(event))
  const database = getDatabase(event)

  const membership = await database.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, actor.platformUser.id),
      isNull(teamMembers.leftAt)
    )
  })

  return {
    teamId,
    role: membership?.role ?? null,
    isTeamMember: Boolean(membership),
    isTeamAdmin: membership?.role === 'admin'
  }
}

export function assertTeamAdminAccess(authorization: TeamAuthorization) {
  if (authorization.isTeamAdmin) {
    return
  }

  throw new ApiError({
    statusCode: 403,
    code: 'team_admin_required',
    message: 'This operation requires team admin access.',
    details: { teamId: authorization.teamId }
  })
}

export async function resolveJudgeAssignmentAuthorization(
  event: H3Event,
  assignmentId: string
): Promise<JudgeAssignmentAuthorization> {
  const actor = requireResolvedPlatformActor(await getRequestActor(event))
  const database = getDatabase(event)

  const assignment = await database.query.judgeAssignments.findFirst({
    where: eq(judgeAssignments.id, assignmentId)
  })

  if (!assignment) {
    throw new ApiError({
      statusCode: 404,
      code: 'judge_assignment_not_found',
      message: 'The requested judge assignment was not found.',
      details: { assignmentId }
    })
  }

  const hackathonAuthorization = await resolveHackathonAuthorization(event, assignment.hackathonId)
  const isAssignedJudge = assignment.judgeUserId === actor.platformUser.id
  const isAdminReviewer = !isAssignedJudge && hackathonAuthorization.isHackathonAdmin

  return {
    assignmentId,
    hackathonId: assignment.hackathonId,
    assignedJudgeUserId: assignment.judgeUserId,
    actingRole: isAssignedJudge ? 'assigned_judge' : isAdminReviewer ? 'admin_via_assignment' : null,
    canAccess: isAssignedJudge || isAdminReviewer,
    visibility: isAssignedJudge || isAdminReviewer ? 'blind' : 'forbidden'
  }
}

export function assertBlindJudgeAssignmentAccess(authorization: JudgeAssignmentAuthorization) {
  if (authorization.canAccess && authorization.visibility === 'blind') {
    return
  }

  throw new ApiError({
    statusCode: 403,
    code: 'judge_assignment_access_denied',
    message: 'This operation requires blind-review access to the judge assignment.',
    details: {
      assignmentId: authorization.assignmentId,
      visibility: authorization.visibility
    }
  })
}
