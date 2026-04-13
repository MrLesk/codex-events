import type { H3Event } from 'h3'

import { and, eq, isNull } from 'drizzle-orm'

import { getDatabase } from '../database/client'
import { hackathonRoleAssignments, judgeAssignments, teamMembers } from '../database/schema'
import { ApiError } from '../utils/api-error'
import {
  assertRegularPlatformAccess,
  getRequestActor,
  type PlatformActor
} from './actor'

export interface HackathonAuthorization {
  hackathonId: string
  isPlatformAdmin: boolean
  explicitRole: 'hackathon_admin' | 'judge' | 'staff' | null
  isHackathonAdmin: boolean
  canReviewThroughAssignment: boolean
  isInJudgePool: boolean
  isStaff: boolean
  canViewParticipantsAndTeams: boolean
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
  actingRole: 'assigned_judge' | null
  canAccess: boolean
  visibility: 'blind' | 'pitch' | 'forbidden'
}

function requireResolvedPlatformActor(actor: Awaited<ReturnType<typeof getRequestActor>>): PlatformActor {
  assertRegularPlatformAccess(actor)
  return actor
}

function getHackathonAuthorizationCache(event: H3Event) {
  event.context.hackathonAuthorizationByHackathonId ??= new Map()
  return event.context.hackathonAuthorizationByHackathonId
}

function getTeamAuthorizationCache(event: H3Event) {
  event.context.teamAuthorizationByTeamId ??= new Map()
  return event.context.teamAuthorizationByTeamId
}

function getJudgeAssignmentAuthorizationCache(event: H3Event) {
  event.context.judgeAssignmentAuthorizationByAssignmentId ??= new Map()
  return event.context.judgeAssignmentAuthorizationByAssignmentId
}

export async function resolveHackathonAuthorization(
  event: H3Event,
  hackathonId: string
): Promise<HackathonAuthorization> {
  const cache = getHackathonAuthorizationCache(event)

  if (!cache.has(hackathonId)) {
    cache.set(hackathonId, (async () => {
      const actor = requireResolvedPlatformActor(await getRequestActor(event))

      if (actor.platformUser.isPlatformAdmin) {
        return {
          hackathonId,
          isPlatformAdmin: true,
          explicitRole: 'hackathon_admin',
          isHackathonAdmin: true,
          canReviewThroughAssignment: false,
          isInJudgePool: false,
          isStaff: false,
          canViewParticipantsAndTeams: true
        } satisfies HackathonAuthorization
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
      const isInJudgePool = assignment?.isInJudgePool ?? false
      const isStaff = assignment?.isStaff ?? false

      return {
        hackathonId,
        isPlatformAdmin: false,
        explicitRole,
        isHackathonAdmin,
        canReviewThroughAssignment: explicitRole === 'judge' || (isHackathonAdmin && isInJudgePool),
        isInJudgePool,
        isStaff,
        canViewParticipantsAndTeams: isHackathonAdmin || isStaff
      } satisfies HackathonAuthorization
    })())
  }

  return await cache.get(hackathonId)!
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

export function assertHackathonParticipantVisibilityAccess(authorization: HackathonAuthorization) {
  if (authorization.canViewParticipantsAndTeams) {
    return
  }

  throw new ApiError({
    statusCode: 403,
    code: 'hackathon_participant_visibility_required',
    message: 'This operation requires hackathon participant visibility access.',
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
  const cache = getTeamAuthorizationCache(event)

  if (!cache.has(teamId)) {
    cache.set(teamId, (async () => {
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
      } satisfies TeamAuthorization
    })())
  }

  return await cache.get(teamId)!
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
  const cache = getJudgeAssignmentAuthorizationCache(event)

  if (!cache.has(assignmentId)) {
    cache.set(assignmentId, (async () => {
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

      const isAssignedJudge = assignment.judgeUserId === actor.platformUser.id

      return {
        assignmentId,
        hackathonId: assignment.hackathonId,
        assignedJudgeUserId: assignment.judgeUserId,
        actingRole: isAssignedJudge ? 'assigned_judge' : null,
        canAccess: isAssignedJudge,
        visibility: isAssignedJudge
          ? assignment.reviewStage === 'pitch_review'
            ? 'pitch'
            : 'blind'
          : 'forbidden'
      } satisfies JudgeAssignmentAuthorization
    })())
  }

  return await cache.get(assignmentId)!
}

export function assertJudgeAssignmentAccess(authorization: JudgeAssignmentAuthorization) {
  if (authorization.canAccess && authorization.visibility !== 'forbidden') {
    return
  }

  throw new ApiError({
    statusCode: 403,
    code: 'judge_assignment_access_denied',
    message: 'This operation requires review access to the judge assignment.',
    details: {
      assignmentId: authorization.assignmentId,
      visibility: authorization.visibility
    }
  })
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
