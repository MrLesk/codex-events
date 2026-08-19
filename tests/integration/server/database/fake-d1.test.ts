import { afterEach, describe, expect, test } from 'vitest'
import { eq } from 'drizzle-orm'

import { createDatabase, createDatabaseAccess } from '../../../../server/database/client'
import { users } from '../../../../server/database/schema'
import { createTestD1Database } from '../../../support/backend/fake-d1'

describe('TestD1Database', () => {
  const databases: Array<ReturnType<typeof createTestD1Database>> = []

  afterEach(async () => {
    while (databases.length > 0) {
      await databases.pop()?.close()
    }
  })

  test('supports Drizzle queries against an in-memory D1-compatible binding', async () => {
    const d1Database = createTestD1Database()
    databases.push(d1Database)
    const database = createDatabase(d1Database as never)

    await database.insert(users).values({
      id: 'user_1',
      auth0Subject: 'auth0|user_1',
      email: 'user@example.com',
      displayName: 'User One'
    })

    const user = await database.query.users.findFirst({
      where: eq(users.auth0Subject, 'auth0|user_1')
    })

    expect(user).toMatchObject({
      id: 'user_1',
      email: 'user@example.com'
    })
  })

  test('keeps concurrently active test databases isolated from each other', async () => {
    const firstDatabase = createTestD1Database()
    const secondDatabase = createTestD1Database()
    databases.push(firstDatabase, secondDatabase)
    const firstAppDatabase = createDatabase(firstDatabase as never)
    const secondAppDatabase = createDatabase(secondDatabase as never)

    await firstAppDatabase.insert(users).values({
      id: 'user_1',
      auth0Subject: 'auth0|user_1',
      email: 'user@example.com',
      displayName: 'User One'
    })

    const firstUser = await firstAppDatabase.query.users.findFirst({
      where: eq(users.auth0Subject, 'auth0|user_1')
    })
    const secondUser = await secondAppDatabase.query.users.findFirst({
      where: eq(users.auth0Subject, 'auth0|user_1')
    })

    expect(firstUser).toMatchObject({
      id: 'user_1'
    })
    expect(secondUser).toBeUndefined()
  })

  test('starts sequential test databases from a clean migrated state', async () => {
    for (let iteration = 0; iteration < 6; iteration += 1) {
      const d1Database = createTestD1Database()
      const database = createDatabase(d1Database as never)

      await database.insert(users).values({
        id: 'user_1',
        auth0Subject: 'auth0|user_1',
        email: 'user@example.com',
        displayName: `User ${iteration}`
      })

      await expect(database.query.users.findFirst({
        where: eq(users.auth0Subject, 'auth0|user_1')
      })).resolves.toMatchObject({
        id: 'user_1'
      })

      await d1Database.close()
    }
  })

  test('models a stale replica and lets a bookmark anchor a later read to the write', async () => {
    const d1Database = createTestD1Database({ replicaStale: true })
    databases.push(d1Database)

    const writer = createDatabaseAccess(d1Database as never, {
      consistency: 'strong'
    })
    await writer.database.insert(users).values({
      id: 'bookmark_user',
      auth0Subject: 'auth0|bookmark_user',
      email: 'bookmark@example.com',
      displayName: 'Bookmark User'
    })

    const writeBookmark = writer.session.getBookmark()
    expect(writeBookmark).toBe('test-bookmark-1')

    const unbookmarkedRead = createDatabaseAccess(d1Database as never, {
      consistency: 'replica'
    })
    await expect(unbookmarkedRead.database.query.users.findFirst({
      where: eq(users.id, 'bookmark_user')
    })).resolves.toBeUndefined()
    expect(unbookmarkedRead.session.getBookmark()).toBe('test-bookmark-0')

    const bookmarkedRead = createDatabaseAccess(d1Database as never, {
      consistency: 'replica',
      incomingBookmark: writeBookmark ?? undefined
    })
    await expect(bookmarkedRead.database.query.users.findFirst({
      where: eq(users.id, 'bookmark_user')
    })).resolves.toMatchObject({
      id: 'bookmark_user'
    })
    expect(bookmarkedRead.session.getBookmark()).toBe(writeBookmark)
  })
})
