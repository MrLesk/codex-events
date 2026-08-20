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
    const relationalRow = await database.query.users.findFirst({
      where: eq(users.id, 'facade_user')
    })
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
    expect(relationalRow?.id).toBe('facade_user')
    expect(joinedRows).toEqual([{ userId: 'facade_user', tokenId: 'facade_token' }])
    expect(subqueryRows).toEqual([{ id: 'facade_user' }])
    expect(existsRows).toEqual([{ id: 'facade_user' }])
    expect(sqlConditionRows).toEqual([{ id: 'facade_user' }])
    expect(batchResults).toHaveLength(2)
  })

  test('exposes only the root allowlist and closes reflective capability escapes', async () => {
    const d1Database = createTestD1Database()
    databases.push(d1Database)
    const database = createNonHttpDatabase(d1Database as never)

    expect(Object.keys(database).sort()).toEqual(['batch', 'delete', 'get', 'insert', 'query', 'select', 'update'])
    expect(Object.getPrototypeOf(database)).toBeNull()
    expect(Object.isFrozen(database)).toBe(true)
    for (const key of [
      '$client',
      '$count',
      '$with',
      'all',
      'client',
      'constructor',
      'dialect',
      'getBookmark',
      'prepare',
      'run',
      'selectDistinct',
      'session',
      'transaction',
      'values',
      'with'
    ]) {
      expect(Reflect.get(database, key)).toBeUndefined()
      expect(key in database).toBe(false)
      expect(Object.getOwnPropertyDescriptor(database, key)).toBeUndefined()
    }

    const selectFromDescriptor = Object.getOwnPropertyDescriptor(database, 'select')?.value as typeof database.select
    const descriptorRows = await Reflect.apply(selectFromDescriptor, new Proxy({}, {
      get() {
        throw new Error('malicious receiver getter executed')
      }
    }), []).from(users).limit(1)
    expect(descriptorRows).toEqual([])

    let receiverAccessorCalled = false
    const accessorReceiver = {}
    Object.defineProperty(accessorReceiver, 'select', {
      get() {
        receiverAccessorCalled = true
        throw new Error('malicious receiver accessor executed')
      }
    })
    expect(() => Reflect.get(database, 'select', accessorReceiver)).not.toThrow()
    expect(receiverAccessorCalled).toBe(false)

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
    expect(Reflect.get(usersFromDescriptor, 'prepare')).toBeUndefined()
    expect(Reflect.get(usersFromDescriptor, '_prepare')).toBeUndefined()
    expect(Reflect.get(usersFromDescriptor, '__proto__')).toBeUndefined()
    expect(Reflect.get(usersFromDescriptor, Symbol.for('drizzle:entityKind'))).toBeUndefined()
    expect(Object.getOwnPropertyDescriptor(usersFromDescriptor, 'session')).toBeUndefined()
    expect(Object.getOwnPropertySymbols(usersFromDescriptor)).toEqual([])
    expect(Reflect.get(database, 'transaction')).toBeUndefined()

    const selectBuilder = database.select({ id: users.id }).from(users)
    for (const builder of [usersFromDescriptor, selectBuilder]) {
      for (const key of ['__defineGetter__', '__defineSetter__', 'hasOwnProperty', 'toString', 'valueOf']) {
        expect(Reflect.get(builder, key)).toBeUndefined()
        expect(key in builder).toBe(false)
      }
    }

    expect(typeof (usersFromDescriptor as { findMany?: unknown }).findMany).toBe('function')
    expect(typeof selectBuilder.where).toBe('function')
    expect(typeof selectBuilder.$dynamic).toBe('function')
    expect(typeof selectBuilder.toSQL).toBe('function')
    expect(Reflect.get(selectBuilder, 'dialect')).toBeDefined()
    expect(Object.getOwnPropertyDescriptor(selectBuilder, 'dialect')?.value)
      .toBe(Reflect.get(selectBuilder, 'dialect'))
    expect(Object.getOwnPropertyDescriptor(selectBuilder, 'session')).toBeUndefined()
    expect(Reflect.get(selectBuilder, 'session')).toBeUndefined()
    expect(selectBuilder.toSQL()).toEqual(expect.objectContaining({ sql: expect.any(String) }))
    expect(typeof selectBuilder.$dynamic().where).toBe('function')
    await expect(selectBuilder.where(eq(users.id, 'facade_user')).limit(1)).resolves.toEqual([])

    let transactionCallbackCalled = false
    const transaction = Reflect.get(database, 'transaction') as undefined | ((callback: (transaction: unknown) => unknown) => Promise<unknown>)
    expect(transaction).toBeUndefined()
    expect(() => transaction?.((transactionResult) => {
      transactionCallbackCalled = true
      return transactionResult
    })).not.toThrow()
    expect(transactionCallbackCalled).toBe(false)
  })
})
