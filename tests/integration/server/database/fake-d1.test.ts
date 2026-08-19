import { afterEach, describe, expect, test } from 'vitest'
import { eq } from 'drizzle-orm'

import { createNonHttpDatabase } from '../../../../server/database/non-http'
import { eventCreditCodes, users } from '../../../../server/database/schema'
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
    const database = createNonHttpDatabase(d1Database as never)

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
    const firstAppDatabase = createNonHttpDatabase(firstDatabase as never)
    const secondAppDatabase = createNonHttpDatabase(secondDatabase as never)

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
      const database = createNonHttpDatabase(d1Database as never)

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

    const writerSession = d1Database.withSession('first-primary')
    const writer = createNonHttpDatabase(writerSession as never)
    await writer.insert(users).values({
      id: 'bookmark_user',
      auth0Subject: 'auth0|bookmark_user',
      email: 'bookmark@example.com',
      displayName: 'Bookmark User'
    })

    const writeBookmark = d1Database.getLatestBookmark()
    expect(writeBookmark).toBe('test-bookmark-1')

    const unbookmarkedRead = createNonHttpDatabase(d1Database.withSession('first-unconstrained') as never)
    await expect(unbookmarkedRead.query.users.findFirst({
      where: eq(users.id, 'bookmark_user')
    })).resolves.toBeUndefined()
    expect(d1Database.getLatestBookmark()).toBe('test-bookmark-0')

    const bookmarkedRead = createNonHttpDatabase(d1Database.withSession(writeBookmark ?? undefined) as never)
    await expect(bookmarkedRead.query.users.findFirst({
      where: eq(users.id, 'bookmark_user')
    })).resolves.toMatchObject({
      id: 'bookmark_user'
    })
    expect(d1Database.getLatestBookmark()).toBe(writeBookmark)
  })

  test('classifies the simplified-claiming writable CTE as a primary write', async () => {
    const d1Database = createTestD1Database({ replicaStale: true })
    databases.push(d1Database)

    await d1Database.exec(`
      insert into users (id, auth0_subject, email, display_name)
      values ('import_admin', 'auth0|import_admin', 'import@example.com', 'Import Admin');
      insert into events (
        id, event_type, name, slug, description, city, country, address,
        registration_opens_at, registration_closes_at, max_team_members, created_by_user_id
      ) values (
        'import_event', 'meetup', 'Import Event', 'import-event', 'Import event',
        '', '', '', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', 1, 'import_admin'
      );
      insert into event_credit_offers (
        id, event_id, name, description, simplified_claiming_only, display_order
      ) values (
        'import_offer', 'import_event', 'Attendee reward', 'Private reward links.', true, 0
      );
    `)

    const session = d1Database.withSession('first-unconstrained')
    const result = await session.prepare(`
      insert into event_credit_codes (id, credit_offer_id, value, created_at)
      with input(id, value, offset_ms) as (
        values (?, ?, 1)
      )
      select
        input.id,
        offer.id,
        input.value,
        strftime('%Y-%m-%dT%H:%M:%fZ', (? + input.offset_ms) / 1000.0, 'unixepoch')
      from input
      join event_credit_offers offer
        on offer.event_id = ?
        and offer.simplified_claiming_only = true
      where not exists (
        select 1 from event_credit_codes existing_code
        where existing_code.credit_offer_id = offer.id
          and existing_code.value = input.value
      )
    `).bind(
      'import_code',
      'https://coupon.example/one',
      1700000000000,
      'import_event'
    ).run()

    expect(result.meta.changes).toBe(1)
    expect(session.getBookmark()).toBe('test-bookmark-2')
    const recordedQuery = d1Database.queries[d1Database.queries.length - 1]
    expect(recordedQuery).toMatchObject({
      isWrite: true,
      sql: expect.stringContaining('with input')
    })

    const unbookmarkedRead = createNonHttpDatabase(d1Database.withSession('first-unconstrained') as never)
    await expect(unbookmarkedRead.query.eventCreditCodes.findFirst({
      where: eq(eventCreditCodes.id, 'import_code')
    })).resolves.toBeUndefined()

    const bookmarkedRead = createNonHttpDatabase(d1Database.withSession(session.getBookmark() ?? undefined) as never)
    await expect(bookmarkedRead.query.eventCreditCodes.findFirst({
      where: eq(eventCreditCodes.id, 'import_code')
    })).resolves.toMatchObject({
      id: 'import_code',
      value: 'https://coupon.example/one'
    })
  })

  test('accounts direct infrastructure writes in fake-D1 bookmark state', async () => {
    const d1Database = createTestD1Database({ replicaStale: true })
    databases.push(d1Database)

    await d1Database.prepare(`
      insert into users (id, auth0_subject, email, display_name)
      values (?, ?, ?, ?)
    `).bind(
      'infrastructure_user',
      'auth0|infrastructure_user',
      'infrastructure@example.com',
      'Infrastructure User'
    ).run()

    const infrastructureBookmark = d1Database.getLatestBookmark()
    expect(infrastructureBookmark).toBe('test-bookmark-1')
    expect(d1Database.infrastructureQueries).toEqual([
      expect.objectContaining({
        sessionId: 0,
        isWrite: true
      })
    ])

    const unbookmarkedRead = createNonHttpDatabase(d1Database.withSession('first-unconstrained') as never)
    await expect(unbookmarkedRead.query.users.findFirst({
      where: eq(users.id, 'infrastructure_user')
    })).resolves.toBeUndefined()

    const bookmarkedRead = createNonHttpDatabase(d1Database.withSession(infrastructureBookmark ?? undefined) as never)
    await expect(bookmarkedRead.query.users.findFirst({
      where: eq(users.id, 'infrastructure_user')
    })).resolves.toMatchObject({
      id: 'infrastructure_user'
    })
    expect(d1Database.getLatestBookmark()).toBe(infrastructureBookmark)
  })
})
