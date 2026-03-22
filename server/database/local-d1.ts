type StatementParameter = unknown
type StatementRow = Record<string, unknown>

interface SqliteColumn {
  name: string
}

interface SqliteRunResult {
  changes?: bigint | number
  lastInsertRowid?: bigint | number
}

interface SqliteStatement {
  all(...parameters: StatementParameter[]): StatementRow[]
  columns(): SqliteColumn[]
  get(...parameters: StatementParameter[]): StatementRow | undefined
  run(...parameters: StatementParameter[]): SqliteRunResult
}

interface SqliteDatabase {
  prepare(sql: string): SqliteStatement
}

interface LocalD1Meta {
  changes: number
  duration: number
  last_row_id: number
  rows_read: number
  rows_written: number
}

interface LocalD1Result<TResult = StatementRow> {
  results: TResult[]
  success: true
  meta: LocalD1Meta
}

function normalizeNumber(value: bigint | number | undefined) {
  if (typeof value === 'bigint') {
    return Number(value)
  }

  return value ?? 0
}

function createMeta(result?: SqliteRunResult, rowsRead = 0): LocalD1Meta {
  const changes = normalizeNumber(result?.changes)

  return {
    changes,
    duration: 0,
    last_row_id: normalizeNumber(result?.lastInsertRowid),
    rows_read: rowsRead,
    rows_written: changes
  }
}

export class LocalD1PreparedStatement {
  constructor(
    private readonly sqlite: SqliteDatabase,
    readonly sql: string,
    readonly parameters: StatementParameter[] = []
  ) {}

  bind(...parameters: StatementParameter[]) {
    return new LocalD1PreparedStatement(this.sqlite, this.sql, parameters)
  }

  async run(): Promise<LocalD1Result> {
    const statement = this.sqlite.prepare(this.sql)
    const result = statement.run(...this.parameters)

    return {
      results: [],
      success: true,
      meta: createMeta(result)
    }
  }

  async all<TResult extends StatementRow = StatementRow>(): Promise<LocalD1Result<TResult>> {
    const statement = this.sqlite.prepare(this.sql)
    const results = statement.all(...this.parameters) as TResult[]

    return {
      results,
      success: true,
      meta: createMeta(undefined, results.length)
    }
  }

  async raw(): Promise<unknown[][]> {
    const statement = this.sqlite.prepare(this.sql)
    const columns = statement.columns().map(column => column.name)
    const results = statement.all(...this.parameters)

    return results.map(row => columns.map(columnName => row[columnName] ?? null))
  }

  async first<TResult extends StatementRow = StatementRow>(columnName?: string): Promise<TResult | unknown | null> {
    const statement = this.sqlite.prepare(this.sql)
    const result = statement.get(...this.parameters) as TResult | undefined

    if (!result) {
      return null
    }

    if (columnName) {
      return result[columnName] ?? null
    }

    return result
  }
}

async function executeBatchStatement(statement: LocalD1PreparedStatement) {
  const normalizedSql = statement.sql.trim().toUpperCase()

  if (
    normalizedSql.startsWith('SELECT')
    || normalizedSql.startsWith('PRAGMA')
    || normalizedSql.startsWith('WITH')
    || normalizedSql.startsWith('EXPLAIN')
  ) {
    return await statement.all()
  }

  return await statement.run()
}

export function createLocalD1Binding(sqlite: SqliteDatabase) {
  return {
    prepare(sql: string) {
      return new LocalD1PreparedStatement(sqlite, sql)
    },
    async batch(statements: LocalD1PreparedStatement[]) {
      const results = []

      for (const statement of statements) {
        results.push(await executeBatchStatement(statement))
      }

      return results
    }
  }
}
