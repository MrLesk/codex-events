import { and, asc, count, desc, eq, isNull, like, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import { buildAuditLogInsert } from '#server/database/audit-log'
import type { AppDatabase } from '#server/database/client'
import { users } from '#server/database/schema'
import {
  getActiveUserOrThrow,
  serializeEventRoleUserSummary
} from '#server/domains/events'

export const listEventOrganizerCandidatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional()
})

export const eventOrganizerUserParamsSchema = z.object({
  userId: z.string().trim().min(1)
})

export async function listEventOrganizers(database: AppDatabase) {
  const items = await database.query.users.findMany({
    where: and(
      eq(users.isEventOrganizer, true),
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

export async function listEventOrganizerCandidates(
  database: AppDatabase,
  input: z.infer<typeof listEventOrganizerCandidatesQuerySchema>
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
    desc(sql<number>`case when ${users.isEventOrganizer} then 1 else 0 end`),
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

export async function grantEventOrganizerAccess(
  database: AppDatabase,
  input: {
    actorUserId: string | null
    userId: string
    executedAt?: string
  }
) {
  const targetUser = await getActiveUserOrThrow(database, input.userId)
  const executedAt = input.executedAt ?? new Date().toISOString()
  const userGranted = !targetUser.isEventOrganizer
  const updates = []

  if (userGranted) {
    updates.push(
      database
        .update(users)
        .set({
          isEventOrganizer: true,
          updatedAt: executedAt
        })
        .where(eq(users.id, targetUser.id))
    )
    updates.push(
      buildAuditLogInsert(database, {
        actorUserId: input.actorUserId,
        entityType: 'user',
        entityId: targetUser.id,
        action: 'event_organizer.granted',
        metadata: {
          email: targetUser.email,
          auth0Subject: targetUser.auth0Subject,
          userGranted
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
    userGranted,
    wroteAuditLog: userGranted
  }
}

export async function revokeEventOrganizerAccess(
  database: AppDatabase,
  input: {
    actorUserId: string | null
    userId: string
    executedAt?: string
  }
) {
  const targetUser = await getActiveUserOrThrow(database, input.userId)
  const executedAt = input.executedAt ?? new Date().toISOString()
  const userRevoked = targetUser.isEventOrganizer
  const updates = []

  if (userRevoked) {
    updates.push(
      database
        .update(users)
        .set({
          isEventOrganizer: false,
          updatedAt: executedAt
        })
        .where(eq(users.id, targetUser.id))
    )
    updates.push(
      buildAuditLogInsert(database, {
        actorUserId: input.actorUserId,
        entityType: 'user',
        entityId: targetUser.id,
        action: 'event_organizer.revoked',
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
