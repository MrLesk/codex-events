import { createRequire } from 'node:module'

import initSqlJs from 'sql.js'

import { readMigrationSql } from './migrations'

type SqlJsModule = Awaited<ReturnType<typeof initSqlJs>>
type SqlJsDatabase = InstanceType<SqlJsModule['Database']>
type SqlJsStatement = InstanceType<SqlJsModule['Statement']>
type SqlJsParameter = Uint8Array | null | number | string

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
const sqlJsReady = initSqlJs({
  locateFile: file => require.resolve(`sql.js/dist/${file}`)
})

function normalizeParameters(parameters: unknown[]) {
  return parameters.map((parameter): SqlJsParameter => {
    if (parameter === undefined || parameter === null) {
      return null
    }

    if (typeof parameter === 'boolean') {
      return parameter ? 1 : 0
    }

    if (typeof parameter === 'bigint') {
      return Number(parameter)
    }

    if (parameter instanceof Uint8Array) {
      return parameter
    }

    if (parameter instanceof ArrayBuffer) {
      return new Uint8Array(parameter)
    }

    if (ArrayBuffer.isView(parameter)) {
      return new Uint8Array(parameter.buffer, parameter.byteOffset, parameter.byteLength)
    }

    return parameter as number | string
  })
}

function bindStatement(statement: SqlJsStatement, parameters: SqlJsParameter[]) {
  if (parameters.length > 0) {
    statement.bind(parameters)
  }
}

function createResultMeta(options: {
  changes?: number
  lastRowId?: number
  rowsRead?: number
  rowsWritten?: number
}) {
  return {
    served_by: 'sql.js',
    duration: 0,
    changes: options.changes ?? 0,
    last_row_id: options.lastRowId ?? 0,
    changed_db: (options.changes ?? 0) > 0,
    size_after: 0,
    rows_read: options.rowsRead ?? 0,
    rows_written: options.rowsWritten ?? options.changes ?? 0
  } satisfies D1ResultMeta
}

async function createSqlJsDatabase() {
  const SQL = await sqlJsReady
  return new SQL.Database()
}

function readLastInsertRowId(database: SqlJsDatabase) {
  const [result] = database.exec('select last_insert_rowid() as id')
  return Number(result?.values?.[0]?.[0] ?? 0)
}

class TestD1PreparedStatement {
  constructor(
    private readonly getDatabase: () => Promise<SqlJsDatabase>,
    private readonly sql: string,
    private readonly parameters: unknown[] = []
  ) {}

  bind(...parameters: unknown[]) {
    return new TestD1PreparedStatement(this.getDatabase, this.sql, parameters)
  }

  async run(...parameters: unknown[]) {
    const database = await this.getDatabase()
    const statement = database.prepare(this.sql)

    try {
      bindStatement(statement, this.resolveParameters(parameters))
      statement.step()

      const normalizedSql = this.sql.trimStart().toLowerCase()
      const isInsert = normalizedSql.startsWith('insert')

      return {
        success: true,
        meta: createResultMeta({
          changes: database.getRowsModified(),
          lastRowId: isInsert ? readLastInsertRowId(database) : 0
        })
      } satisfies D1RunResult
    } finally {
      statement.free()
    }
  }

  async all<TResult = Record<string, unknown>>(...parameters: unknown[]) {
    const database = await this.getDatabase()
    const statement = database.prepare(this.sql)

    try {
      bindStatement(statement, this.resolveParameters(parameters))

      const results: TResult[] = []

      while (statement.step()) {
        results.push(statement.getAsObject() as TResult)
      }

      return {
        success: true,
        meta: createResultMeta({ rowsRead: results.length }),
        results
      } satisfies D1QueryResult<TResult>
    } finally {
      statement.free()
    }
  }

  async raw(...parameters: unknown[]) {
    const database = await this.getDatabase()
    const statement = database.prepare(this.sql)

    try {
      bindStatement(statement, this.resolveParameters(parameters))

      const results: unknown[][] = []

      while (statement.step()) {
        results.push(statement.get())
      }

      return results
    } finally {
      statement.free()
    }
  }

  async first<TResult = unknown>(columnNameOrParameter?: string | unknown, ...parameters: unknown[]) {
    const row = await this.readFirstRow(
      columnNameOrParameter === undefined || typeof columnNameOrParameter === 'string'
        ? parameters
        : [columnNameOrParameter, ...parameters]
    )

    if (typeof columnNameOrParameter === 'string' && parameters.length === 0) {
      return row?.[columnNameOrParameter] as TResult
    }

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

  private async readFirstRow(parameters: unknown[]) {
    const database = await this.getDatabase()
    const statement = database.prepare(this.sql)

    try {
      bindStatement(statement, this.resolveParameters(parameters))

      if (!statement.step()) {
        return null
      }

      return statement.getAsObject() as Record<string, unknown>
    } finally {
      statement.free()
    }
  }

  private resolveParameters(parameters: unknown[]) {
    return normalizeParameters(parameters.length > 0 ? parameters : this.parameters)
  }
}

export class TestD1Database {
  private readonly database = createSqlJsDatabase()

  private readonly ready: Promise<void>

  private closed = false

  constructor(options?: { applyMigrations?: boolean }) {
    this.ready = (async () => {
      const database = await this.database

      if (options?.applyMigrations === false) {
        return
      }

      database.run(readMigrationSql())
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
    const database = await this.getDatabase()
    database.run(sql)
  }

  async close() {
    if (this.closed) {
      return
    }

    this.closed = true
    const database = await this.getDatabase()
    database.close()
  }

  async first<TResult = unknown>(sql: string, ...parameters: unknown[]) {
    return await this.prepare(sql).first<TResult>(...parameters)
  }

  private async getDatabase() {
    const database = await this.database
    await this.ready
    return database
  }
}

export function createTestD1Database(options?: { applyMigrations?: boolean }) {
  return new TestD1Database(options)
}
