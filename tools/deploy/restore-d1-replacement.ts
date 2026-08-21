import 'dotenv/config'

import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, dirname, extname, join, resolve } from 'node:path'

import {
  d1Jurisdictions,
  d1PrimaryLocationHints,
  type D1PlacementConfiguration
} from './generate-wrangler-config'
import { createWranglerCommandRunner, type CommandRunner } from './wrangler-command'

const defaultWranglerConfigPath = 'wrangler.jsonc'
const migrationStateQuery = 'SELECT name FROM d1_migrations ORDER BY id;'
const productTableInventoryQuery = `
SELECT name
FROM sqlite_schema
WHERE type = 'table'
  AND name NOT LIKE 'sqlite_%'
  AND name <> 'd1_migrations'
ORDER BY name;
`
const foreignKeyCheckQuery = 'PRAGMA foreign_key_check;'
const quickCheckQuery = 'PRAGMA quick_check;'
const maxTablesPerVerificationFile = 4
const metadataTableNames = new Set(['d1_migrations'])

interface LocalSqliteDatabase {
  exec: (sql: string) => void
  query: (sql: string) => { all: () => Array<Record<string, unknown>> }
  close: () => void
}

const require = createRequire(import.meta.url)
let bunSqliteDatabase: (new (path: string) => LocalSqliteDatabase) | undefined

try {
  bunSqliteDatabase = (require('bun:sqlite') as { Database: new (path: string) => LocalSqliteDatabase }).Database
} catch {
  // Vitest runs on Node. The checked-in operator command runs on Bun and uses
  // bun:sqlite; tests use the same SQLite engine through the repository's
  // sql.js test dependency when Bun's native module is unavailable.
}

const sqlJs = bunSqliteDatabase
  ? undefined
  : await import('sql.js').then(({ default: initSqlJs }) => initSqlJs({
      locateFile: file => require.resolve(`sql.js/dist/${file}`)
    }))

export function createLocalSqliteDatabase(): LocalSqliteDatabase {
  if (bunSqliteDatabase) {
    return new bunSqliteDatabase(':memory:')
  }

  if (!sqlJs) {
    fail('No local SQLite implementation is available.')
  }

  const database = new sqlJs.Database()
  return {
    exec: sql => database.run(sql),
    query: sql => ({
      all: () => {
        const [result] = database.exec(sql)

        if (!result) {
          return []
        }

        return result.values.map(values => Object.fromEntries(
          result.columns.map((column, index) => [column, values[index]])
        ))
      }
    }),
    close: () => database.close()
  }
}

export type SqlFileSystem = {
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, contents: string) => Promise<void>
}

const defaultFileSystem: SqlFileSystem = {
  readFile: path => readFile(path, 'utf8'),
  writeFile: (path, contents) => writeFile(path, contents, 'utf8')
}

export interface RestoreD1ReplacementOptions {
  sourceDatabase: string
  sourceDatabaseId: string
  replacementDatabase: string
  replacementDatabaseId: string
  exportPath: string
  placement: D1PlacementConfiguration
  configPath?: string
  replacementConfigPath?: string
  restoreSqlPath?: string
  replacementExportPath?: string
  migrationNames?: readonly string[]
  apply?: boolean
  runner?: CommandRunner
  fileSystem?: SqlFileSystem
}

export interface RestoreD1ReplacementCommand {
  command: string
  args: string[]
}

export interface D1RestoreSqlChunk {
  index: number
  tableNames: string[]
  sql: string
}

export interface D1RestoreTablePlan {
  name: string
  columns: string[]
  dependencies: string[]
  rows: string[][]
  rowCount: number
}

export interface D1RestorePlan {
  tableOrder: string[]
  tables: D1RestoreTablePlan[]
  rowCount: number
  replaySql: string
  sourceCountChunks: D1RestoreSqlChunk[]
  emptyCountChunks: D1RestoreSqlChunk[]
  replacementCountChunks: D1RestoreSqlChunk[]
}

export interface RestoreD1ReplacementCommandPlan {
  replacementConfigPath: string
  sourceInfo: RestoreD1ReplacementCommand
  sourceMigrations: RestoreD1ReplacementCommand
  exportSource: RestoreD1ReplacementCommand
  sourceCountChunks: RestoreD1ReplacementCommand[]
  replacementInfo: RestoreD1ReplacementCommand
  replacementInventory: RestoreD1ReplacementCommand
  applyMigrations: RestoreD1ReplacementCommand
  replacementMigrations: RestoreD1ReplacementCommand
  replacementEmptyCountChunks: RestoreD1ReplacementCommand[]
  replay: RestoreD1ReplacementCommand
  replacementExport: RestoreD1ReplacementCommand
  replacementCountChunks: RestoreD1ReplacementCommand[]
  foreignKeyCheck: RestoreD1ReplacementCommand
  quickCheck: RestoreD1ReplacementCommand
  finalReplacementInfo: RestoreD1ReplacementCommand
  finalReplacementMigrations: RestoreD1ReplacementCommand
}

export interface D1RestoreDatabaseInfo {
  name: string
  uuid: string
  jurisdiction: string | null
  runningInRegion: string | null
  readReplicationMode: string | null
  size: number | null
}

