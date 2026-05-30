import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, test } from 'vitest'

import {
  ensureDeployD1Database,
  parseD1DatabaseListOutput,
  writeGitHubD1DatabaseOutputs,
  type CommandRunner
} from '../../../../tools/deploy/ensure-d1-database'

const createdDatabaseId = '22222222-2222-4222-8222-222222222222'
const existingDatabaseId = '11111111-1111-4111-8111-111111111111'

let tempDirectories: string[] = []

afterEach(async () => {
  await Promise.all(tempDirectories.map(directory => rm(directory, {
    force: true,
    recursive: true
  })))
  tempDirectories = []
})

function d1ListOutput(databases: Array<{ name: string, uuid: string }>) {
  return JSON.stringify(databases)
}

function createRunner(results: Array<string | Error>) {
  const calls: Array<{ command: string, args: string[] }> = []
  const runner: CommandRunner = async (command, args) => {
    calls.push({ command, args })

    const result = results.shift()

    if (result instanceof Error) {
      throw result
    }

    return {
      stdout: result ?? '',
      stderr: ''
    }
  }

  return {
    calls,
    runner
  }
}

describe('deploy D1 database provisioning', () => {
  test('parses Wrangler D1 list output', () => {
    expect(parseD1DatabaseListOutput(JSON.stringify({
      result: [
        {
          name: 'codex-events',
          uuid: existingDatabaseId
        }
      ]
    }))).toEqual([
      {
        name: 'codex-events',
        uuid: existingDatabaseId
      }
    ])
  })

  test('returns an existing D1 database by resolved name', async () => {
    const { calls, runner } = createRunner([
      d1ListOutput([
        {
          name: 'codex-events-dev',
          uuid: existingDatabaseId
        }
      ])
    ])

    await expect(ensureDeployD1Database({
      target: 'dev',
      environment: {},
      runner
    })).resolves.toEqual({
      databaseName: 'codex-events-dev',
      databaseId: existingDatabaseId,
      created: false
    })

    expect(calls).toEqual([
      {
        command: 'bunx',
        args: ['wrangler', 'd1', 'list', '--json']
      }
    ])
  })

  test('creates a missing D1 database and resolves its ID from the next list call', async () => {
    const { calls, runner } = createRunner([
      d1ListOutput([]),
      '',
      d1ListOutput([
        {
          name: 'codex-events-dev',
          uuid: createdDatabaseId
        }
      ])
    ])

    await expect(ensureDeployD1Database({
      target: 'dev',
      environment: {},
      runner
    })).resolves.toEqual({
      databaseName: 'codex-events-dev',
      databaseId: createdDatabaseId,
      created: true
    })

    expect(calls).toEqual([
      {
        command: 'bunx',
        args: ['wrangler', 'd1', 'list', '--json']
      },
      {
        command: 'bunx',
        args: ['wrangler', 'd1', 'create', 'codex-events-dev']
      },
      {
        command: 'bunx',
        args: ['wrangler', 'd1', 'list', '--json']
      }
    ])
  })

  test('uses the D1 name override when resolving the database', async () => {
    const { runner } = createRunner([
      d1ListOutput([
        {
          name: 'custom-d1',
          uuid: existingDatabaseId
        }
      ])
    ])

    await expect(ensureDeployD1Database({
      target: 'production',
      environment: {
        DEPLOY_CF_D1_DATABASE_NAME: 'custom-d1'
      },
      runner
    })).resolves.toMatchObject({
      databaseName: 'custom-d1',
      databaseId: existingDatabaseId
    })
  })

  test('handles a concurrent create that succeeds in another deploy job', async () => {
    const { calls, runner } = createRunner([
      d1ListOutput([]),
      new Error('database already exists'),
      d1ListOutput([
        {
          name: 'codex-events-dev',
          uuid: existingDatabaseId
        }
      ])
    ])

    await expect(ensureDeployD1Database({
      target: 'dev',
      environment: {},
      runner
    })).resolves.toEqual({
      databaseName: 'codex-events-dev',
      databaseId: existingDatabaseId,
      created: false
    })

    expect(calls).toHaveLength(3)
  })

  test('writes GitHub Actions environment and output values', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'codex-events-d1-'))
    tempDirectories.push(directory)

    const githubEnv = join(directory, 'env')
    const githubOutput = join(directory, 'output')
    await writeGitHubD1DatabaseOutputs({
      databaseName: 'codex-events-dev',
      databaseId: existingDatabaseId,
      created: false
    }, {
      GITHUB_ENV: githubEnv,
      GITHUB_OUTPUT: githubOutput
    })

    await expect(readFile(githubEnv, 'utf8')).resolves.toBe(
      `DEPLOY_RESOLVED_D1_DATABASE_ID=${existingDatabaseId}\n`
    )
    await expect(readFile(githubOutput, 'utf8')).resolves.toBe(
      `d1_database_id=${existingDatabaseId}\nd1_database_name=codex-events-dev\n`
    )
  })
})
