import { and, asc, count, desc, eq, isNull, like, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import { buildAuditLogInsert } from '#server/database/audit-log'
import type { AppDatabase } from '#server/database/client'
import {
  hackathonRoleAssignments,
  users
} from '#server/database/schema'
import {
  getActiveUserOrThrow,
  serializeHackathonRoleUserSummary
} from '#server/domains/hackathons'

export const listPlatformAdminCandidatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional()
})

export const platformAdminUserParamsSchema = z.object({
  userId: z.string().trim().min(1)
})

interface PlatformAdminGrantState {
  userIsPlatformAdmin: boolean
  missingHackathonAdminAssignmentHackathonIds: string[]
  nonAdminHackathonAssignments: Array<{
    assignmentId: string
    hackathonId: string
    role: typeof hackathonRoleAssignments.$inferSelect.role
    isInJudgePool: boolean
    isStaff: boolean
  }>
}

export async function listPlatformAdmins(database: AppDatabase) {
  const items = await database.query.users.findMany({
    where: and(
      eq(users.isPlatformAdmin, true),
      isNull(users.deletedAt)
    ),
    orderBy: [
      asc(users.displayName),
      asc(users.email),
      asc(users.id)
    ]
  })

  return {
    items,
    total: items.length
  }
}

export async function listPlatformAdminCandidates(
  database: AppDatabase,
  input: z.infer<typeof listPlatformAdminCandidatesQuerySchema>
) {
  const filters = [isNull(users.deletedAt)]

  if (input.search) {
    filters.push(or(
      like(users.displayName, `%${input.search}%`),
      like(users.email, `%${input.search}%`),
      like(users.id, `%${input.search}%`)
    )!)
  }

  const where = and(...filters)
  const orderBy = [
    desc(sql<number>`case when ${users.isPlatformAdmin} then 1 else 0 end`),
    asc(users.displayName),
    asc(users.email),
    asc(users.id)
  ]

  const items = await database
    .select()
    .from(users)
    .where(where)
    .orderBy(...orderBy)
    .limit(input.page_size)
    .offset((input.page - 1) * input.page_size)

  const totalRows = await database
    .select({ total: count() })
    .from(users)
    .where(where)

  return {
    items,
    total: totalRows[0]?.total ?? 0,
    page: input.page,
    pageSize: input.page_size
  }
}

export async function assessPlatformAdminGrantState(
  database: AppDatabase,
  userId: string
): Promise<PlatformAdminGrantState> {
  const [hackathonRows, assignmentRows, user] = await Promise.all([
    database.query.hackathons.findMany({
      columns: {
        id: true
      }
    }),
    database.query.hackathonRoleAssignments.findMany({
      where: eq(hackathonRoleAssignments.userId, userId),
      columns: {
        id: true,
        hackathonId: true,
        role: true,
        isInJudgePool: true,
        isStaff: true
      }
    }),
    database.query.users.findFirst({
      columns: {
        isPlatformAdmin: true
      },
      where: and(eq(users.id, userId), isNull(users.deletedAt))
    })
  ])

  if (!user) {
    await getActiveUserOrThrow(database, userId)
  }

  const assignmentByHackathonId = new Map(
    assignmentRows.map(assignment => [assignment.hackathonId, assignment] as const)
  )

  const missingHackathonAdminAssignmentHackathonIds: string[] = []
  const nonAdminHackathonAssignments: PlatformAdminGrantState['nonAdminHackathonAssignments'] = []

  for (const hackathon of hackathonRows) {
    const assignment = assignmentByHackathonId.get(hackathon.id)

    if (!assignment) {
      missingHackathonAdminAssignmentHackathonIds.push(hackathon.id)
      continue
    }

    if (assignment.role !== 'hackathon_admin') {
      nonAdminHackathonAssignments.push({
        assignmentId: assignment.id,
        hackathonId: assignment.hackathonId,
        role: assignment.role,
        isInJudgePool: assignment.isInJudgePool,
        isStaff: assignment.isStaff
      })
    }
  }

  return {
    userIsPlatformAdmin: user?.isPlatformAdmin ?? false,
    missingHackathonAdminAssignmentHackathonIds,
    nonAdminHackathonAssignments
  }
}

export async function grantPlatformAdminAccess(
  database: AppDatabase,
  input: {
    actorUserId: string | null
    userId: string
    action?: string
    executedAt?: string
  }
) {
  const targetUser = await getActiveUserOrThrow(database, input.userId)
  const before = await assessPlatformAdminGrantState(database, targetUser.id)
  const executedAt = input.executedAt ?? new Date().toISOString()
  const action = input.action ?? 'platform_admin.granted'
  let userPromoted = false
  let createdHackathonAdminAssignments = 0
  let updatedHackathonAdminAssignments = 0
  const updates = []

  if (!before.userIsPlatformAdmin) {
    userPromoted = true
    updates.push(
      database
        .update(users)
        .set({
          isPlatformAdmin: true,
          updatedAt: executedAt
        })
        .where(eq(users.id, targetUser.id))
    )
  }

  for (const hackathonId of before.missingHackathonAdminAssignmentHackathonIds) {
    createdHackathonAdminAssignments += 1
    updates.push(
      database.insert(hackathonRoleAssignments).values({
        id: crypto.randomUUID(),
        hackathonId,
        userId: targetUser.id,
        role: 'hackathon_admin',
        isInJudgePool: false,
        isStaff: false,
        createdAt: executedAt
      })
    )
  }

  for (const assignment of before.nonAdminHackathonAssignments) {
    updatedHackathonAdminAssignments += 1
    updates.push(
      database
        .update(hackathonRoleAssignments)
        .set({
          role: 'hackathon_admin'
        })
        .where(eq(hackathonRoleAssignments.id, assignment.assignmentId))
    )
  }

  const appliedChanges = userPromoted
    || createdHackathonAdminAssignments > 0
    || updatedHackathonAdminAssignments > 0

  if (appliedChanges) {
    updates.push(
      buildAuditLogInsert(database, {
        actorUserId: input.actorUserId,
        entityType: 'user',
        entityId: targetUser.id,
        action,
        metadata: {
          email: targetUser.email,
          auth0Subject: targetUser.auth0Subject,
          userPromoted,
          createdHackathonAdminAssignments,
          updatedHackathonAdminAssignments
        },
        createdAt: executedAt
      }).query
    )
  }

  if (updates.length > 0) {
    await database.batch(
      updates as [typeof updates[number], ...Array<typeof updates[number]>]
    )
  }

  return {
    user: serializeHackathonRoleUserSummary(await getActiveUserOrThrow(database, targetUser.id)),
    userPromoted,
    createdHackathonAdminAssignments,
    updatedHackathonAdminAssignments,
    wroteAuditLog: appliedChanges
  }
}
