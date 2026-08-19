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

  test('executes mixed write/read statements atomically on one request session', async () => {
    const d1Database = createTestD1Database()
    databases.push(d1Database)
    const session = d1Database.withSession('first-primary')

    const results = await session.batch([
      session.prepare(`
        insert into users (id, auth0_subject, email, display_name)
        values (?, ?, ?, ?)
      `).bind(
        'batch_user',
        'auth0|batch_user',
        'batch@example.com',
        'Batch User'
      ),
      session.prepare('select id from users where id = ?').bind('batch_user')
    ])

    const readResult = results[1] as { results: Array<{ id: string }> }
    expect(results[0]?.meta.changes).toBe(1)
    expect(readResult.results).toEqual([{ id: 'batch_user' }])
    expect(session.getBookmark()).toBe('test-bookmark-1')
    expect(d1Database.queries).toEqual([
      expect.objectContaining({ sessionId: d1Database.sessions[0]?.id, isWrite: true }),
      expect.objectContaining({ sessionId: d1Database.sessions[0]?.id, isWrite: false })
    ])
  })

  test('rejects session-owned statements from direct batches before any state advances', async () => {
    const d1Database = createTestD1Database()
    databases.push(d1Database)
    const session = d1Database.withSession('first-primary')
    const beforeFailure = {
      queries: d1Database.queries,
      infrastructureQueries: d1Database.infrastructureQueries,
      sessions: d1Database.sessions,
      sessionStarts: d1Database.sessionStarts,
      bookmark: d1Database.getLatestBookmark()
    }

    await expect(d1Database.batch([
      d1Database.prepare(`
        insert into users (id, auth0_subject, email, display_name)
        values ('direct_mixed_owner_user', 'auth0|direct_mixed_owner_user', 'direct-mixed-owner@example.com', 'Direct Mixed Owner User')
      `),
      session.prepare(`
        insert into users (id, auth0_subject, email, display_name)
        values (?, ?, ?, ?)
      `).bind(
        'session_mixed_owner_user',
        'auth0|session_mixed_owner_user',
        'session-mixed-owner@example.com',
        'Session Mixed Owner User'
      )
    ])).rejects.toThrow(/session-owned/u)

    expect(session.getBookmark()).toBeNull()
    expect(d1Database.queries).toEqual(beforeFailure.queries)
    expect(d1Database.infrastructureQueries).toEqual(beforeFailure.infrastructureQueries)
    expect(d1Database.sessions).toEqual(beforeFailure.sessions)
    expect(d1Database.sessionStarts).toEqual(beforeFailure.sessionStarts)
    expect(d1Database.getLatestBookmark()).toBe(beforeFailure.bookmark)

    const verification = await d1Database.prepare(`
      select id from users where id = ? or id = ?
    `).bind('direct_mixed_owner_user', 'session_mixed_owner_user').all()
    expect(verification.results).toEqual([])
  })

  test('rejects statements owned by another session or the direct database before session execution', async () => {
    const d1Database = createTestD1Database()
    databases.push(d1Database)
    const sessionA = d1Database.withSession('first-primary')
    const sessionB = d1Database.withSession('first-primary')
    const beforeFailure = {
      queries: d1Database.queries,
      infrastructureQueries: d1Database.infrastructureQueries,
      sessions: d1Database.sessions,
      sessionStarts: d1Database.sessionStarts,
      bookmark: d1Database.getLatestBookmark()
    }

    await expect(sessionA.batch([
      sessionA.prepare('select 1'),
      sessionB.prepare('select 1')
    ])).rejects.toThrow(/another database session/u)
    await expect(sessionA.batch([
      sessionA.prepare('select ?').bind(1),
      sessionB.prepare('select ?').bind(1)
    ])).rejects.toThrow(/another database session/u)
    await expect(sessionA.batch([
      sessionA.prepare('select 1'),
      d1Database.prepare('select 1')
    ])).rejects.toThrow(/another database session/u)
    await expect(sessionA.batch([
      sessionA.prepare('select ?').bind(1),
      d1Database.prepare('select ?').bind(1)
    ])).rejects.toThrow(/another database session/u)

    expect(sessionA.getBookmark()).toBeNull()
    expect(sessionB.getBookmark()).toBeNull()
    expect(d1Database.queries).toEqual(beforeFailure.queries)
    expect(d1Database.infrastructureQueries).toEqual(beforeFailure.infrastructureQueries)
    expect(d1Database.sessions).toEqual(beforeFailure.sessions)
    expect(d1Database.sessionStarts).toEqual(beforeFailure.sessionStarts)
    expect(d1Database.getLatestBookmark()).toBe(beforeFailure.bookmark)
  })

  test('rejects statements from another database instance before any batch state advances', async () => {
    const firstDatabase = createTestD1Database()
    const secondDatabase = createTestD1Database()
    databases.push(firstDatabase, secondDatabase)
    const firstSession = firstDatabase.withSession('first-primary')
    const secondSession = secondDatabase.withSession('first-primary')
    const firstBeforeFailure = {
      queries: firstDatabase.queries,
      infrastructureQueries: firstDatabase.infrastructureQueries,
      sessions: firstDatabase.sessions,
      sessionStarts: firstDatabase.sessionStarts,
      bookmark: firstDatabase.getLatestBookmark()
    }
    const secondBeforeFailure = {
      queries: secondDatabase.queries,
      infrastructureQueries: secondDatabase.infrastructureQueries,
      sessions: secondDatabase.sessions,
      sessionStarts: secondDatabase.sessionStarts,
      bookmark: secondDatabase.getLatestBookmark()
    }
    const foreignStatements = [
      secondDatabase.prepare('select 1'),
      secondDatabase.prepare('select ?').bind(1),
      secondSession.prepare('select 1'),
      secondSession.prepare('select ?').bind(1)
    ]

    for (const statement of foreignStatements) {
      await expect(firstDatabase.batch([
        firstDatabase.prepare('select 1'),
        statement
      ])).rejects.toThrow(/another database instance/u)
      await expect(firstSession.batch([
        firstSession.prepare('select 1'),
        statement
      ])).rejects.toThrow(/another database instance/u)
    }

    expect(firstDatabase.queries).toEqual(firstBeforeFailure.queries)
    expect(firstDatabase.infrastructureQueries).toEqual(firstBeforeFailure.infrastructureQueries)
    expect(firstDatabase.sessions).toEqual(firstBeforeFailure.sessions)
    expect(firstDatabase.sessionStarts).toEqual(firstBeforeFailure.sessionStarts)
    expect(firstDatabase.getLatestBookmark()).toBe(firstBeforeFailure.bookmark)
    expect(secondDatabase.queries).toEqual(secondBeforeFailure.queries)
    expect(secondDatabase.infrastructureQueries).toEqual(secondBeforeFailure.infrastructureQueries)
    expect(secondDatabase.sessions).toEqual(secondBeforeFailure.sessions)
    expect(secondDatabase.sessionStarts).toEqual(secondBeforeFailure.sessionStarts)
    expect(secondDatabase.getLatestBookmark()).toBe(secondBeforeFailure.bookmark)

    expect((await firstDatabase.getDatabase()).exec('select count(*) as count from users')[0]?.values).toEqual([[0]])
    expect((await secondDatabase.getDatabase()).exec('select count(*) as count from users')[0]?.values).toEqual([[0]])
  })

  test('rolls back a failed session batch, including its bookmark and query accounting', async () => {
    const d1Database = createTestD1Database()
    databases.push(d1Database)
    await d1Database.exec(`
      insert into users (id, auth0_subject, email, display_name)
      values ('existing_batch_user', 'auth0|existing_batch_user', 'existing-batch@example.com', 'Existing Batch User')
    `)

    const session = d1Database.withSession('first-primary')
    await expect(session.batch([
      session.prepare(`
        insert into users (id, auth0_subject, email, display_name)
        values ('rolled_back_batch_user', 'auth0|rolled_back_batch_user', 'rolled-back@example.com', 'Rolled Back User')
      `),
      session.prepare(`
        insert into users (id, auth0_subject, email, display_name)
        values ('existing_batch_user', 'auth0|duplicate_batch_user', 'duplicate-batch@example.com', 'Duplicate Batch User')
      `)
    ])).rejects.toThrow(/UNIQUE constraint failed/u)

    expect(session.getBookmark()).toBeNull()
    expect(d1Database.getLatestBookmark()).toBe('test-bookmark-1')
    expect(d1Database.queries).toEqual([])
    expect(d1Database.infrastructureQueries).toHaveLength(1)

    const verification = createNonHttpDatabase(d1Database.withSession('first-primary') as never)
    await expect(verification.query.users.findFirst({
      where: eq(users.id, 'rolled_back_batch_user')
    })).resolves.toBeUndefined()
    await expect(verification.query.users.findFirst({
      where: eq(users.id, 'existing_batch_user')
    })).resolves.toMatchObject({ id: 'existing_batch_user' })
  })

  test('rolls back a failed direct binding batch and its infrastructure bookmark state', async () => {
    const d1Database = createTestD1Database()
    databases.push(d1Database)
    await d1Database.exec(`
      insert into users (id, auth0_subject, email, display_name)
      values ('direct_existing_user', 'auth0|direct_existing_user', 'direct-existing@example.com', 'Direct Existing User')
    `)

    await expect(d1Database.batch([
      d1Database.prepare(`
        insert into users (id, auth0_subject, email, display_name)
        values ('direct_rolled_back_user', 'auth0|direct_rolled_back_user', 'direct-rolled-back@example.com', 'Direct Rolled Back User')
      `),
      d1Database.prepare(`
        insert into users (id, auth0_subject, email, display_name)
        values ('direct_existing_user', 'auth0|direct_duplicate_user', 'direct-duplicate@example.com', 'Direct Duplicate User')
      `)
    ])).rejects.toThrow(/UNIQUE constraint failed/u)

    expect(d1Database.getLatestBookmark()).toBe('test-bookmark-1')
    expect(d1Database.infrastructureQueries).toEqual([
      expect.objectContaining({
        isWrite: true,
        sql: expect.stringContaining('insert into users')
      })
    ])

    const verification = createNonHttpDatabase(d1Database.withSession('first-primary') as never)
    await expect(verification.query.users.findFirst({
      where: eq(users.id, 'direct_rolled_back_user')
    })).resolves.toBeUndefined()
  })

  test('restores the pre-batch replica rows and version-visible accounting after failure', async () => {
    const d1Database = createTestD1Database({ replicaStale: true })
    databases.push(d1Database)
    await d1Database.exec(`
      insert into users (id, auth0_subject, email, display_name)
      values ('replica_existing_user', 'auth0|replica_existing_user', 'replica-existing@example.com', 'Replica Existing User')
    `)

    const existingBookmark = d1Database.getLatestBookmark()
    const replicaAnchor = d1Database.withSession(existingBookmark ?? undefined)
    await expect(replicaAnchor.prepare('select id from users where id = ?').bind('replica_existing_user').all())
      .resolves.toMatchObject({ results: [{ id: 'replica_existing_user' }] })

    const beforeFailure = {
      queries: d1Database.queries,
      infrastructureQueries: d1Database.infrastructureQueries,
      sessions: d1Database.sessions,
      sessionStarts: d1Database.sessionStarts,
      bookmark: d1Database.getLatestBookmark()
    }

    await expect(d1Database.batch([
      d1Database.prepare(`
        insert into users (id, auth0_subject, email, display_name)
        values ('replica_rolled_back_user', 'auth0|replica_rolled_back_user', 'replica-rolled-back@example.com', 'Replica Rolled Back User')
      `),
      d1Database.prepare(`
        insert into users (id, auth0_subject, email, display_name)
        values ('replica_existing_user', 'auth0|replica_duplicate_user', 'replica-duplicate@example.com', 'Replica Duplicate User')
      `)
    ])).rejects.toThrow(/UNIQUE constraint failed/u)

    expect(d1Database.queries).toEqual(beforeFailure.queries)
    expect(d1Database.infrastructureQueries).toEqual(beforeFailure.infrastructureQueries)
    expect(d1Database.sessions).toEqual(beforeFailure.sessions)
    expect(d1Database.sessionStarts).toEqual(beforeFailure.sessionStarts)
    expect(d1Database.getLatestBookmark()).toBe(beforeFailure.bookmark)

    const unbookmarkedReplicaRead = d1Database.withSession('first-unconstrained')
    await expect(unbookmarkedReplicaRead.prepare('select id from users order by id').all())
      .resolves.toMatchObject({ results: [{ id: 'replica_existing_user' }] })
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

  test('serializes overlapping atomic batches so a later rollback preserves an earlier success', async () => {
    const d1Database = createTestD1Database()
    databases.push(d1Database)
    let resolveFirst: () => void = () => {}
    const firstRelease = new Promise<void>((resolve) => {
      resolveFirst = resolve
    })
    let resolveFirstEntered: () => void = () => {}
    const firstEntered = new Promise<void>((resolve) => {
      resolveFirstEntered = resolve
    })
    let secondEntered = false

    const firstBatch = d1Database.runAtomicBatch(async () => {
      await d1Database.prepare(`
        insert into users (id, auth0_subject, email, display_name)
        values ('overlap_success_user', 'auth0|overlap_success_user', 'overlap-success@example.com', 'Overlap Success User')
      `).run()
      resolveFirstEntered()
      await firstRelease
    })

    await firstEntered

    const secondBatch = d1Database.runAtomicBatch(async () => {
      secondEntered = true
      await d1Database.prepare(`
        insert into users (id, auth0_subject, email, display_name)
        values ('overlap_failure_user', 'auth0|overlap_failure_user', 'overlap-failure@example.com', 'Overlap Failure User')
      `).run()
      throw new Error('overlapping batch failure')
    })

    await Promise.resolve()
    expect(secondEntered).toBe(false)
    resolveFirst()
    await firstBatch
    await expect(secondBatch).rejects.toThrow(/overlapping batch failure/u)

    const verification = createNonHttpDatabase(d1Database.withSession('first-primary') as never)
    await expect(verification.query.users.findFirst({
      where: eq(users.id, 'overlap_success_user')
    })).resolves.toMatchObject({ id: 'overlap_success_user' })
    await expect(verification.query.users.findFirst({
      where: eq(users.id, 'overlap_failure_user')
    })).resolves.toBeUndefined()
  })

  test('serializes a failing atomic batch before a concurrent standalone session write', async () => {
    const d1Database = createTestD1Database()
    databases.push(d1Database)
    const standaloneSession = d1Database.withSession('first-primary')
    let resolveBatchEntered: () => void = () => {}
    const batchEntered = new Promise<void>((resolve) => {
      resolveBatchEntered = resolve
    })
    let releaseBatch: () => void = () => {}
    const batchRelease = new Promise<void>((resolve) => {
      releaseBatch = resolve
    })

    const failingBatch = d1Database.runAtomicBatch(async () => {
      await d1Database.prepare(`
        insert into users (id, auth0_subject, email, display_name)
        values ('rolled_back_concurrent_user', 'auth0|rolled_back_concurrent_user', 'rolled-back-concurrent@example.com', 'Rolled Back Concurrent User')
      `).run()
      resolveBatchEntered()
      await batchRelease
      throw new Error('concurrent batch failure')
    })

    await batchEntered

    let standaloneFinished = false
    const standaloneWrite = standaloneSession.prepare(`
      insert into users (id, auth0_subject, email, display_name)
      values ('successful_concurrent_user', 'auth0|successful_concurrent_user', 'successful-concurrent@example.com', 'Successful Concurrent User')
    `).run().then((result) => {
      standaloneFinished = true
      return result
    })

    await Promise.resolve()
    expect(standaloneFinished).toBe(false)
    releaseBatch()
    await expect(failingBatch).rejects.toThrow(/concurrent batch failure/u)
    await standaloneWrite

    expect(standaloneSession.getBookmark()).toBe('test-bookmark-1')
    expect(d1Database.getLatestBookmark()).toBe('test-bookmark-1')
    expect(d1Database.infrastructureQueries).toEqual([])
    expect(d1Database.queries).toEqual([
      expect.objectContaining({
        sessionId: d1Database.sessions[0]?.id,
        isWrite: true,
        sql: expect.stringContaining('successful_concurrent_user')
      })
    ])

    expect((await d1Database.getDatabase()).exec('select id from users order by id')[0]?.values).toEqual([
      ['successful_concurrent_user']
    ])
  })
})