export interface D1RestoreResult {
  dryRun: boolean
  bindingSwitchPermitted: boolean
  source: D1RestoreDatabaseInfo
  replacement: D1RestoreDatabaseInfo
  plan: Pick<D1RestorePlan, 'tableOrder' | 'tables' | 'rowCount'>
  migrationNames: string[]
  replacementConfigPath: string
  restoreSqlPath: string
  replacementExportPath: string
  canonicalDigests: {
    source: string
    replacement: string
  } | null
}

export interface D1ExportCanonicalEvidence {
  digest: string
  rowCount: number
  tables: Array<Pick<D1RestoreTablePlan, 'name' | 'columns' | 'dependencies' | 'rowCount'>>
}

interface SqliteSchemaTable {
  name: string
}

interface SqliteColumn {
  name: string
  hidden?: number
}

interface SqliteForeignKey {
  table: string
}

interface ParsedD1InfoRecord {
  name: string
  uuid: string
  jurisdiction?: string | null
  running_in_region?: string | null
  read_replication?: {
    mode?: string | null
  } | null
  database_size?: number | string | null
  size?: number | string | null
}

function fail(message: string): never {
  throw new Error(message)
}

function assertSafeName(value: string, label: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(value)) {
    fail(`${label} must contain only letters, numbers, dots, underscores, and hyphens.`)
  }
}

function assertDatabaseId(value: string, label: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) {
    fail(`${label} must be a UUID.`)
  }
}

