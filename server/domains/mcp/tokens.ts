import { and, count, desc, eq, gt, isNull, lt, or, sql } from 'drizzle-orm'
import { z } from 'zod'

import type { AppDatabase } from '#server/database/client'
import { mcpAccessTokens, users } from '#server/database/schema'
import { writeAuditLog } from '#server/database/audit-log'
import { ApiError } from '#server/http/api-error'

export const mcpTokenLifetimeMilliseconds = 30 * 24 * 60 * 60 * 1000
export const mcpTokenLastUseCoalescingMilliseconds = 5 * 60 * 1000
export const maximumActiveMcpTokensPerUser = 5
export const mcpTokenCredentialPrefix = 'ce_mcp_'

export const mcpAccessTokenNameSchema = z.string().trim().min(1).max(80)
export const mcpAccessTokenListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
})
export const createMcpAccessTokenBodySchema = z.object({
  name: mcpAccessTokenNameSchema
})
export const mcpAccessTokenParamsSchema = z.object({
  tokenId: z.string().uuid()
})

export interface McpTokenClock {
  now: () => Date
}

const systemClock: McpTokenClock = { now: () => new Date() }

function encodeBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function generateMcpCredential() {
  const tokenId = crypto.randomUUID()
  const secretBytes = new Uint8Array(32)
  crypto.getRandomValues(secretBytes)
  const secret = encodeBase64Url(secretBytes)
  const credential = `${mcpTokenCredentialPrefix}${tokenId}.${secret}`

  return {
    tokenId,
    credential,
    displayPrefix: `${mcpTokenCredentialPrefix}${tokenId.slice(0, 8)}`,
    secretHash: await sha256(credential)
  }
}

export function serializeMcpAccessToken(token: typeof mcpAccessTokens.$inferSelect) {
  return {
    id: token.id,
    name: token.name,
    displayPrefix: token.displayPrefix,
    expiresAt: token.expiresAt,
    lastUsedAt: token.lastUsedAt,
    revokedAt: token.revokedAt,
    createdAt: token.createdAt
  }
}

export async function createMcpAccessToken(database: AppDatabase, userId: string, input: z.infer<typeof createMcpAccessTokenBodySchema>, clock: McpTokenClock = systemClock) {
  const now = clock.now()
  const createdAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + mcpTokenLifetimeMilliseconds).toISOString()
  const generated = await generateMcpCredential()
  const record = {
    id: generated.tokenId,
    userId,
    name: input.name,
    displayPrefix: generated.displayPrefix,
    secretHash: generated.secretHash,
    expiresAt,
    lastUsedAt: null,
    revokedAt: null,
    createdAt,
    updatedAt: createdAt
  } satisfies typeof mcpAccessTokens.$inferInsert

  const inserted = await database.get<{ id: string }>(sql`
    insert into ${mcpAccessTokens} (
      id, user_id, name, display_prefix, secret_hash, expires_at,
      last_used_at, revoked_at, created_at, updated_at
    )
    select
      ${record.id}, ${record.userId}, ${record.name}, ${record.displayPrefix},
      ${record.secretHash}, ${record.expiresAt}, null, null, ${record.createdAt}, ${record.updatedAt}
    where (
      select count(*) from ${mcpAccessTokens} existing
      where existing.user_id = ${userId}
        and existing.revoked_at is null
        and existing.expires_at > ${createdAt}
    ) < ${maximumActiveMcpTokensPerUser}
    returning id
  `)
  if (!inserted) {
    throw new ApiError({
      statusCode: 409,
      code: 'mcp_token_limit_reached',
      message: 'Revoke an existing access token before creating another.'
    })
  }
  await writeAuditLog(database, {
    actorUserId: userId,
    entityType: 'mcp_access_token',
    entityId: record.id,
    action: 'mcp_access_token.created'
  })

  return {
    token: serializeMcpAccessToken(record),
    credential: generated.credential
  }
}

export async function listMcpAccessTokens(database: AppDatabase, userId: string, query: z.infer<typeof mcpAccessTokenListQuerySchema>) {
  const offset = (query.page - 1) * query.pageSize
  const [items, totalResult] = await Promise.all([
    database.select().from(mcpAccessTokens)
      .where(eq(mcpAccessTokens.userId, userId))
      .orderBy(desc(mcpAccessTokens.createdAt))
      .limit(query.pageSize)
      .offset(offset),
    database.select({ value: count() }).from(mcpAccessTokens)
      .where(eq(mcpAccessTokens.userId, userId))
  ])

  return {
    items: items.map(serializeMcpAccessToken),
    page: query.page,
    pageSize: query.pageSize,
    total: totalResult[0]?.value ?? 0
  }
}

export async function revokeMcpAccessToken(database: AppDatabase, userId: string, tokenId: string, clock: McpTokenClock = systemClock) {
  const revokedAt = clock.now().toISOString()
  const [token] = await database.update(mcpAccessTokens)
    .set({ revokedAt, updatedAt: revokedAt })
    .where(and(
      eq(mcpAccessTokens.id, tokenId),
      eq(mcpAccessTokens.userId, userId),
      isNull(mcpAccessTokens.revokedAt)
    ))
    .returning()

  if (!token) {
    throw new ApiError({
      statusCode: 404,
      code: 'mcp_token_not_found',
      message: 'The requested access token was not found.'
    })
  }

  await writeAuditLog(database, {
    actorUserId: userId,
    entityType: 'mcp_access_token',
    entityId: token.id,
    action: 'mcp_access_token.revoked'
  })
  return serializeMcpAccessToken(token)
}

export async function authenticateMcpCredential(database: AppDatabase, credential: string, clock: McpTokenClock = systemClock) {
  const match = /^ce_mcp_([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/u.exec(credential)
  if (!match) return null

  const now = clock.now().toISOString()
  const secretHash = await sha256(credential)
  const record = await database.select({ token: mcpAccessTokens, user: users })
    .from(mcpAccessTokens)
    .innerJoin(users, eq(users.id, mcpAccessTokens.userId))
    .where(and(
      eq(mcpAccessTokens.id, match[1]!),
      eq(mcpAccessTokens.secretHash, secretHash),
      isNull(mcpAccessTokens.revokedAt),
      gt(mcpAccessTokens.expiresAt, now),
      isNull(users.deletedAt)
    ))
    .get()

  return record ?? null
}

export async function coalesceMcpTokenLastUse(database: AppDatabase, tokenId: string, clock: McpTokenClock = systemClock) {
  const now = clock.now()
  const timestamp = now.toISOString()
  const threshold = new Date(now.getTime() - mcpTokenLastUseCoalescingMilliseconds).toISOString()
  await database.update(mcpAccessTokens)
    .set({ lastUsedAt: timestamp, updatedAt: timestamp })
    .where(and(
      eq(mcpAccessTokens.id, tokenId),
      or(isNull(mcpAccessTokens.lastUsedAt), lt(mcpAccessTokens.lastUsedAt, threshold))
    ))
}

export async function recordMcpMutationAttempt(database: AppDatabase, input: {
  userId: string
  authenticationMethod: 'manual_token' | 'oauth'
  entityType: 'mcp_access_token' | 'mcp_oauth_client'
  entityId: string
  toolName: string
  outcome: 'succeeded' | 'failed'
}) {
  await writeAuditLog(database, {
    actorUserId: input.userId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: 'mcp.mutation_attempted',
    metadata: {
      authenticationMethod: input.authenticationMethod,
      toolName: input.toolName,
      outcome: input.outcome
    }
  })
}
