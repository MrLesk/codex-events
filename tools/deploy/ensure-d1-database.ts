import 'dotenv/config'

import { appendFile } from 'node:fs/promises'

import {
  parseDeployTarget,
  resolveD1PlacementConfiguration,
  resolveDeployResourceNames,
  type D1PlacementConfiguration,
  type DeployTarget,
  type EnvironmentValues
} from './generate-wrangler-config'
import { createWranglerCommandRunner, type CommandRunner } from './wrangler-command'

export type { CommandRunner } from './wrangler-command'

export interface D1Database {
  name: string
  uuid: string
  jurisdiction?: string | null
}

export interface D1DatabaseInfo extends D1Database {
  runningInRegion?: string | null
  readReplicationMode?: string | null
}

export interface D1PlacementReport {
  jurisdiction: string | null
  runningInRegion: string | null
  readReplicationMode: string | null
}

export interface EnsuredD1Database {
  databaseName: string
  databaseId: string
  created: boolean
  placement: D1PlacementReport
}

function assertGitHubValue(name: string, value: string) {
  if (/[\r\n]/.test(value)) {
    throw new Error(`${name} cannot contain line breaks.`)
  }
}

function readListEntries(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }

  if (
    payload
    && typeof payload === 'object'
    && 'result' in payload
    && Array.isArray(payload.result)
  ) {
    return payload.result
  }

  throw new Error('Unable to parse Wrangler D1 database list JSON output.')
}

function readObject(value: unknown, errorMessage: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(errorMessage)
  }

  return value as Record<string, unknown>
}

function readOptionalString(entry: Record<string, unknown>, key: string, errorMessage: string) {
  const value = entry[key]

  if (value === undefined || value === null) {
    return value ?? undefined
  }

  if (typeof value !== 'string' || /[\r\n]/.test(value)) {
    throw new Error(errorMessage)
  }

  return value.trim().toLowerCase()
}

function readRequiredString(entry: Record<string, unknown>, key: string, errorMessage: string) {
  const value = entry[key]

  if (typeof value !== 'string' || !value || /[\r\n]/.test(value)) {
    throw new Error(errorMessage)
  }

  return value
}

export function parseD1DatabaseListOutput(output: string): D1Database[] {
  const payload = JSON.parse(output) as unknown

  return readListEntries(payload).map((entry) => {
    const record = readObject(entry, 'Wrangler D1 database list JSON output contained an unexpected database record.')
    const database: D1Database = {
      name: readRequiredString(record, 'name', 'Wrangler D1 database list JSON output contained an unexpected database record.'),
      uuid: readRequiredString(record, 'uuid', 'Wrangler D1 database list JSON output contained an unexpected database record.')
    }

    if ('jurisdiction' in record) {
      database.jurisdiction = readOptionalString(
        record,
        'jurisdiction',
        'Wrangler D1 database list JSON output contained an invalid jurisdiction.'
      ) ?? null
    }

    return database
  })
}

export function parseD1DatabaseInfoOutput(output: string): D1DatabaseInfo {
  const payload = JSON.parse(output) as unknown
  const payloadRecord = readObject(payload, 'Unable to parse Wrangler D1 database info JSON output.')
  const record = 'result' in payloadRecord
    ? readObject(payloadRecord.result, 'Unable to parse Wrangler D1 database info JSON output.')
    : payloadRecord
  const errorMessage = 'Wrangler D1 database info JSON output contained an unexpected database record.'
  const database: D1DatabaseInfo = {
    name: readRequiredString(record, 'name', errorMessage),
    uuid: readRequiredString(record, 'uuid', errorMessage)
  }

  if ('jurisdiction' in record) {
    database.jurisdiction = readOptionalString(record, 'jurisdiction', 'Wrangler D1 database info JSON output contained an invalid jurisdiction.') ?? null
  }

  if ('running_in_region' in record) {
    database.runningInRegion = readOptionalString(record, 'running_in_region', 'Wrangler D1 database info JSON output contained an invalid running region.') ?? null
  }

  if ('read_replication' in record) {
    const readReplication = readObject(record.read_replication, 'Wrangler D1 database info JSON output contained an invalid read replication record.')
    database.readReplicationMode = readOptionalString(readReplication, 'mode', 'Wrangler D1 database info JSON output contained an invalid read replication mode.') ?? null
  }

  return database
}

export function findD1DatabaseByName(databases: D1Database[], databaseName: string) {
  const matches = databases.filter(database => database.name === databaseName)

  if (matches.length > 1) {
    throw new Error(`Multiple D1 databases named "${databaseName}" were returned by Cloudflare.`)
  }

  return matches[0] ?? null
}

async function listD1Databases(runner: CommandRunner) {
  const result = await runner('bunx', ['wrangler', 'd1', 'list', '--json'])
  return parseD1DatabaseListOutput(result.stdout)
}

async function inspectD1Database(runner: CommandRunner, databaseName: string) {
  const result = await runner('bunx', ['wrangler', 'd1', 'info', databaseName, '--json'])
  return parseD1DatabaseInfoOutput(result.stdout)
}

function placementReport(info: D1DatabaseInfo): D1PlacementReport {
  return {
    jurisdiction: info.jurisdiction ?? null,
    runningInRegion: info.runningInRegion ?? null,
    readReplicationMode: info.readReplicationMode ?? null
  }
}

export function buildD1CreateArguments(databaseName: string, placement: D1PlacementConfiguration) {
  if (placement.jurisdiction) {
    return ['wrangler', 'd1', 'create', databaseName, '--jurisdiction', placement.jurisdiction]
  }

  if (placement.primaryLocationHint) {
    return ['wrangler', 'd1', 'create', databaseName, '--location', placement.primaryLocationHint]
  }

  throw new Error('D1 placement must contain a jurisdiction or primary location hint.')
}