function assertPath(value: string, label: string) {
  if (!value || /[\r\n]/u.test(value)) {
    fail(`${label} must be a non-empty path without line breaks.`)
  }
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

function quoteLiteral(value: string) {
  return `'${value.replaceAll('\'', '\'\'')}'`
}

function tableKey(value: string) {
  return value.toLowerCase()
}

function isMetadataTable(value: string) {
  return value.startsWith('sqlite_') || metadataTableNames.has(tableKey(value))
}

function readSqliteRows(database: LocalSqliteDatabase, sql: string) {
  return database.query(sql).all() as Array<Record<string, unknown>>
}

function introspectTable(database: LocalSqliteDatabase, tableName: string, knownTables: Map<string, string>): D1RestoreTablePlan {
  const columns = readSqliteRows(
    database,
    `PRAGMA table_xinfo(${quoteLiteral(tableName)});`
  ) as SqliteColumn[]
  const visibleColumns = columns.filter(column => (column.hidden ?? 0) === 0)

  if (visibleColumns.length !== columns.length) {
    fail(`D1 export table "${tableName}" has generated or hidden columns; refusing to replay an incomplete row.`)
  }

  if (visibleColumns.length === 0 || visibleColumns.some(column => typeof column.name !== 'string' || !column.name)) {
    fail(`D1 export table "${tableName}" does not expose a usable column list.`)
  }

  const foreignKeys = readSqliteRows(
    database,
    `PRAGMA foreign_key_list(${quoteLiteral(tableName)});`
  ) as SqliteForeignKey[]
  const dependencies = [...new Set(foreignKeys
    .map(foreignKey => knownTables.get(tableKey(foreignKey.table)))
    .filter((name): name is string => Boolean(name)))]
    .sort()
  const columnNames = visibleColumns.map(column => column.name)
  const selectedLiterals = columnNames
    .map((columnName, index) => `quote(${quoteIdentifier(columnName)}) AS ${quoteIdentifier(`literal_${index}`)}`)
    .join(', ')
  const rows = readSqliteRows(
    database,
    `SELECT ${selectedLiterals}
     FROM ${quoteIdentifier(tableName)};`
  ).map(row => columnNames.map((_, index) => {
    const literal = row[`literal_${index}`]

    if (typeof literal !== 'string') {
      fail(`D1 export table "${tableName}" returned a non-literal SQLite value.`)
    }

    return literal
  })).sort((left, right) => {
    const leftKey = JSON.stringify(left)
    const rightKey = JSON.stringify(right)

    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
  })

  return {
    name: tableName,
    columns: columnNames,
    dependencies,
    rows,
    rowCount: rows.length
  }
}

function stableDependencyOrder(tables: D1RestoreTablePlan[]) {
  const tableByKey = new Map(tables.map(table => [tableKey(table.name), table]))
  const remaining = new Set(tableByKey.keys())
  const order: string[] = []

  while (remaining.size > 0) {
    const ready = [...remaining]
      .filter(key => tableByKey.get(key)!.dependencies.every(dependency => !remaining.has(tableKey(dependency))))
      .sort()
    const next = ready.length > 0 ? ready : [[...remaining].sort()[0]!]

    for (const key of next) {
      remaining.delete(key)
      order.push(key)
    }
  }

  return order.map(key => tableByKey.get(key)!)
}

function countSql(table: D1RestoreTablePlan) {
  return `SELECT ${quoteLiteral(table.name)} AS table_name, COUNT(*) AS row_count
FROM ${quoteIdentifier(table.name)};`
}

function buildCountChunks(tables: D1RestoreTablePlan[]): D1RestoreSqlChunk[] {
  const chunks: D1RestoreSqlChunk[] = []

  for (let start = 0; start < tables.length; start += maxTablesPerVerificationFile) {
    const chunkTables = tables.slice(start, start + maxTablesPerVerificationFile)
    const index = chunks.length + 1

    chunks.push({
      index,
      tableNames: chunkTables.map(table => table.name),
      sql: `${chunkTables.map(countSql).join('\n\n')}\n`
    })
  }

  return chunks
}

function buildReplaySql(tables: D1RestoreTablePlan[]) {
  const statements = tables.flatMap(table => table.rows.map(row =>
    `INSERT OR IGNORE INTO ${quoteIdentifier(table.name)} (${table.columns.map(quoteIdentifier).join(', ')}) VALUES (${row.join(', ')});`
  ))

  return [
    '-- Generated from a trusted full D1 export. Export DDL is never replayed.',
    'BEGIN TRANSACTION;',
    'PRAGMA defer_foreign_keys = ON;',
    ...statements,
    'COMMIT;',
    ''
  ].join('\n')
}

export function buildD1RestorePlan(exportSql: string): D1RestorePlan {
  const database = createLocalSqliteDatabase()

  try {
    database.exec('PRAGMA foreign_keys = OFF;')
    database.exec(exportSql)

    const schemaTables = readSqliteRows(
      database,
      `SELECT name
       FROM sqlite_schema
       WHERE type = 'table'
       ORDER BY name;`
    ) as SqliteSchemaTable[]
    const productNames = schemaTables
      .map(table => table.name)
      .filter(name => typeof name === 'string' && !isMetadataTable(name))

    if (productNames.length === 0) {
      fail('D1 restore requires a full Wrangler export containing product tables.')
    }

    const knownTables = new Map(productNames.map(name => [tableKey(name), name]))
    const tables = productNames.map(name => introspectTable(database, name, knownTables))
    const foreignKeyViolations = readSqliteRows(database, 'PRAGMA foreign_key_check;')

    if (foreignKeyViolations.length > 0) {
      fail(`D1 export contains ${foreignKeyViolations.length} foreign-key violations; refusing to restore inconsistent source data.`)
    }

    const orderedTables = stableDependencyOrder(tables)
    const rowCount = orderedTables.reduce((total, table) => total + table.rowCount, 0)

    return {
      tableOrder: orderedTables.map(table => table.name),
      tables: orderedTables,
      rowCount,
      replaySql: buildReplaySql(orderedTables),
      sourceCountChunks: buildCountChunks(orderedTables),
      emptyCountChunks: buildCountChunks(orderedTables),
      replacementCountChunks: buildCountChunks(orderedTables)
    }
  } finally {
    database.close()
  }
}

function canonicalEvidenceFromTables(tables: D1RestoreTablePlan[]): D1ExportCanonicalEvidence {
  const canonicalTables = tables
    .slice()
    .sort((left, right) => {
      const leftKey = tableKey(left.name)
      const rightKey = tableKey(right.name)

      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
    })
  const digest = createHash('sha256')

  for (const table of canonicalTables) {
    digest.update(JSON.stringify({
      columns: table.columns,
      dependencies: table.dependencies,
      name: table.name,
      rowCount: table.rowCount
    }))
    digest.update('\n')

    for (const row of table.rows) {
      digest.update(JSON.stringify(row))
      digest.update('\n')
    }
  }

  return {
    digest: digest.digest('hex'),
    rowCount: canonicalTables.reduce((total, table) => total + table.rowCount, 0),
    tables: canonicalTables.map(table => ({
      name: table.name,
      columns: table.columns,
      dependencies: table.dependencies,
      rowCount: table.rowCount
    }))
  }
}

export function canonicalizeD1Export(exportSql: string): D1ExportCanonicalEvidence {
  return canonicalEvidenceFromTables(buildD1RestorePlan(exportSql).tables)
}

function assertCanonicalExports(
  source: D1ExportCanonicalEvidence,
  replacement: D1ExportCanonicalEvidence,
  replacementDatabase: string
) {
  if (source.tables.length !== replacement.tables.length || JSON.stringify(source.tables) !== JSON.stringify(replacement.tables) || source.digest !== replacement.digest) {
    fail(`D1 replacement "${replacementDatabase}" canonical export mismatch: source digest ${source.digest}, replacement digest ${replacement.digest}.`)
  }
}

function defaultReplacementConfigPath(configPath: string) {
  const absoluteConfigPath = resolve(configPath)
  const extension = extname(absoluteConfigPath)
  const stem = basename(absoluteConfigPath, extension)

  return join(dirname(absoluteConfigPath), `${stem}.replacement${extension || '.jsonc'}`)
}

function parseWranglerConfig(configText: string, label: string) {
  let parsed: unknown

  try {
    parsed = JSON.parse(configText) as unknown
  } catch {
    fail(`${label} must be JSON-compatible. Refusing to guess through comments or an unsupported config format.`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail(`${label} must contain a Wrangler object.`)
  }

  return parsed as Record<string, unknown>
}

function readSingleD1Binding(config: Record<string, unknown>, label: string) {
  const bindings = config.d1_databases

  if (!Array.isArray(bindings) || bindings.length !== 1) {
    fail(`${label} must contain exactly one top-level d1_databases binding; refusing to select a database implicitly.`)
  }

  const binding = bindings[0]

  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    fail(`${label} contains an invalid D1 binding.`)
  }

  const record = binding as Record<string, unknown>

  if (typeof record.migrations_dir !== 'string' || !record.migrations_dir) {
    fail(`${label} D1 binding must define migrations_dir.`)
  }

  return record
}

export function buildReplacementWranglerConfig(
  baseConfigText: string,
  replacementDatabase: string,
  replacementDatabaseId: string
) {
  const config = parseWranglerConfig(baseConfigText, 'Base Wrangler config')
  const binding = readSingleD1Binding(config, 'Base Wrangler config')

  binding.database_name = replacementDatabase
  binding.database_id = replacementDatabaseId

  return `${JSON.stringify(config, null, 2)}\n`
}

export function assertReplacementWranglerConfig(
  configText: string,
  replacementDatabase: string,
  replacementDatabaseId: string
) {
  const config = parseWranglerConfig(configText, 'Replacement Wrangler config')
  const binding = readSingleD1Binding(config, 'Replacement Wrangler config')

  if (binding.database_name !== replacementDatabase || binding.database_id !== replacementDatabaseId) {
    fail(`Replacement Wrangler config must bind database "${replacementDatabase}" (${replacementDatabaseId}) exactly.`)
  }
}

function buildCommand(args: string[]): RestoreD1ReplacementCommand {
  return {
    command: 'bunx',
    args: ['wrangler', ...args]
  }
}

function withConfig(args: string[], configPath: string) {
  return [...args, '--config', configPath]
}

function infoCommand(database: string, configPath: string) {
  return buildCommand(withConfig([
    'd1',
    'info',
    database,
    '--json'
  ], configPath))
}

function queryCommand(database: string, query: string, configPath: string) {
  return buildCommand(withConfig([
    'd1',
    'execute',
    database,
    '--remote',
    '--command',
    query,
    '--json'
  ], configPath))
}

function fileCommand(
  database: string,
  filePath: string,
  configPath: string,
  json: boolean,
  yes: boolean
) {
  return buildCommand(withConfig([
    'd1',
    'execute',
    database,
    '--remote',
    '--file',
    filePath,
    ...(json ? ['--json'] : []),
    ...(yes ? ['--yes'] : [])
  ], configPath))
}

function migrationCommand(database: string, configPath: string) {
  return buildCommand(withConfig([
    'd1',
    'migrations',
    'apply',
    database,
    '--remote'
  ], configPath))
}

export function buildD1RestoreCommandPlan(
  options: RestoreD1ReplacementOptions,
  plan: D1RestorePlan
): RestoreD1ReplacementCommandPlan {
  const configPath = options.configPath ?? defaultWranglerConfigPath
  const replacementConfigPath = options.replacementConfigPath ?? defaultReplacementConfigPath(configPath)
  const restoreSqlPath = options.restoreSqlPath ?? `${options.exportPath}.restore.sql`
  const replacementExportPath = options.replacementExportPath ?? `${options.exportPath}.replacement.sql`

  return {
    replacementConfigPath,
    sourceInfo: infoCommand(options.sourceDatabase, configPath),
    sourceMigrations: queryCommand(options.sourceDatabase, migrationStateQuery, configPath),
    exportSource: buildCommand(withConfig([
      'd1',
      'export',
      options.sourceDatabase,
      '--remote',
      '--output',
      options.exportPath,
      '--yes'
    ], configPath)),
    sourceCountChunks: plan.sourceCountChunks.map(chunk => queryCommand(options.sourceDatabase, chunk.sql, configPath)),
    replacementInfo: infoCommand(options.replacementDatabase, replacementConfigPath),
    replacementInventory: queryCommand(options.replacementDatabase, productTableInventoryQuery, replacementConfigPath),
    applyMigrations: migrationCommand(options.replacementDatabase, replacementConfigPath),
    replacementMigrations: queryCommand(options.replacementDatabase, migrationStateQuery, replacementConfigPath),
    replacementEmptyCountChunks: plan.emptyCountChunks.map(chunk => queryCommand(options.replacementDatabase, chunk.sql, replacementConfigPath)),
    replay: fileCommand(options.replacementDatabase, restoreSqlPath, replacementConfigPath, false, true),
    replacementExport: buildCommand(withConfig([
      'd1',
      'export',
      options.replacementDatabase,
      '--remote',
      '--output',
      replacementExportPath,
      '--yes'
    ], replacementConfigPath)),
    replacementCountChunks: plan.replacementCountChunks.map(chunk => queryCommand(options.replacementDatabase, chunk.sql, replacementConfigPath)),
    foreignKeyCheck: queryCommand(options.replacementDatabase, foreignKeyCheckQuery, replacementConfigPath),
    quickCheck: queryCommand(options.replacementDatabase, quickCheckQuery, replacementConfigPath),
    finalReplacementInfo: infoCommand(options.replacementDatabase, replacementConfigPath),
    finalReplacementMigrations: queryCommand(options.replacementDatabase, migrationStateQuery, replacementConfigPath)
  }
}

function readJsonValue(output: string, message: string): unknown {
  try {
    return JSON.parse(output) as unknown
  } catch {
    fail(message)
  }
}

function readJsonRows(output: string) {
  const payload = readJsonValue(output, 'Unable to parse Wrangler D1 JSON query output.')
  const result = payload && typeof payload === 'object' && !Array.isArray(payload) && 'result' in payload
    ? (payload as { result: unknown }).result
    : payload
  const resultSets = Array.isArray(result) ? result : [result]
  const rows: Array<Record<string, unknown>> = []

  for (const resultSet of resultSets) {
    if (!resultSet || typeof resultSet !== 'object' || Array.isArray(resultSet)) {
      if (resultSet === null || resultSet === undefined) {
        continue
      }

      fail('Wrangler D1 JSON query output contains an invalid result set.')
    }

    const resultRecord = resultSet as Record<string, unknown>

    if ('results' in resultRecord) {
      if (!Array.isArray(resultRecord.results)) {
        fail('Wrangler D1 JSON query output contains an invalid result array.')
      }

      for (const row of resultRecord.results) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          fail('Wrangler D1 JSON query output contains an invalid row.')
        }

        rows.push(row as Record<string, unknown>)
      }
      continue
    }

    rows.push(resultRecord)
  }

  return rows
}

