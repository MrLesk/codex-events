import 'dotenv/config'

import { execFile } from 'node:child_process'
import { appendFile } from 'node:fs/promises'
import { promisify } from 'node:util'

import {
  parseDeployTarget,
  resolveDeployResourceNames,
  type DeployTarget,
  type EnvironmentValues
} from './generate-wrangler-config'

const execFileAsync = promisify(execFile)

interface CommandResult {
  stdout: string
  stderr: string
}

export type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>

export interface D1Database {
  name: string
  uuid: string
}

export interface EnsuredD1Database {
  databaseName: string
  databaseId: string
  created: boolean
}

async function runCommand(command: string, args: string[]): Promise<CommandResult> {
  try {
    const result = await execFileAsync(command, args, {
      env: process.env,
      maxBuffer: 10 * 1024 * 1024
    })

    return {
      stdout: String(result.stdout),
      stderr: String(result.stderr)
    }
  } catch (error) {
    if (error && typeof error === 'object') {
      const output = [
        'stdout' in error ? String(error.stdout ?? '').trim() : '',
        'stderr' in error ? String(error.stderr ?? '').trim() : ''
      ].filter(Boolean).join('\n')

      if (output) {
        throw new Error(output)
      }
    }

    throw error
  }
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

export function parseD1DatabaseListOutput(output: string): D1Database[] {
  const payload = JSON.parse(output) as unknown

  return readListEntries(payload).map((entry) => {
    if (
      !entry
      || typeof entry !== 'object'
      || !('name' in entry)
      || !('uuid' in entry)
      || typeof entry.name !== 'string'
      || typeof entry.uuid !== 'string'
    ) {
      throw new Error('Wrangler D1 database list JSON output contained an unexpected database record.')
    }

    return {
      name: entry.name,
      uuid: entry.uuid
    }
  })
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

export async function ensureDeployD1Database(options: {
  target: DeployTarget
  environment?: EnvironmentValues
  runner?: CommandRunner
}): Promise<EnsuredD1Database> {
  const environment = options.environment ?? process.env
  const runner = options.runner ?? runCommand
  const databaseName = resolveDeployResourceNames(options.target, environment).d1DatabaseName
  const existingDatabase = findD1DatabaseByName(await listD1Databases(runner), databaseName)

  if (existingDatabase) {
    return {
      databaseName,
      databaseId: existingDatabase.uuid,
      created: false
    }
  }

  try {
    await runner('bunx', ['wrangler', 'd1', 'create', databaseName])
  } catch (error) {
    const databaseAfterFailedCreate = findD1DatabaseByName(await listD1Databases(runner), databaseName)

    if (databaseAfterFailedCreate) {
      return {
        databaseName,
        databaseId: databaseAfterFailedCreate.uuid,
        created: false
      }
    }

    throw error
  }

  const createdDatabase = findD1DatabaseByName(await listD1Databases(runner), databaseName)

  if (!createdDatabase) {
    throw new Error(`D1 database "${databaseName}" was created, but Wrangler did not return it in the database list.`)
  }

  return {
    databaseName,
    databaseId: createdDatabase.uuid,
    created: true
  }
}

export async function writeGitHubD1DatabaseOutputs(
  database: EnsuredD1Database,
  environment: EnvironmentValues = process.env
) {
  assertGitHubValue('DEPLOY_RESOLVED_D1_DATABASE_ID', database.databaseId)
  assertGitHubValue('d1_database_id', database.databaseId)
  assertGitHubValue('d1_database_name', database.databaseName)

  if (environment.GITHUB_ENV) {
    await appendFile(environment.GITHUB_ENV, `DEPLOY_RESOLVED_D1_DATABASE_ID=${database.databaseId}\n`, 'utf8')
  }

  if (environment.GITHUB_OUTPUT) {
    await appendFile(
      environment.GITHUB_OUTPUT,
      `d1_database_id=${database.databaseId}\nd1_database_name=${database.databaseName}\n`,
      'utf8'
    )
  }
}

if (import.meta.main) {
  try {
    const target = parseDeployTarget(process.argv[2])
    const database = await ensureDeployD1Database({ target })
    await writeGitHubD1DatabaseOutputs(database)
    process.stdout.write(`${database.created ? 'Created' : 'Found'} D1 database ${database.databaseName} (${database.databaseId}).\n`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to ensure the D1 database.'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}