export function validateD1DatabasePlacement(
  databaseName: string,
  expectedPlacement: D1PlacementConfiguration,
  info: D1DatabaseInfo
) {
  const actualPlacement = placementReport(info)

  if (expectedPlacement.jurisdiction && actualPlacement.jurisdiction !== expectedPlacement.jurisdiction) {
    throw new Error(`D1 database "${databaseName}" placement mismatch: expected jurisdiction "${expectedPlacement.jurisdiction}", observed "${actualPlacement.jurisdiction ?? 'unknown'}". Database placement is immutable; create and verify a replacement with the requested placement before switching the deployment binding.`)
  }

  if (expectedPlacement.primaryLocationHint && actualPlacement.runningInRegion !== expectedPlacement.primaryLocationHint) {
    throw new Error(`D1 database "${databaseName}" placement mismatch: expected primary location "${expectedPlacement.primaryLocationHint}", observed "${actualPlacement.runningInRegion ?? 'unknown'}". Database placement is immutable; create and verify a replacement with the requested placement before switching the deployment binding.`)
  }

  return actualPlacement
}

async function inspectAndValidateD1Database(
  runner: CommandRunner,
  database: D1Database,
  expectedPlacement: D1PlacementConfiguration
) {
  const info = await inspectD1Database(runner, database.name)

  if (info.name !== database.name || info.uuid !== database.uuid) {
    throw new Error(`D1 database inspection returned a different database for "${database.name}". Refusing to continue.`)
  }

  return validateD1DatabasePlacement(database.name, expectedPlacement, info)
}

export async function ensureDeployD1Database(options: {
  target: DeployTarget
  environment?: EnvironmentValues
  runner?: CommandRunner
}): Promise<EnsuredD1Database> {
  const environment = options.environment ?? process.env
  const runner = options.runner ?? createWranglerCommandRunner(environment)
  const databaseName = resolveDeployResourceNames(options.target, environment).d1DatabaseName
  const expectedPlacement = resolveD1PlacementConfiguration(environment)
  const existingDatabase = findD1DatabaseByName(await listD1Databases(runner), databaseName)

  if (existingDatabase) {
    const placement = await inspectAndValidateD1Database(runner, existingDatabase, expectedPlacement)

    return {
      databaseName,
      databaseId: existingDatabase.uuid,
      created: false,
      placement
    }
  }

  try {
    await runner('bunx', buildD1CreateArguments(databaseName, expectedPlacement))
  } catch (error) {
    const databaseAfterFailedCreate = findD1DatabaseByName(await listD1Databases(runner), databaseName)

    if (databaseAfterFailedCreate) {
      const placement = await inspectAndValidateD1Database(runner, databaseAfterFailedCreate, expectedPlacement)

      return {
        databaseName,
        databaseId: databaseAfterFailedCreate.uuid,
        created: false,
        placement
      }
    }

    throw error
  }

  const createdDatabase = findD1DatabaseByName(await listD1Databases(runner), databaseName)

  if (!createdDatabase) {
    throw new Error(`D1 database "${databaseName}" was created, but Wrangler did not return it in the database list.`)
  }

  const placement = await inspectAndValidateD1Database(runner, createdDatabase, expectedPlacement)

  return {
    databaseName,
    databaseId: createdDatabase.uuid,
    created: true,
    placement
  }
}

export async function writeGitHubD1DatabaseOutputs(
  database: EnsuredD1Database,
  environment: EnvironmentValues = process.env
) {
  assertGitHubValue('RESOLVED_D1_DATABASE_ID', database.databaseId)
  assertGitHubValue('d1_database_id', database.databaseId)
  assertGitHubValue('d1_database_name', database.databaseName)
  assertGitHubValue('d1_jurisdiction', database.placement.jurisdiction ?? '')
  assertGitHubValue('d1_running_in_region', database.placement.runningInRegion ?? '')
  assertGitHubValue('d1_read_replication_mode', database.placement.readReplicationMode ?? '')

  if (environment.GITHUB_ENV) {
    await appendFile(environment.GITHUB_ENV, `RESOLVED_D1_DATABASE_ID=${database.databaseId}\nD1_ACTUAL_JURISDICTION=${database.placement.jurisdiction ?? ''}\nD1_ACTUAL_RUNNING_IN_REGION=${database.placement.runningInRegion ?? ''}\nD1_READ_REPLICATION_MODE=${database.placement.readReplicationMode ?? ''}\n`, 'utf8')
  }

  if (environment.GITHUB_OUTPUT) {
    await appendFile(
      environment.GITHUB_OUTPUT,
      `d1_database_id=${database.databaseId}\nd1_database_name=${database.databaseName}\nd1_jurisdiction=${database.placement.jurisdiction ?? ''}\nd1_running_in_region=${database.placement.runningInRegion ?? ''}\nd1_read_replication_mode=${database.placement.readReplicationMode ?? ''}\n`,
      'utf8'
    )
  }
}

if (import.meta.main) {
  try {
    const target = parseDeployTarget(process.argv[2])
    const database = await ensureDeployD1Database({ target })
    await writeGitHubD1DatabaseOutputs(database)
    process.stdout.write(`${database.created ? 'Created' : 'Found'} D1 database ${database.databaseName} (${database.databaseId}); jurisdiction=${database.placement.jurisdiction ?? 'none'}, running_in_region=${database.placement.runningInRegion ?? 'unknown'}, read_replication=${database.placement.readReplicationMode ?? 'unknown'}.\n`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to ensure the D1 database.'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}
