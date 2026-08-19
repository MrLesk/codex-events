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

type SqlToken = {
  kind: 'word' | 'open-paren' | 'close-paren'
  value: string
  end: number
}

function skipSqlQuotedValue(sql: string, start: number, quote: string) {
  let cursor = start + 1

  while (cursor < sql.length) {
    if (sql[cursor] !== quote) {
      cursor += 1
      continue
    }

    if (sql[cursor + 1] === quote) {
      cursor += 2
      continue
    }

    return cursor + 1
  }

  return sql.length
}

function readSqlToken(sql: string, start: number): SqlToken | undefined {
  let cursor = start

  while (cursor < sql.length) {
    const character = sql[cursor]

    if (/\s/u.test(character)) {
      cursor += 1
      continue
    }

    if (character === '-' && sql[cursor + 1] === '-') {
      const lineEnd = sql.indexOf('\n', cursor + 2)
      cursor = lineEnd === -1 ? sql.length : lineEnd + 1
      continue
    }

    if (character === '/' && sql[cursor + 1] === '*') {
      const commentEnd = sql.indexOf('*/', cursor + 2)
      cursor = commentEnd === -1 ? sql.length : commentEnd + 2
      continue
    }

    if (character === '\'' || character === '"' || character === '`') {
      cursor = skipSqlQuotedValue(sql, cursor, character)
      continue
    }

    if (character === '[') {
      const quotedIdentifierEnd = sql.indexOf(']', cursor + 1)
      cursor = quotedIdentifierEnd === -1 ? sql.length : quotedIdentifierEnd + 1
      continue
    }

    if (character === '(') {
      return { kind: 'open-paren', value: '', end: cursor + 1 }
    }

    if (character === ')') {
      return { kind: 'close-paren', value: '', end: cursor + 1 }
    }

    if (/[A-Za-z_]/u.test(character)) {
      const wordStart = cursor
      cursor += 1

      while (cursor < sql.length && /[A-Za-z0-9_$]/u.test(sql[cursor])) {
        cursor += 1
      }

      return {
        kind: 'word',
        value: sql.slice(wordStart, cursor).toLowerCase(),
        end: cursor
      }
    }

    cursor += 1
  }

  return undefined
}

function getSqlStatementKeyword(sql: string) {
  const firstToken = readSqlToken(sql, 0)

  if (!firstToken || firstToken.kind !== 'word') {
    return undefined
  }

  if (firstToken.value !== 'with') {
    return firstToken.value
  }

  let cursor = firstToken.end
  let parenthesisDepth = 0

  while (true) {
    const token = readSqlToken(sql, cursor)

    if (!token) {
      return undefined
    }

    cursor = token.end

    if (token.kind === 'open-paren') {
      parenthesisDepth += 1
      continue
    }

    if (token.kind === 'close-paren') {
      parenthesisDepth = Math.max(0, parenthesisDepth - 1)
      continue
    }

    if (parenthesisDepth === 0 && ['select', 'insert', 'update', 'delete', 'replace', 'pragma'].includes(token.value)) {
      return token.value
    }
  }
}

function isReadQuery(sql: string) {
  const statementKeyword = getSqlStatementKeyword(sql)

  return statementKeyword === 'select' || statementKeyword === 'pragma'
}

interface TestD1QueryTarget {
  database: SqlJsDatabase
  version: number
}

interface TestD1DatabaseSnapshot {
  primary: Uint8Array
  replica: Uint8Array
  replicaVersion: number
  databaseVersion: number
  knownBookmarks: Map<string, number>
  sessionHistory: TestD1SessionRecord[]
  queryHistory: TestD1QueryRecord[]
  infrastructureQueryHistory: TestD1QueryRecord[]
  sessionStartHistory: Array<string | undefined>
  nextSessionId: number
  latestBookmark: string | null
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

