import { DatabaseSync } from 'node:sqlite'

import { describe, expect, test } from 'vitest'

import { createLocalD1Binding } from '../../../../server/database/local-d1'

describe('local D1 binding', () => {
  test('supports D1-style prepared statements for sqlite-backed test foundations', async () => {
    const sqlite = new DatabaseSync(':memory:')

    try {
      sqlite.exec(`
        create table users (
          id text primary key,
          email text not null
        );
      `)

      const d1Database = createLocalD1Binding(sqlite)

      await d1Database.prepare('insert into users (id, email) values (?, ?)').bind('user_1', 'user@example.com').run()

      const selectedUsers = await d1Database.prepare('select id, email from users').all<{
        id: string
        email: string
      }>()
      const rawRows = await d1Database.prepare('select id, email from users').raw()

      expect(selectedUsers.results).toEqual([{
        id: 'user_1',
        email: 'user@example.com'
      }])
      expect(rawRows).toEqual([['user_1', 'user@example.com']])
    } finally {
      sqlite.close()
    }
  })
})
