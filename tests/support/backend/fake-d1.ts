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

export interface TestD1QueryRecord {
  sessionId: number
  sql: string
  parameters: unknown[]
  isWrite: boolean
}

export interface TestD1SessionRecord {
  id: number
  start: string | undefined
  minimumVersion: number
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

async function createSqlJsDatabase(data?: Uint8Array) {
  const SQL = await sqlJsReady
  return new SQL.Database(data)
}

function readLastInsertRowId(database: SqlJsDatabase) {
  const [result] = database.exec('select last_insert_rowid() as id')
  return Number(result?.values?.[0]?.[0] ?? 0)
}

function isReadQuery(sql: string) {
  const normalizedSql = sql.trimStart().toLowerCase()

  return normalizedSql.startsWith('select')
    || normalizedSql.startsWith('with')
    || normalizedSql.startsWith('pragma')
}

interface TestD1QueryTarget {
  database: SqlJsDatabase
  version: number
}

class TestD1PreparedStatement {
  constructor(
    private readonly getTarget: (isRead: boolean) => Promise<TestD1QueryTarget>,
    private readonly sql: string,
    private readonly parameters: unknown[] = [],
    private readonly onQuery?: (query: Omit<TestD1QueryRecord, 'sessionId'>, servedVersion: number) => void
  ) {}

  bind(...parameters: unknown[]) {
    return new TestD1PreparedStatement(this.getTarget, this.sql, parameters, this.onQuery)
  }

  async run(...parameters: unknown[]) {
    const isWrite = !isReadQuery(this.sql)
    const target = await this.getTarget(!isWrite)
    const database = target.database
    const statement = database.prepare(this.sql)

    try {
      const resolvedParameters = this.resolveParameters(parameters)
      bindStatement(statement, resolvedParameters)
      statement.step()

      const normalizedSql = this.sql.trimStart().toLowerCase()
      const isInsert = normalizedSql.startsWith('insert')
      const result = {
        success: true,
        meta: createResultMeta({
          changes: database.getRowsModified(),
          lastRowId: isInsert ? readLastInsertRowId(database) : 0
        })
      } satisfies D1RunResult

      this.onQuery?.({
        sql: this.sql,
        parameters: resolvedParameters,
        isWrite: !isReadQuery(this.sql)
      }, target.version)
      return result
    } finally {
      statement.free()
    }
  }

