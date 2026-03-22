import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

let cachedMigrationSql: string | undefined

export function readMigrationSql() {
  cachedMigrationSql ??= readdirSync(join(process.cwd(), 'drizzle'))
    .filter(fileName => /^\d+.*\.sql$/.test(fileName))
    .sort()
    .map(fileName => readFileSync(join(process.cwd(), 'drizzle', fileName), 'utf8'))
    .join('\n')
    .replaceAll('--> statement-breakpoint', '\n')

  return cachedMigrationSql
}