      const isInsert = getSqlStatementKeyword(this.sql) === 'insert'
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
        isWrite
      }, target.version)
      return result
    } finally {
      statement.free()
    }
  }

  async all<TResult = Record<string, unknown>>(...parameters: unknown[]) {
    const isWrite = !isReadQuery(this.sql)
    const target = await this.getTarget(!isWrite)
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
        isWrite
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
    const isWrite = !isReadQuery(this.sql)
    const target = await this.getTarget(!isWrite)
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
        isWrite
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
    const isWrite = !isReadQuery(this.sql)
    const target = await this.getTarget(!isWrite)
    const database = target.database
    const statement = database.prepare(this.sql)

    try {
      const resolvedParameters = this.resolveParameters(parameters)
      bindStatement(statement, resolvedParameters)

      if (!statement.step()) {
        this.onQuery?.({
          sql: this.sql,
          parameters: resolvedParameters,
          isWrite
        }, target.version)
        return null
      }

      const row = statement.getAsObject() as Record<string, unknown>
      this.onQuery?.({
        sql: this.sql,
        parameters: resolvedParameters,
        isWrite
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
    const previousState = {
      bookmark: this.bookmark,
      minimumVersion: this.minimumVersion,
      hasWritten: this.hasWritten
    }

    try {
      return await this.database.runAtomicBatch(async () => {
        const results: Array<D1QueryResult<Record<string, unknown>> | D1RunResult> = []

        for (const statement of statements) {
          results.push(await statement.executeForBatch())
        }

        return results
      })
    } catch (error) {
      this.bookmark = previousState.bookmark
      this.minimumVersion = previousState.minimumVersion
      this.hasWritten = previousState.hasWritten
      throw error
    }
  }

  getBookmark() {
    return this.bookmark
  }
}

export class TestD1Database {
  private database = createSqlJsDatabase()

  private readonly ready: Promise<void>

  private replicaDatabase!: Promise<SqlJsDatabase>

  private readonly replicaStale: boolean

  private replicaVersion = 0

  private databaseVersion = 0

  private readonly knownBookmarks = new Map<string, number>()

  private readonly sessionHistory: TestD1SessionRecord[] = []

  private readonly queryHistory: TestD1QueryRecord[] = []

  private readonly infrastructureQueryHistory: TestD1QueryRecord[] = []

  private readonly sessionStartHistory: Array<string | undefined> = []

  private nextSessionId = 1

  private latestBookmark: string | null = null

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
      sql,
      [],
      (query, servedVersion) => {
        this.recordInfrastructureQuery(query, servedVersion)
      }
    )
  }

  async batch(statements: TestD1PreparedStatement[]) {
    return await this.runAtomicBatch(async () => {
      const results: Array<D1QueryResult<Record<string, unknown>> | D1RunResult> = []

      for (const statement of statements) {
        results.push(await statement.executeForBatch())
      }

      return results
    })
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

  get infrastructureQueries() {
    return this.infrastructureQueryHistory.map(query => ({
      ...query,
      parameters: [...query.parameters]
    }))
  }

  getLatestBookmark() {
    return this.latestBookmark
  }

  async exec(sql: string) {
    const database = await this.getDatabase()
    database.run(sql)
    this.recordInfrastructureQuery({
      sql,
      parameters: [],
      isWrite: !isReadQuery(sql)
    }, this.databaseVersion)
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

  async runAtomicBatch<T>(execute: () => Promise<T>) {
    // D1 batch() executes statements sequentially but commits them as one
    // transaction. The fake must restore both SQLite replicas and all
    // bookmark/query accounting when a later statement fails.
    const snapshot = await this.snapshotState()

    try {
      return await execute()
    } catch (error) {
      await this.restoreState(snapshot)
      throw error
    }
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
    this.latestBookmark = bookmark
    this.queryHistory.push({
      sessionId,
      sql: query.sql,
      parameters: [...query.parameters],
      isWrite: query.isWrite
    })
    return bookmark
  }

  private recordInfrastructureQuery(
    query: Omit<TestD1QueryRecord, 'sessionId'>,
    servedVersion: number
  ) {
    if (query.isWrite) {
      this.databaseVersion += 1
    }

    const version = Math.max(query.isWrite ? this.databaseVersion : servedVersion, 0)
    const bookmark = `test-bookmark-${version}`
    this.knownBookmarks.set(bookmark, version)
    this.latestBookmark = bookmark
    this.infrastructureQueryHistory.push({
      sessionId: 0,
      sql: query.sql,
      parameters: [...query.parameters],
      isWrite: query.isWrite
    })
  }

  resolveBookmarkVersion(bookmark: string) {
    const version = this.knownBookmarks.get(bookmark)

    if (version === undefined) {
      throw new Error(`Unknown local D1 bookmark: ${bookmark}`)
    }

    return version
  }

  private async snapshotState(): Promise<TestD1DatabaseSnapshot> {
    const primary = await this.getDatabase()
    const replica = await this.replicaDatabase

    return {
      primary: new Uint8Array(primary.export()),
      replica: new Uint8Array(replica.export()),
      replicaVersion: this.replicaVersion,
      databaseVersion: this.databaseVersion,
      knownBookmarks: new Map(this.knownBookmarks),
      sessionHistory: this.sessionHistory.map(session => ({ ...session })),
      queryHistory: this.queryHistory.map(query => ({
        ...query,
        parameters: [...query.parameters]
      })),
      infrastructureQueryHistory: this.infrastructureQueryHistory.map(query => ({
        ...query,
        parameters: [...query.parameters]
      })),
      sessionStartHistory: [...this.sessionStartHistory],
      nextSessionId: this.nextSessionId,
      latestBookmark: this.latestBookmark
    }
  }

  private async restoreState(snapshot: TestD1DatabaseSnapshot) {
    const primary = await this.getDatabase()
    const replica = await this.replicaDatabase
    primary.close()
    replica.close()

    this.database = createSqlJsDatabase(snapshot.primary)
    this.replicaDatabase = createSqlJsDatabase(snapshot.replica)
    await Promise.all([this.database, this.replicaDatabase])

    this.replicaVersion = snapshot.replicaVersion
    this.databaseVersion = snapshot.databaseVersion
    this.knownBookmarks.clear()
    for (const [bookmark, version] of snapshot.knownBookmarks) {
      this.knownBookmarks.set(bookmark, version)
    }

    this.sessionHistory.length = 0
    this.sessionHistory.push(...snapshot.sessionHistory.map(session => ({ ...session })))
    this.queryHistory.length = 0
    this.queryHistory.push(...snapshot.queryHistory.map(query => ({
      ...query,
      parameters: [...query.parameters]
    })))
    this.infrastructureQueryHistory.length = 0
    this.infrastructureQueryHistory.push(...snapshot.infrastructureQueryHistory.map(query => ({
      ...query,
      parameters: [...query.parameters]
    })))
    this.sessionStartHistory.length = 0
    this.sessionStartHistory.push(...snapshot.sessionStartHistory)
    this.nextSessionId = snapshot.nextSessionId
    this.latestBookmark = snapshot.latestBookmark
  }
}

export function createTestD1Database(options?: { applyMigrations?: boolean, replicaStale?: boolean }) {
  return new TestD1Database(options)
}
