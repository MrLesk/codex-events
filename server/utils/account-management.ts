import { eq } from 'drizzle-orm'

import type { AppDatabase } from '../database/client'
import {
  hackathonRoleAssignments,
  userPlatformDocumentAcceptances,
  users
} from '../database/schema'
import { writeAuditLog } from '../database/audit-log'

function sanitizeTimestampForIdentifier(timestamp: string) {
  return timestamp.replaceAll(/[^0-9]/g, '')
}

export function buildDeletedUserPatch(userId: string, deletedAt: string) {
  const suffix = `${userId}_${sanitizeTimestampForIdentifier(deletedAt)}`

  return {
    auth0Subject: `deleted_${suffix}`,
    email: `deleted_${suffix}@deleted.invalid`,
    displayName: 'Deleted User',
    isPlatformAdmin: false,
    xProfileUrl: null,
    linkedinProfileUrl: null,
    githubProfileUrl: null,
    updatedAt: deletedAt,
    deletedAt
  } satisfies Partial<typeof users.$inferInsert>
}

export async function deletePlatformAccount(
  database: AppDatabase,
  actor: {
    userId: string
  }
) {
  const deletedAt = new Date().toISOString()
  const deletedUserPatch = buildDeletedUserPatch(actor.userId, deletedAt)

  await database.transaction(async (transaction) => {
    await transaction
      .update(users)
      .set(deletedUserPatch)
      .where(eq(users.id, actor.userId))

    await transaction
      .delete(userPlatformDocumentAcceptances)
      .where(eq(userPlatformDocumentAcceptances.userId, actor.userId))

    await transaction
      .delete(hackathonRoleAssignments)
      .where(eq(hackathonRoleAssignments.userId, actor.userId))

    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      entityType: 'user',
      entityId: actor.userId,
      action: 'account.deleted',
      metadata: {
        deletedAt
      }
    })
  })

  return {
    userId: actor.userId,
    deletedAt
  }
}
