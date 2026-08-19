import { and, eq, isNull } from 'drizzle-orm'

import type { AppDatabase } from '#server/database/client'
import { userAuthIdentities, users } from '#server/database/schema'

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
