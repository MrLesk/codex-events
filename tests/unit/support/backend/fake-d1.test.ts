import { afterEach, describe, expect, test } from 'vitest'
import { eq } from 'drizzle-orm'

import { createDatabase } from '../../../../server/database/client'
import { users } from '../../../../server/database/schema'
import { createTestD1Database } from '../../../support/backend/fake-d1'

describe('TestD1Database', () => {
  const databases: Array<ReturnType<typeof createTestD1Database>> = []

  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.close()
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
})