function parseSize(value: unknown) {
  if (value === undefined || value === null) {
    return null
  }

  const parsed = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/u.test(value) ? Number(value) : NaN

  if (!Number.isFinite(parsed) || parsed < 0) {
    fail('Wrangler D1 info JSON output contains an invalid database size.')
  }

  return parsed
}

export function parseD1RestoreInfo(output: string): D1RestoreDatabaseInfo {
  const payload = readJsonValue(output, 'Unable to parse Wrangler D1 info JSON output.')
  const result = payload && typeof payload === 'object' && !Array.isArray(payload) && 'result' in payload
    ? (payload as { result: unknown }).result
    : payload

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    fail('Wrangler D1 info JSON output does not contain a database record.')
  }

  const record = result as unknown as ParsedD1InfoRecord

  if (typeof record.name !== 'string' || typeof record.uuid !== 'string') {
    fail('Wrangler D1 info JSON output is missing the database name or UUID.')
  }

  return {
    name: record.name,
    uuid: record.uuid,
    jurisdiction: typeof record.jurisdiction === 'string' ? record.jurisdiction.toLowerCase() : null,
    runningInRegion: typeof record.running_in_region === 'string' ? record.running_in_region.toLowerCase() : null,
    readReplicationMode: record.read_replication && typeof record.read_replication.mode === 'string'
      ? record.read_replication.mode.toLowerCase()
      : null,
    size: parseSize(record.database_size ?? record.size)
  }
}

