import { and, eq, isNull, sql } from 'drizzle-orm'

import type { AppDatabase } from '#server/database/client'
import { platformDocumentTypes, userAuthIdentities, users } from '#server/database/schema'
import { buildCurrentPlatformDocumentAcceptanceCountQuery } from '#server/domains/platform/documents'

type PlatformUserRecord = typeof users.$inferSelect

function normalizeAuth0Subject(auth0Subject: string) {
  return auth0Subject.trim()
}

export async function findPlatformUserAuthIdentity(
  database: AppDatabase,
  auth0Subject: string
) {
  return (await database.query.userAuthIdentities.findFirst({
    where: eq(userAuthIdentities.auth0Subject, normalizeAuth0Subject(auth0Subject))
  })) ?? null
}

export async function findActivePlatformUserById(
  database: AppDatabase,
  userId: string
) {
  return (await database.query.users.findFirst({
    where: and(
      eq(users.id, userId),
      isNull(users.deletedAt)
    )
  })) ?? null
}

export async function findPlatformUserByAuth0Subject(
  database: AppDatabase,
  auth0Subject: string
): Promise<PlatformUserRecord | null> {
  const result = await database
    .select({ user: users })
    .from(userAuthIdentities)
    .innerJoin(users, eq(userAuthIdentities.userId, users.id))
    .where(and(
      eq(userAuthIdentities.auth0Subject, normalizeAuth0Subject(auth0Subject)),
      isNull(users.deletedAt)
    ))
    .limit(1)
    .get()

  return result?.user ?? null
}

export async function findPlatformUserByAuth0SubjectWithConsent(
  database: AppDatabase,
  auth0Subject: string
): Promise<{
  user: PlatformUserRecord
  hasAcceptedCurrentPlatformDocuments: boolean
} | null> {
  const acceptedDocumentCount = buildCurrentPlatformDocumentAcceptanceCountQuery(database, users.id)
  const result = await database
    .select({
      user: users,
      hasAcceptedCurrentPlatformDocuments: sql<number>`case when ${acceptedDocumentCount} = ${platformDocumentTypes.length} then 1 else 0 end`
    })
    .from(userAuthIdentities)
    .innerJoin(users, eq(userAuthIdentities.userId, users.id))
    .where(and(
      eq(userAuthIdentities.auth0Subject, normalizeAuth0Subject(auth0Subject)),
      isNull(users.deletedAt)
    ))
    .limit(1)
    .get()

  if (!result) {
    return null
  }

  return {
    user: result.user,
    hasAcceptedCurrentPlatformDocuments: result.hasAcceptedCurrentPlatformDocuments === 1
  }
}
