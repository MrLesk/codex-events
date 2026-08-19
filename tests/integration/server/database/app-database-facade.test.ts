import { afterEach, describe, expect, test } from 'vitest'
import { eq, exists, sql } from 'drizzle-orm'

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
    const existsRows = await database
      .select({ id: users.id })
      .from(users)
      .where(exists(
        database
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, 'facade_user'))
      ))
    const sqlConditionRows = await database
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.id} = ${'facade_user'}`)

    await database.update(users).set({ displayName: 'Updated Facade User' }).where(eq(users.id, 'facade_user'))
    const batchResults = await database.batch([
      database.delete(mcpAccessTokens).where(eq(mcpAccessTokens.id, 'facade_token')),
      database.select({ id: users.id }).from(users).where(eq(users.id, 'facade_user'))
    ])

    expect(rawRow).toEqual({ id: 'facade_user' })
    expect(joinedRows).toEqual([{ userId: 'facade_user', tokenId: 'facade_token' }])
    expect(subqueryRows).toEqual([{ id: 'facade_user' }])
    expect(existsRows).toEqual([{ id: 'facade_user' }])
    expect(sqlConditionRows).toEqual([{ id: 'facade_user' }])
    expect(batchResults).toHaveLength(2)
  })

  test('wraps root and nested descriptor values and removes transaction escapes', async () => {
    const d1Database = createTestD1Database()
    databases.push(d1Database)
    const database = createNonHttpDatabase(d1Database as never)

    const rootDescriptor = Object.getOwnPropertyDescriptor(database, 'query')
    expect(rootDescriptor).toMatchObject({ value: expect.any(Object) })

    const queryFromDescriptor = rootDescriptor?.value as { users: object }
    expect(queryFromDescriptor).toBe(database.query)
    expect(Object.getOwnPropertyDescriptor(database, 'session')).toBeUndefined()
    expect(Object.getOwnPropertyDescriptor(queryFromDescriptor, 'session')).toBeUndefined()

    const nestedDescriptor = Object.getOwnPropertyDescriptor(queryFromDescriptor, 'users')
    expect(nestedDescriptor).toMatchObject({ value: expect.any(Object) })

    const usersFromDescriptor = nestedDescriptor?.value as object
    expect(usersFromDescriptor).toBe(database.query.users)
    expect((usersFromDescriptor as { session?: { client?: unknown } }).session?.client).toBeUndefined()
    expect(Object.getOwnPropertyDescriptor(usersFromDescriptor, 'client')).toBeUndefined()
    expect(Reflect.get(usersFromDescriptor, 'session')).toBeUndefined()
    expect(Reflect.get(usersFromDescriptor, 'client')).toBeUndefined()
    expect(Reflect.get(usersFromDescriptor, '$client')).toBeUndefined()
    expect(Reflect.get(database, 'transaction')).toBeUndefined()

    expect(() => (database as unknown as {
      transaction: (callback: (transaction: unknown) => unknown) => Promise<unknown>
    }).transaction(transaction => transaction)).toThrow()
  })
})
