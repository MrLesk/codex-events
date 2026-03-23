import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { unstable_splitSqlQuery } from 'wrangler'

let cachedMigrationSql: string | undefined
let cachedMigrationStatements: string[] | undefined

type D1StatementExecutor = {
  prepare: (sql: string) => {
    run: () => Promise<unknown>
  }
}

export function splitSqlStatements(sql: string) {
  return unstable_splitSqlQuery(sql).map(statement => statement.trim()).filter(Boolean)
}

export async function applySqlStatements(database: D1StatementExecutor, statementsOrSql: string[] | string) {
  const statements = Array.isArray(statementsOrSql)
    ? statementsOrSql
    : splitSqlStatements(statementsOrSql)

  for (const statement of statements) {
    await database.prepare(statement).run()
  }
}

export function readMigrationSql() {
  cachedMigrationSql ??= readdirSync(join(process.cwd(), 'drizzle'))
    .filter(fileName => /^\d+.*\.sql$/.test(fileName))
    .sort()
    .map(fileName => readFileSync(join(process.cwd(), 'drizzle', fileName), 'utf8'))
    .join('\n')
    .replaceAll('--> statement-breakpoint', '\n')

  return cachedMigrationSql
}

export function readMigrationStatements() {
  cachedMigrationStatements ??= splitSqlStatements(readMigrationSql())
  return cachedMigrationStatements
}