function readMigrationNames(output: string) {
  return readJsonRows(output).map((row) => {
    if (typeof row.name !== 'string' || !row.name) {
      fail('D1 migration query did not return a valid migration name.')
    }

    return row.name
  })
}

function readTableNames(output: string) {
  return readJsonRows(output).map((row) => {
    if (typeof row.name !== 'string' || !row.name) {
      fail('D1 replacement inventory query did not return a valid table name.')
    }

    return row.name
  })
}

function readCountRows(output: string) {
  return readJsonRows(output).map((row) => {
    if (typeof row.table_name !== 'string' || typeof row.row_count !== 'number' || !Number.isInteger(row.row_count) || row.row_count < 0) {
      fail('D1 restore count query did not return a valid table count.')
    }

    return {
      tableName: row.table_name,
      rowCount: row.row_count
    }
  })
}

function assertMigrationState(actual: string[], expected: readonly string[], databaseName: string) {
  const actualSorted = [...actual].sort()
  const expectedSorted = [...expected].sort()

  if (actualSorted.length !== expectedSorted.length || actualSorted.some((name, index) => name !== expectedSorted[index])) {
    fail(`D1 database "${databaseName}" migration state mismatch: expected [${expectedSorted.join(', ')}], observed [${actualSorted.join(', ')}].`)
  }
}

function assertEmptyInventory(output: string, databaseName: string) {
  const tables = readTableNames(output)

  if (tables.length > 0) {
    fail(`D1 replacement "${databaseName}" is not empty; found product tables: ${tables.join(', ')}. Refusing to write into a non-empty target.`)
  }
}

function assertCounts(
  output: string,
  expectedTables: D1RestoreTablePlan[],
  databaseName: string
) {
  const rows = readCountRows(output)
  const expected = new Map(expectedTables.map(table => [table.name, table]))
  const observed = new Map(rows.map(row => [row.tableName, row]))

  if (rows.length !== expected.size || observed.size !== expected.size || [...expected.keys()].some(name => !observed.has(name))) {
    fail(`D1 database "${databaseName}" count verification did not return every expected table exactly once.`)
  }

  for (const [tableName, table] of expected) {
    const row = observed.get(tableName)!

    if (row.rowCount !== table.rowCount) {
      fail(`D1 database "${databaseName}" table "${tableName}" row count mismatch: expected ${table.rowCount}, observed ${row.rowCount}.`)
    }
  }
}

