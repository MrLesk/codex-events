import { and, asc, count, desc, eq, isNull, like, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import { buildAuditLogInsert } from '#server/database/audit-log'
import type { AppDatabase } from '#server/database/client'
import {
  eventRoleAssignments,
  users
} from '#server/database/schema'
import {
  getActiveUserOrThrow,
  serializeEventRoleUserSummary
} from '#server/domains/events'

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
  missingEventAdminAssignmentEventIds: string[]
  nonAdminEventAssignments: Array<{
    assignmentId: string
    eventId: string
    role: typeof eventRoleAssignments.$inferSelect.role
    isInJudgePool: boolean
    isStaff: boolean
  }>
}

type PlatformUserRecord = typeof users.$inferSelect

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ''
}

async function hasActivePlatformAdmins(database: AppDatabase) {
  const rows = await database
    .select({ total: count() })
    .from(users)
    .where(and(
      eq(users.isPlatformAdmin, true),
      isNull(users.deletedAt)
    ))

  return (rows[0]?.total ?? 0) > 0
}

export async function grantConfiguredFirstPlatformAdminAccess(
  database: AppDatabase,
  input: {
    user: PlatformUserRecord
    configuredEmail: string | null | undefined
  }
) {
  const configuredEmail = normalizeEmail(input.configuredEmail)

  if (
    !configuredEmail
    || input.user.isPlatformAdmin
    || normalizeEmail(input.user.email) !== configuredEmail
  ) {
    return input.user
  }

  if (await hasActivePlatformAdmins(database)) {
    return input.user
  }

  await grantPlatformAdminAccess(database, {
    actorUserId: null,
    userId: input.user.id,
    action: 'platform_admin.first_bootstrap_granted'
  })

  return await getActiveUserOrThrow(database, input.user.id)
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
  const [eventRows, assignmentRows, user] = await Promise.all([
    database.query.events.findMany({
      columns: {
        id: true
      }
    }),
    database.query.eventRoleAssignments.findMany({
      where: eq(eventRoleAssignments.userId, userId),
      columns: {
        id: true,
        eventId: true,
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

  const assignmentByEventId = new Map(
    assignmentRows.map(assignment => [assignment.eventId, assignment] as const)
  )

  const missingEventAdminAssignmentEventIds: string[] = []
  const nonAdminEventAssignments: PlatformAdminGrantState['nonAdminEventAssignments'] = []

  for (const event of eventRows) {
    const assignment = assignmentByEventId.get(event.id)

    if (!assignment) {
      missingEventAdminAssignmentEventIds.push(event.id)
      continue
    }

    if (assignment.role !== 'event_admin') {
      nonAdminEventAssignments.push({
        assignmentId: assignment.id,
        eventId: assignment.eventId,
        role: assignment.role,
        isInJudgePool: assignment.isInJudgePool,
        isStaff: assignment.isStaff
      })
    }
  }

  return {
    userIsPlatformAdmin: user?.isPlatformAdmin ?? false,
    missingEventAdminAssignmentEventIds,
    nonAdminEventAssignments
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
  let createdEventAdminAssignments = 0
  let updatedEventAdminAssignments = 0
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

  for (const eventId of before.missingEventAdminAssignmentEventIds) {
    createdEventAdminAssignments += 1
    updates.push(
      database.insert(eventRoleAssignments).values({
        id: crypto.randomUUID(),
        eventId,
        userId: targetUser.id,
        role: 'event_admin',
        isInJudgePool: false,
        isStaff: false,
        createdAt: executedAt
      })
    )
  }

  for (const assignment of before.nonAdminEventAssignments) {
    updatedEventAdminAssignments += 1
    updates.push(
      database
        .update(eventRoleAssignments)
        .set({
          role: 'event_admin'
        })
        .where(eq(eventRoleAssignments.id, assignment.assignmentId))
    )
  }

  const appliedChanges = userPromoted
    || createdEventAdminAssignments > 0
    || updatedEventAdminAssignments > 0

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
          createdEventAdminAssignments,
          updatedEventAdminAssignments
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
    user: serializeEventRoleUserSummary(await getActiveUserOrThrow(database, targetUser.id)),
    userPromoted,
    createdEventAdminAssignments,
    updatedEventAdminAssignments,
    wroteAuditLog: appliedChanges
  }
}

export async function revokePlatformAdminAccess(
  database: AppDatabase,
  input: {
    actorUserId: string | null
    userId: string
    executedAt?: string
  }
) {
  const targetUser = await getActiveUserOrThrow(database, input.userId)
  const executedAt = input.executedAt ?? new Date().toISOString()
  const userRevoked = targetUser.isPlatformAdmin
  const updates = []

  if (userRevoked) {
    updates.push(
      database
        .update(users)
        .set({
          isPlatformAdmin: false,
          updatedAt: executedAt
        })
        .where(eq(users.id, targetUser.id))
    )
    updates.push(
      buildAuditLogInsert(database, {
        actorUserId: input.actorUserId,
        entityType: 'user',
        entityId: targetUser.id,
        action: 'platform_admin.revoked',
        metadata: {
          email: targetUser.email,
          auth0Subject: targetUser.auth0Subject,
          userRevoked
        },
        createdAt: executedAt
      }).query
    )

    await database.batch(
      updates as [typeof updates[number], ...Array<typeof updates[number]>]
    )
  }

  return {
    user: serializeEventRoleUserSummary(await getActiveUserOrThrow(database, targetUser.id)),
    userRevoked,
    wroteAuditLog: userRevoked
  }
}
