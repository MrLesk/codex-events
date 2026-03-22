import { DatabaseSync } from 'node:sqlite'

import { createLocalD1Binding } from '../../../server/database/local-d1'
import { readMigrationSql } from './migrations'

export class TestD1Database {
  private readonly sqlite: DatabaseSync
  private readonly d1Database: ReturnType<typeof createLocalD1Binding>

  constructor(options?: { applyMigrations?: boolean }) {
    this.sqlite = new DatabaseSync(':memory:')
    this.d1Database = createLocalD1Binding(this.sqlite)

    if (options?.applyMigrations !== false) {
      this.exec(readMigrationSql())
    }
  }

  prepare(sql: string) {
    return this.d1Database.prepare(sql)
  }

  async batch(statements: Array<ReturnType<ReturnType<typeof createLocalD1Binding>['prepare']>>) {
    return await this.d1Database.batch(statements)
  }

  exec(sql: string) {
    this.sqlite.exec(sql)
  }

  close() {
    this.sqlite.close()
  }
}

export function createTestD1Database(options?: { applyMigrations?: boolean }) {
  return new TestD1Database(options)
}