function assertNoForeignKeyViolations(output: string, databaseName: string) {
  const rows = readJsonRows(output)

  if (rows.length > 0) {
    fail(`D1 database "${databaseName}" has ${rows.length} foreign-key violations.`)
  }
}

function assertQuickCheck(output: string, databaseName: string) {
  const rows = readJsonRows(output)
  const value = rows.length === 1 ? Object.values(rows[0]!)[0] : undefined

  if (String(value).toLowerCase() !== 'ok') {
    fail(`D1 database "${databaseName}" failed SQLite quick_check.`)
  }
}

function assertDatabaseInfo(
  info: D1RestoreDatabaseInfo,
  expectedName: string,
  expectedId: string,
  placement?: D1PlacementConfiguration
) {
  if (info.name !== expectedName || info.uuid.toLowerCase() !== expectedId.toLowerCase()) {
    fail(`D1 database inspection returned a different target for "${expectedName}". Refusing to continue.`)
  }

  if (placement?.jurisdiction && info.jurisdiction !== placement.jurisdiction) {
    fail(`D1 database "${expectedName}" placement mismatch: expected jurisdiction "${placement.jurisdiction}", observed "${info.jurisdiction ?? 'unknown'}".`)
  }

  if (placement?.primaryLocationHint && info.runningInRegion !== placement.primaryLocationHint) {
    fail(`D1 database "${expectedName}" placement mismatch: expected primary location "${placement.primaryLocationHint}", observed "${info.runningInRegion ?? 'unknown'}".`)
  }
}

function assertDatabaseSize(info: D1RestoreDatabaseInfo, databaseName: string) {
  if (info.size === null || info.size <= 0) {
    fail(`D1 database "${databaseName}" did not report a positive post-restore database size.`)
  }
}

function assertPlacementConfiguration(placement: D1PlacementConfiguration) {
  if (Boolean(placement.jurisdiction) === Boolean(placement.primaryLocationHint)) {
    fail('D1 restore requires exactly one explicit jurisdiction or primary location hint.')
  }

  if (placement.jurisdiction && !d1Jurisdictions.includes(placement.jurisdiction)) {
    fail(`D1 jurisdiction must be one of: ${d1Jurisdictions.join(', ')}.`)
  }

  if (placement.primaryLocationHint && !d1PrimaryLocationHints.includes(placement.primaryLocationHint)) {
    fail(`D1 primary location hint must be one of: ${d1PrimaryLocationHints.join(', ')}.`)
  }
}

function resolvedPaths(options: RestoreD1ReplacementOptions) {
  const configPath = options.configPath ?? defaultWranglerConfigPath
  const replacementConfigPath = options.replacementConfigPath ?? defaultReplacementConfigPath(configPath)
  const restoreSqlPath = options.restoreSqlPath ?? `${options.exportPath}.restore.sql`
  const replacementExportPath = options.replacementExportPath ?? `${options.exportPath}.replacement.sql`

  return {
    configPath,
    replacementConfigPath,
    restoreSqlPath,
    replacementExportPath
  }
}

function validateOptions(options: RestoreD1ReplacementOptions) {
  assertSafeName(options.sourceDatabase, 'Source database')
  assertSafeName(options.replacementDatabase, 'Replacement database')
  assertDatabaseId(options.sourceDatabaseId, 'Source database ID')
  assertDatabaseId(options.replacementDatabaseId, 'Replacement database ID')
  assertPath(options.exportPath, 'Export path')
  assertPlacementConfiguration(options.placement)

  const paths = resolvedPaths(options)
  assertPath(paths.configPath, 'Wrangler config path')
  assertPath(paths.replacementConfigPath, 'Replacement Wrangler config path')
  assertPath(paths.restoreSqlPath, 'Restore SQL path')
  assertPath(paths.replacementExportPath, 'Replacement export path')

  const allPaths = [options.exportPath, paths.replacementConfigPath, paths.restoreSqlPath, paths.replacementExportPath].map(path => resolve(path))

  if (new Set(allPaths).size !== allPaths.length) {
    fail('Source export, replacement config, restore SQL, and replacement export paths must be different files.')
  }

  if (options.sourceDatabase === options.replacementDatabase || options.sourceDatabaseId.toLowerCase() === options.replacementDatabaseId.toLowerCase()) {
    fail('Source and replacement must be different explicitly selected databases.')
  }
}

function failureWithRollbackGuidance(error: unknown, options: RestoreD1ReplacementOptions): Error {
  const message = error instanceof Error ? error.message : String(error)

  return new Error(`${message} Binding switch is not permitted. Source database "${options.sourceDatabase}" (${options.sourceDatabaseId}) remains unchanged and is the rollback target; replacement "${options.replacementDatabase}" (${options.replacementDatabaseId}) remains quarantined for inspection or separately approved cleanup.`)
}

