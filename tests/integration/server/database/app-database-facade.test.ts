import { afterEach, describe, expect, test } from 'vitest'
import { eq, sql } from 'drizzle-orm'

import { createNonHttpDatabase } from '../../../../server/database/non-http'
import { mcpAccessTokens, users } from '../../../../server/database/schema'
import { createTestD1Database } from '../../../support/backend/fake-d1'

describe('AppDatabase facade', () => {
  const databases: Array<ReturnType<typeof createTestD1Database>> = []

  afterEach(async () => {
    while (databases.length > 0) {
      await databases.pop()?.close()
    }
  })

  test('preserves get, joins, subqueries, mutations, and batch execution', async () => {
    const d1Database = createTestD1Database()
    databases.push(d1Database)
    const database = createNonHttpDatabase(d1Database as never)

    await database.insert(users).values({
      id: 'facade_user',
      auth0Subject: 'auth0|facade_user',
      email: 'facade@example.com',
      displayName: 'Facade User'
    })
    await database.insert(mcpAccessTokens).values({
      id: 'facade_token',
      userId: 'facade_user',
      name: 'Facade Token',
      displayPrefix: 'facade',
      secretHash: 'facade-secret-hash',
      expiresAt: '2099-01-01T00:00:00.000Z'
    })

    const rawRow = await database.get<{ id: string }>(sql`select id from users where id = ${'facade_user'}`)
    const joinedRows = await database
      .select({ userId: users.id, tokenId: mcpAccessTokens.id })
      .from(users)
      .leftJoin(mcpAccessTokens, eq(mcpAccessTokens.userId, users.id))
      .where(eq(users.id, 'facade_user'))
    const subquery = database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, 'facade_user'))
      .as('facade_users')
    const subqueryRows = await database.select({ id: subquery.id }).from(subquery)

    await database.update(users).set({ displayName: 'Updated Facade User' }).where(eq(users.id, 'facade_user'))
    const batchResults = await database.batch([
      database.delete(mcpAccessTokens).where(eq(mcpAccessTokens.id, 'facade_token')),
      database.select({ id: users.id }).from(users).where(eq(users.id, 'facade_user'))
    ])

    expect(rawRow).toEqual({ id: 'facade_user' })
    expect(joinedRows).toEqual([{ userId: 'facade_user', tokenId: 'facade_token' }])
    expect(subqueryRows).toEqual([{ id: 'facade_user' }])
    expect(batchResults).toHaveLength(2)
  })
})
