import { Miniflare } from 'miniflare'

import { applySqlStatements, readMigrationStatements } from './migrations'

const testDatabaseId = '00000000-0000-0000-0000-000000000001'

class TestD1PreparedStatement {
  constructor(
    private readonly getDatabase: () => Promise<{ prepare: (sql: string) => {
      bind: (...parameters: unknown[]) => unknown
      run: () => Promise<unknown>
      all: <TResult = Record<string, unknown>>() => Promise<TResult>
      raw: () => Promise<unknown[][]>
      first: (columnName?: string) => Promise<unknown>
    } }>,
    private readonly sql: string,
    private readonly parameters: unknown[] = []
  ) {}

  bind(...parameters: unknown[]) {
    return new TestD1PreparedStatement(this.getDatabase, this.sql, parameters)
  }

  async run(...parameters: unknown[]) {
    const statement = await this.resolveStatement(parameters)
    return await statement.run()
  }

  async all<TResult = Record<string, unknown>>(...parameters: unknown[]) {
    const statement = await this.resolveStatement(parameters)
    return await statement.all<TResult>()
  }

  async raw(...parameters: unknown[]) {
    const statement = await this.resolveStatement(parameters)
    return await statement.raw()
  }

  async first<TResult = unknown>(columnNameOrParameter?: string | unknown, ...parameters: unknown[]) {
    if (typeof columnNameOrParameter === 'string' && parameters.length === 0 && this.parameters.length > 0) {
      const statement = await this.resolveStatement([])
      return await statement.first(columnNameOrParameter) as TResult
    }

    if (typeof columnNameOrParameter === 'string' && parameters.length === 0) {
      const statement = await this.resolveStatement([])
      return await statement.first(columnNameOrParameter) as TResult
    }

    const statement = await this.resolveStatement(
      columnNameOrParameter === undefined ? parameters : [columnNameOrParameter, ...parameters]
    )

    return await statement.first() as TResult
  }

  async toPreparedStatement() {
    return await this.resolveStatement([])
  }

  private async resolveStatement(parameters: unknown[]) {
    const database = await this.getDatabase()
    let statement = database.prepare(this.sql)
    const effectiveParameters = parameters.length > 0 ? parameters : this.parameters

    if (effectiveParameters.length > 0) {
      statement = statement.bind(...effectiveParameters) as typeof statement
    }

    return statement
  }
}

export class TestD1Database {
  private readonly miniflare = new Miniflare({
    modules: true,
    script: 'export default { async fetch() { return new Response("ok") } }',
    d1Databases: {
      DB: testDatabaseId
    }
  })
  private readonly d1Database = this.miniflare.getD1Database('DB')
  private readonly ready: Promise<void>

  constructor(options?: { applyMigrations?: boolean }) {
    this.ready = (async () => {
      const d1Database = await this.d1Database

      if (options?.applyMigrations !== false) {
        await applySqlStatements(d1Database, readMigrationStatements())
      }
    })()
  }

  prepare(sql: string) {
    return new TestD1PreparedStatement(() => this.getDatabase(), sql)
  }

  async batch(statements: TestD1PreparedStatement[]) {
    const d1Database = await this.getDatabase()
    const preparedStatements = await Promise.all(statements.map(async statement => await statement.toPreparedStatement()))

    return await d1Database.batch(preparedStatements)
  }

  async exec(sql: string) {
    const d1Database = await this.getDatabase()
    await applySqlStatements(d1Database, sql)
  }

  async close() {
    await this.miniflare.dispose()
  }

  private async getDatabase() {
    await this.ready
    return await this.d1Database
  }
}

export function createTestD1Database(options?: { applyMigrations?: boolean }) {
  return new TestD1Database(options)
}
