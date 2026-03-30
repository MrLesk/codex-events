import { createRequire } from 'node:module'

import { readMigrationSql } from './migrations'

type SqliteParameter = ArrayBuffer | ArrayBufferView | bigint | boolean | null | number | string

type SqliteQueryResult = {
  changes: number
  lastInsertRowid?: bigint | number
}

type SqliteStatement = {
  all: (...parameters: SqliteParameter[]) => unknown[]
  get: (...parameters: SqliteParameter[]) => unknown
  run: (...parameters: SqliteParameter[]) => SqliteQueryResult
  setReturnArrays?: (enabled: boolean) => void
  values?: (...parameters: SqliteParameter[]) => unknown[][]
}

type SqliteDatabase = {
  close: () => void
  exec: (sql: string) => void
  prepare?: (sql: string) => SqliteStatement
  query?: (sql: string) => SqliteStatement
}

type SqliteDatabaseConstructor = new (filename: string) => SqliteDatabase

interface D1ResultMeta {
  changed_db: boolean
  changes: number
  duration: number
  last_row_id: number
  rows_read: number
  rows_written: number
  served_by: string
  size_after: number
}

interface D1QueryResult<TResult> {
  meta: D1ResultMeta
  results: TResult[]
  success: true
}

interface D1RunResult {
  meta: D1ResultMeta
  success: true
}

const require = createRequire(import.meta.url)

function loadSqliteDatabaseConstructor() {
  try {
    const sqliteModule = require('node:sqlite') as { DatabaseSync: SqliteDatabaseConstructor }
    return sqliteModule.DatabaseSync as SqliteDatabaseConstructor
  } catch {
    const sqliteModule = require('bun:sqlite') as { Database: SqliteDatabaseConstructor }
    return sqliteModule.Database as SqliteDatabaseConstructor
  }
}

function normalizeParameters(parameters: unknown[]) {
  return parameters.map((parameter) => {
    if (parameter === undefined) {
      return null
    }

    if (typeof parameter === 'boolean') {
      return parameter ? 1 : 0
    }

    return parameter as SqliteParameter
  })
}

function prepareSqliteStatement(database: SqliteDatabase, sql: string) {
  if (typeof database.query === 'function') {
    return database.query(sql)
  }

  if (typeof database.prepare === 'function') {
    return database.prepare(sql)
  }

  throw new TypeError('SQLite test backend does not expose a supported statement API.')
}

function createResultMeta(options: {
  changes?: number
  lastRowId?: number
  rowsRead?: number
  rowsWritten?: number
}) {
  return {
    served_by: 'test.sqlite',
    duration: 0,
    changes: options.changes ?? 0,
    last_row_id: options.lastRowId ?? 0,
    changed_db: (options.changes ?? 0) > 0,
    size_after: 0,
    rows_read: options.rowsRead ?? 0,
    rows_written: options.rowsWritten ?? options.changes ?? 0
  } satisfies D1ResultMeta
}

class TestD1PreparedStatement {
  constructor(
    private readonly getDatabase: () => Promise<SqliteDatabase>,
    private readonly sql: string,
    private readonly parameters: unknown[] = []
  ) {}

  bind(...parameters: unknown[]) {
    return new TestD1PreparedStatement(this.getDatabase, this.sql, parameters)
  }

  async run(...parameters: unknown[]) {
    const effectiveParameters = this.resolveParameters(parameters)
    const result = prepareSqliteStatement(await this.getDatabase(), this.sql).run(...effectiveParameters)

    return {
      success: true,
      meta: createResultMeta({
        changes: result.changes,
        lastRowId: Number(result.lastInsertRowid ?? 0)
      })
    } satisfies D1RunResult
  }

  async all<TResult = Record<string, unknown>>(...parameters: unknown[]) {
    const effectiveParameters = this.resolveParameters(parameters)
    const results = prepareSqliteStatement(await this.getDatabase(), this.sql).all(...effectiveParameters) as TResult[]

    return {
      success: true,
      meta: createResultMeta({ rowsRead: results.length }),
      results
    } satisfies D1QueryResult<TResult>
  }

  async raw(...parameters: unknown[]) {
    const effectiveParameters = this.resolveParameters(parameters)
    const statement = prepareSqliteStatement(await this.getDatabase(), this.sql)

    if (typeof statement.values === 'function') {
      return statement.values(...effectiveParameters) as unknown[][]
    }

    statement.setReturnArrays?.(true)
    return statement.all(...effectiveParameters) as unknown[][]
  }

  async first<TResult = unknown>(columnNameOrParameter?: string | unknown, ...parameters: unknown[]) {
    if (typeof columnNameOrParameter === 'string' && parameters.length === 0) {
      const row = prepareSqliteStatement(await this.getDatabase(), this.sql).get(
        ...this.resolveParameters([])
      ) as Record<string, unknown> | null
      return row?.[columnNameOrParameter] as TResult
    }

    const effectiveParameters = columnNameOrParameter === undefined
      ? parameters
      : [columnNameOrParameter, ...parameters]
    const row = prepareSqliteStatement(await this.getDatabase(), this.sql).get(
      ...this.resolveParameters(effectiveParameters)
    ) as Record<string, unknown> | null

    return row as TResult
  }

  async toPreparedStatement() {
    return this
  }

  async executeForBatch() {
    const normalizedSql = this.sql.trimStart().toLowerCase()

    if (
      normalizedSql.startsWith('select')
      || normalizedSql.startsWith('with')
      || normalizedSql.startsWith('pragma')
    ) {
      return await this.all()
    }

    return await this.run()
  }

  private resolveParameters(parameters: unknown[]) {
    return normalizeParameters(parameters.length > 0 ? parameters : this.parameters)
  }
}

export class TestD1Database {
  private readonly database = new (loadSqliteDatabaseConstructor())(':memory:')

  private readonly ready: Promise<void>

  private closed = false

  constructor(options?: { applyMigrations?: boolean }) {
    this.ready = (async () => {
      if (options?.applyMigrations === false) {
        return
      }

      this.database.exec(readMigrationSql())
    })()
  }

  prepare(sql: string) {
    return new TestD1PreparedStatement(() => this.getDatabase(), sql)
  }

  async batch(statements: TestD1PreparedStatement[]) {
    const results: Array<D1QueryResult<Record<string, unknown>> | D1RunResult> = []

    for (const statement of statements) {
      results.push(await statement.executeForBatch())
    }

    return results
  }

  async exec(sql: string) {
    await this.ready
    this.database.exec(sql)
  }

  async close() {
    if (this.closed) {
      return
    }

    this.closed = true
    await this.ready
    this.database.close()
  }

  async first<TResult = unknown>(sql: string, ...parameters: unknown[]) {
    return await this.prepare(sql).first<TResult>(...parameters)
  }

  private async getDatabase() {
    await this.ready
    return this.database
  }
}

export function createTestD1Database(options?: { applyMigrations?: boolean }) {
  return new TestD1Database(options)
}