async function readMigrationFileNames() {
  return (await readdir(join(process.cwd(), 'drizzle')))
    .filter(fileName => /^\d+.*\.sql$/u.test(fileName))
    .sort()
}

async function prepareReplacementConfig(
  options: RestoreD1ReplacementOptions,
  paths: ReturnType<typeof resolvedPaths>,
  fileSystem: SqlFileSystem
) {
  if (options.replacementConfigPath) {
    const configText = await fileSystem.readFile(paths.replacementConfigPath)
    assertReplacementWranglerConfig(configText, options.replacementDatabase, options.replacementDatabaseId)
    return
  }

  const baseConfigText = await fileSystem.readFile(paths.configPath)
  const replacementConfigText = buildReplacementWranglerConfig(
    baseConfigText,
    options.replacementDatabase,
    options.replacementDatabaseId
  )

  await fileSystem.writeFile(paths.replacementConfigPath, replacementConfigText)
  assertReplacementWranglerConfig(replacementConfigText, options.replacementDatabase, options.replacementDatabaseId)
}

async function runCommand(runner: CommandRunner, command: RestoreD1ReplacementCommand) {
  return runner(command.command, command.args)
}

function planSummary(plan: D1RestorePlan) {
  return {
    tableOrder: plan.tableOrder,
    tables: plan.tables.map(table => ({
      name: table.name,
      columns: table.columns,
      dependencies: table.dependencies,
      rowCount: table.rowCount
    })),
    rowCount: plan.rowCount
  }
}

export async function restoreD1Replacement(options: RestoreD1ReplacementOptions): Promise<D1RestoreResult> {
  const fileSystem = options.fileSystem ?? defaultFileSystem
  const migrationNames = options.migrationNames ? [...options.migrationNames] : await readMigrationFileNames()
  const exportSql = await fileSystem.readFile(options.exportPath)
  const plan = buildD1RestorePlan(exportSql)
  const paths = resolvedPaths(options)

  validateOptions(options)

  if (!options.apply) {
    return {
      dryRun: true,
      bindingSwitchPermitted: false,
      source: {
        name: options.sourceDatabase,
        uuid: options.sourceDatabaseId,
        jurisdiction: null,
        runningInRegion: null,
        readReplicationMode: null,
        size: null
      },
      replacement: {
        name: options.replacementDatabase,
        uuid: options.replacementDatabaseId,
        jurisdiction: options.placement.jurisdiction ?? null,
        runningInRegion: options.placement.primaryLocationHint ?? null,
        readReplicationMode: null,
        size: null
      },
      plan: planSummary(plan),
      migrationNames,
      replacementConfigPath: paths.replacementConfigPath,
      restoreSqlPath: paths.restoreSqlPath,
      replacementExportPath: paths.replacementExportPath,
      canonicalDigests: null
    }
  }

  const runner = options.runner ?? createWranglerCommandRunner(process.env)
  let sourceInfo: D1RestoreDatabaseInfo

  try {
    const commandPlan = buildD1RestoreCommandPlan(options, plan)
    sourceInfo = parseD1RestoreInfo((await runCommand(runner, commandPlan.sourceInfo)).stdout)
    assertDatabaseInfo(sourceInfo, options.sourceDatabase, options.sourceDatabaseId)
    assertMigrationState(
      readMigrationNames((await runCommand(runner, commandPlan.sourceMigrations)).stdout),
      migrationNames,
      options.sourceDatabase
    )

    await runCommand(runner, commandPlan.exportSource)
    const exportedPlan = buildD1RestorePlan(await fileSystem.readFile(options.exportPath))

    if (exportedPlan.rowCount !== plan.rowCount || exportedPlan.tableOrder.join('\u0000') !== plan.tableOrder.join('\u0000')) {
      fail('The source export changed while it was being inspected; refusing to restore a moving snapshot.')
    }

    const exportedCommandPlan = buildD1RestoreCommandPlan(options, exportedPlan)

    for (const [index, command] of exportedCommandPlan.sourceCountChunks.entries()) {
      assertCounts(
        (await runCommand(runner, command)).stdout,
        exportedPlan.tables.slice(index * maxTablesPerVerificationFile, (index + 1) * maxTablesPerVerificationFile),
        options.sourceDatabase
      )
    }

    await prepareReplacementConfig(options, paths, fileSystem)

    const replacementInfo = parseD1RestoreInfo((await runCommand(runner, exportedCommandPlan.replacementInfo)).stdout)
    assertDatabaseInfo(
      replacementInfo,
      options.replacementDatabase,
      options.replacementDatabaseId,
      options.placement
    )
    assertEmptyInventory(
      (await runCommand(runner, exportedCommandPlan.replacementInventory)).stdout,
      options.replacementDatabase
    )

    await runCommand(runner, exportedCommandPlan.applyMigrations)
    assertMigrationState(
      readMigrationNames((await runCommand(runner, exportedCommandPlan.replacementMigrations)).stdout),
      migrationNames,
      options.replacementDatabase
    )

    for (const [index, command] of exportedCommandPlan.replacementEmptyCountChunks.entries()) {
      assertCounts(
        (await runCommand(runner, command)).stdout,
        exportedPlan.tables
          .slice(index * maxTablesPerVerificationFile, (index + 1) * maxTablesPerVerificationFile)
          .map(table => ({ ...table, rowCount: 0 })),
        options.replacementDatabase
      )
    }

    await fileSystem.writeFile(paths.restoreSqlPath, exportedPlan.replaySql)
    await runCommand(runner, exportedCommandPlan.replay)
    for (const [index, command] of exportedCommandPlan.replacementCountChunks.entries()) {
      assertCounts(
        (await runCommand(runner, command)).stdout,
        exportedPlan.tables.slice(index * maxTablesPerVerificationFile, (index + 1) * maxTablesPerVerificationFile),
        options.replacementDatabase
      )
    }

    await runCommand(runner, exportedCommandPlan.replacementExport)
    const sourceEvidence = canonicalizeD1Export(await fileSystem.readFile(options.exportPath))
    const replacementEvidence = canonicalizeD1Export(await fileSystem.readFile(paths.replacementExportPath))
    assertCanonicalExports(sourceEvidence, replacementEvidence, options.replacementDatabase)

    assertNoForeignKeyViolations(
      (await runCommand(runner, exportedCommandPlan.foreignKeyCheck)).stdout,
      options.replacementDatabase
    )
    assertQuickCheck(
      (await runCommand(runner, exportedCommandPlan.quickCheck)).stdout,
      options.replacementDatabase
    )

    const finalReplacementInfo = parseD1RestoreInfo((await runCommand(runner, exportedCommandPlan.finalReplacementInfo)).stdout)
    assertDatabaseInfo(
      finalReplacementInfo,
      options.replacementDatabase,
      options.replacementDatabaseId,
      options.placement
    )
    assertDatabaseSize(finalReplacementInfo, options.replacementDatabase)
    assertMigrationState(
      readMigrationNames((await runCommand(runner, exportedCommandPlan.finalReplacementMigrations)).stdout),
      migrationNames,
      options.replacementDatabase
    )

    return {
      dryRun: false,
      bindingSwitchPermitted: true,
      source: sourceInfo,
      replacement: finalReplacementInfo,
      plan: planSummary(exportedPlan),
      migrationNames,
      replacementConfigPath: paths.replacementConfigPath,
      restoreSqlPath: paths.restoreSqlPath,
      replacementExportPath: paths.replacementExportPath,
      canonicalDigests: {
        source: sourceEvidence.digest,
        replacement: replacementEvidence.digest
      }
    }
  } catch (error) {
    throw failureWithRollbackGuidance(error, options)
  }
}

