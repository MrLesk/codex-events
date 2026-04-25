import { and, eq, isNull } from 'drizzle-orm'

import type { AppDatabase } from '#server/database/client'
import { userAuthIdentities, users } from '#server/database/schema'
import { ApiError } from './api-error'

type PlatformUserRecord = typeof users.$inferSelect
type PlatformUserAuthIdentityRecord = typeof userAuthIdentities.$inferSelect

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
  const identity = await findPlatformUserAuthIdentity(database, auth0Subject)

  if (!identity) {
    return null
  }

  return await findActivePlatformUserById(database, identity.userId)
}

export async function ensurePlatformUserAuthIdentity(
  database: AppDatabase,
  input: {
    userId: string
    auth0Subject: string
    createdAt?: string
  }
): Promise<PlatformUserAuthIdentityRecord> {
  const auth0Subject = normalizeAuth0Subject(input.auth0Subject)
  const existingIdentity = await findPlatformUserAuthIdentity(database, auth0Subject)

  if (existingIdentity) {
    if (existingIdentity.userId !== input.userId) {
      throw new ApiError({
        statusCode: 409,
        code: 'platform_user_auth_identity_conflict',
        message: 'This Auth0 identity is already linked to another platform user.',
        details: {
          auth0Subject,
          userId: existingIdentity.userId
        }
      })
    }

    return existingIdentity
  }

  const identityRecord = {
    id: crypto.randomUUID(),
    userId: input.userId,
    auth0Subject,
    createdAt: input.createdAt ?? new Date().toISOString()
  } satisfies typeof userAuthIdentities.$inferInsert

  await database.insert(userAuthIdentities).values(identityRecord)

  return identityRecord
}

export async function ensurePlatformUserAuthIdentities(
  database: AppDatabase,
  input: {
    userId: string
    auth0Subjects: string[]
    createdAt?: string
  }
) {
  const createdAt = input.createdAt ?? new Date().toISOString()
  const identities: PlatformUserAuthIdentityRecord[] = []
  const uniqueSubjects = new Set(
    input.auth0Subjects
      .map(normalizeAuth0Subject)
      .filter(Boolean)
  )

  for (const auth0Subject of uniqueSubjects) {
    identities.push(await ensurePlatformUserAuthIdentity(database, {
      userId: input.userId,
      auth0Subject,
      createdAt
    }))
  }

  return identities
}

export async function deletePlatformUserAuthIdentities(
  database: AppDatabase,
  userId: string
) {
  await database
    .delete(userAuthIdentities)
    .where(eq(userAuthIdentities.userId, userId))
}