  async all<TResult = Record<string, unknown>>(...parameters: unknown[]) {
    const target = await this.getTarget(true)
    const database = target.database
    const statement = database.prepare(this.sql)

    try {
      const resolvedParameters = this.resolveParameters(parameters)
      bindStatement(statement, resolvedParameters)

      const results: TResult[] = []

      while (statement.step()) {
        results.push(statement.getAsObject() as TResult)
      }

      this.onQuery?.({
        sql: this.sql,
        parameters: resolvedParameters,
        isWrite: false
      }, target.version)

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
    const target = await this.getTarget(true)
    const database = target.database
    const statement = database.prepare(this.sql)

    try {
      const resolvedParameters = this.resolveParameters(parameters)
      bindStatement(statement, resolvedParameters)

      const results: unknown[][] = []

      while (statement.step()) {
        results.push(statement.get())
      }

      this.onQuery?.({
        sql: this.sql,
        parameters: resolvedParameters,
        isWrite: false
      }, target.version)

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
    if (isReadQuery(this.sql)) {
      return await this.all()
    }

    return await this.run()
  }

  private async readFirstRow(parameters: unknown[]) {
    const target = await this.getTarget(true)
    const database = target.database
    const statement = database.prepare(this.sql)

    try {
      const resolvedParameters = this.resolveParameters(parameters)
      bindStatement(statement, resolvedParameters)

      if (!statement.step()) {
        this.onQuery?.({
          sql: this.sql,
          parameters: resolvedParameters,
          isWrite: false
        }, target.version)
        return null
      }

      const row = statement.getAsObject() as Record<string, unknown>
      this.onQuery?.({
        sql: this.sql,
        parameters: resolvedParameters,
        isWrite: false
      }, target.version)
      return row
    } finally {
      statement.free()
    }
  }

  private resolveParameters(parameters: unknown[]) {
    return normalizeParameters(parameters.length > 0 ? parameters : this.parameters)
  }
}

class TestD1DatabaseSession {
  private bookmark: string | null = null

  private hasWritten = false

  constructor(
    private readonly database: TestD1Database,
    private readonly sessionId: number,
    private minimumVersion: number,
    private readonly useReplica: boolean
  ) {}

  prepare(sql: string) {
    return new TestD1PreparedStatement(
      isRead => this.database.getSessionQueryTarget(
        this.minimumVersion,
        isRead && this.useReplica && !this.hasWritten
      ),
      sql,
      [],
      (query, servedVersion) => {
        const bookmark = this.database.recordSessionQuery(
          this.sessionId,
          this.minimumVersion,
          query,
          servedVersion
        )
        this.bookmark = bookmark
        if (query.isWrite) {
          this.minimumVersion = this.database.resolveBookmarkVersion(bookmark)
          this.hasWritten = true
        }
      }
    )
  }

  async batch(statements: TestD1PreparedStatement[]) {
    const results: Array<D1QueryResult<Record<string, unknown>> | D1RunResult> = []

    for (const statement of statements) {
      results.push(await statement.executeForBatch())
    }

    return results
  }

  getBookmark() {
    return this.bookmark
  }
}

export class TestD1Database {
  private readonly database = createSqlJsDatabase()

  private readonly ready: Promise<void>

  private replicaDatabase!: Promise<SqlJsDatabase>

  private readonly replicaStale: boolean

  private replicaVersion = 0

  private databaseVersion = 0

  private readonly knownBookmarks = new Map<string, number>()

  private readonly sessionHistory: TestD1SessionRecord[] = []

  private readonly queryHistory: TestD1QueryRecord[] = []

  private readonly sessionStartHistory: Array<string | undefined> = []

  private nextSessionId = 1

  private closed = false

  constructor(options?: { applyMigrations?: boolean, replicaStale?: boolean }) {
    this.replicaStale = options?.replicaStale ?? false
    this.ready = (async () => {
      const database = await this.database

      if (options?.applyMigrations !== false) {
        database.run(readMigrationSql())
      }

      this.replicaDatabase = createSqlJsDatabase(database.export())
      await this.replicaDatabase
    })()
  }

  prepare(sql: string) {
    return new TestD1PreparedStatement(
      async () => ({
        database: await this.getDatabase(),
        version: this.databaseVersion
      }),
      sql
    )
  }

  async batch(statements: TestD1PreparedStatement[]) {
    const results: Array<D1QueryResult<Record<string, unknown>> | D1RunResult> = []

    for (const statement of statements) {
      results.push(await statement.executeForBatch())
    }

    return results
  }

  withSession(constraintOrBookmark?: string) {
    this.sessionStartHistory.push(constraintOrBookmark)
    const sessionId = this.nextSessionId++
    const minimumVersion = this.resolveSessionStart(constraintOrBookmark)
    this.sessionHistory.push({
      id: sessionId,
      start: constraintOrBookmark,
      minimumVersion
    })

    return new TestD1DatabaseSession(
      this,
      sessionId,
      minimumVersion,
      constraintOrBookmark !== 'first-primary'
    )
  }

  get sessionStarts() {
    return [...this.sessionStartHistory]
  }

  get sessions() {
    return this.sessionHistory.map(session => ({ ...session }))
  }

  get queries() {
    return this.queryHistory.map(query => ({
      ...query,
      parameters: [...query.parameters]
    }))
  }

  async exec(sql: string) {
    const database = await this.getDatabase()
    database.run(sql)
    this.databaseVersion += 1
  }

  async close() {
    if (this.closed) {
      return
    }

    this.closed = true
    const database = await this.getDatabase()
    database.close()
    const replica = await this.replicaDatabase
    replica.close()
  }

  async first<TResult = unknown>(sql: string, ...parameters: unknown[]) {
    return await this.prepare(sql).first<TResult>(...parameters)
  }

  async getDatabase() {
    const database = await this.database
    await this.ready
    return database
  }

  async getSessionQueryTarget(minimumVersion: number, useReplica: boolean): Promise<TestD1QueryTarget> {
    if (!useReplica || !this.replicaStale) {
      return await this.getPrimaryQueryTarget()
    }

    await this.getDatabase()

    if (this.replicaVersion < minimumVersion) {
      await this.syncReplica()
    }

    return {
      database: await this.replicaDatabase,
      version: this.replicaVersion
    }
  }

  private async getPrimaryQueryTarget(): Promise<TestD1QueryTarget> {
    return {
      database: await this.getDatabase(),
      version: this.databaseVersion
    }
  }

  private async syncReplica() {
    const primary = await this.getDatabase()
    const previousReplica = await this.replicaDatabase
    previousReplica.close()
    this.replicaDatabase = createSqlJsDatabase(primary.export())
    await this.replicaDatabase
    this.replicaVersion = this.databaseVersion
  }

  resolveSessionStart(constraintOrBookmark?: string) {
    if (!constraintOrBookmark || constraintOrBookmark === 'first-primary' || constraintOrBookmark === 'first-unconstrained') {
      return 0
    }

    const version = this.knownBookmarks.get(constraintOrBookmark)

    if (version === undefined) {
      throw new Error(`Unknown local D1 bookmark: ${constraintOrBookmark}`)
    }

    return version
  }

  recordSessionQuery(
    sessionId: number,
    minimumVersion: number,
    query: Omit<TestD1QueryRecord, 'sessionId'>,
    servedVersion: number
  ) {
    if (query.isWrite) {
      this.databaseVersion += 1
    }

    const version = Math.max(query.isWrite ? this.databaseVersion : servedVersion, minimumVersion)
    const bookmark = `test-bookmark-${version}`
    this.knownBookmarks.set(bookmark, version)
    this.queryHistory.push({
      sessionId,
      sql: query.sql,
      parameters: [...query.parameters],
      isWrite: query.isWrite
    })
    return bookmark
  }

  resolveBookmarkVersion(bookmark: string) {
    const version = this.knownBookmarks.get(bookmark)

    if (version === undefined) {
      throw new Error(`Unknown local D1 bookmark: ${bookmark}`)
    }

    return version
  }
}

export function createTestD1Database(options?: { applyMigrations?: boolean, replicaStale?: boolean }) {
  return new TestD1Database(options)
}