function parsePlacement(value: string, label: string, allowedValues: readonly string[]) {
  const normalized = value.trim().toLowerCase()

  if (!allowedValues.includes(normalized)) {
    fail(`${label} must be one of: ${allowedValues.join(', ')}.`)
  }

  return normalized
}

export function parseCliArguments(argv: string[]) {
  const values = new Map<string, string>()
  let apply = false

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === '--apply') {
      apply = true
      continue
    }

    if (!argument?.startsWith('--')) {
      fail(`Unexpected argument "${argument ?? ''}".`)
    }

    const name = argument.slice(2)
    const value = argv[index + 1]

    if (!value || value.startsWith('--')) {
      fail(`Argument "${argument}" requires a value.`)
    }

    values.set(name, value)
    index += 1
  }

  const required = ['source', 'source-id', 'replacement', 'replacement-id', 'export']
  for (const name of required) {
    if (!values.get(name)) {
      fail(`Missing required argument --${name}.`)
    }
  }

  const jurisdiction = values.get('jurisdiction')
  const location = values.get('location')

  if (Boolean(jurisdiction) === Boolean(location)) {
    fail('Provide exactly one of --jurisdiction or --location.')
  }

  return {
    sourceDatabase: values.get('source')!,
    sourceDatabaseId: values.get('source-id')!,
    replacementDatabase: values.get('replacement')!,
    replacementDatabaseId: values.get('replacement-id')!,
    exportPath: values.get('export')!,
    configPath: values.get('config'),
    replacementConfigPath: values.get('replacement-config'),
    restoreSqlPath: values.get('restore-sql'),
    replacementExportPath: values.get('replacement-export'),
    placement: jurisdiction
      ? { jurisdiction: parsePlacement(jurisdiction, '--jurisdiction', d1Jurisdictions) as D1PlacementConfiguration['jurisdiction'] }
      : { primaryLocationHint: parsePlacement(location!, '--location', d1PrimaryLocationHints) as D1PlacementConfiguration['primaryLocationHint'] },
    apply
  } satisfies RestoreD1ReplacementOptions
}

if (import.meta.main) {
  try {
    const options = parseCliArguments(process.argv.slice(2))
    const result = await restoreD1Replacement(options)
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)

    if (result.dryRun) {
      process.stdout.write('Dry run only: pass --apply after reviewing the plan. No remote command was executed.\n')
    } else if (result.bindingSwitchPermitted) {
      process.stdout.write('Restore verification passed. Binding switch remains a separate explicitly approved deployment action.\n')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to restore the D1 replacement.'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}
