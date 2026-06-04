import 'dotenv/config'

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { resolveAuth0GeneratedSecrets } from '../auth0/generated-secrets'

type EnvironmentValues = Record<string, string | undefined>

type WorkerSecrets = Record<string, string>

interface ScriptArgs {
  outputPath: string
  mergePath: string | null
}

function getUsageMessage() {
  return `Usage: bun tools/deploy/write-worker-secrets.ts <output-path> [--merge <path>]

Environment variables:
- NUXT_AUTH0_CLIENT_ID
- NUXT_AUTH0_CLIENT_SECRET
- NUXT_AUTH0_SESSION_SECRET (optional; derived from NUXT_AUTH0_CLIENT_SECRET)
- NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET (optional; derived from NUXT_AUTH0_CLIENT_SECRET)
`
}

function readOptionalValue(environment: EnvironmentValues, name: string) {
  return environment[name]?.trim() ?? ''
}

function readRequiredValue(environment: EnvironmentValues, name: string) {
  const value = readOptionalValue(environment, name)

  if (!value) {
    throw new Error(`${name} is required to write Worker secrets.`)
  }

  return value
}

function parseJsonObject(payload: string, path: string) {
  const parsed = JSON.parse(payload) as unknown

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${path} must contain a JSON object.`)
  }

  const values: WorkerSecrets = {}

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'string') {
      throw new Error(`${path} contains a non-string value for ${key}.`)
    }

    values[key] = value
  }

  return values
}

export function parseScriptArgs(argv: string[]): ScriptArgs {
  const outputPath = argv[0]?.trim()

  if (!outputPath) {
    throw new Error(getUsageMessage())
  }

  let mergePath: string | null = null

  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index]
    const nextToken = argv[index + 1]

    if (token === '--merge') {
      if (!nextToken?.trim()) {
        throw new Error('Missing value for --merge.')
      }

      mergePath = nextToken.trim()
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${token}\n\n${getUsageMessage()}`)
  }

  return {
    outputPath,
    mergePath
  }
}

export function buildWorkerSecrets(environment: EnvironmentValues, extraSecrets: WorkerSecrets = {}) {
  const generatedSecrets = resolveAuth0GeneratedSecrets(environment)

  return {
    NUXT_AUTH0_CLIENT_ID: readRequiredValue(environment, 'NUXT_AUTH0_CLIENT_ID'),
    NUXT_AUTH0_CLIENT_SECRET: readRequiredValue(environment, 'NUXT_AUTH0_CLIENT_SECRET'),
    NUXT_AUTH0_SESSION_SECRET: generatedSecrets.sessionSecret,
    NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET: generatedSecrets.accountLinkChallengeSecret,
    ...extraSecrets
  } satisfies WorkerSecrets
}

async function readMergeSecrets(path: string | null) {
  if (!path || !existsSync(path)) {
    return {}
  }

  return parseJsonObject(await readFile(path, 'utf8'), path)
}

export async function writeWorkerSecrets(options: {
  outputPath: string
  mergePath?: string | null
  environment?: EnvironmentValues
}) {
  const extraSecrets = await readMergeSecrets(options.mergePath ?? null)
  const secrets = buildWorkerSecrets(options.environment ?? process.env, extraSecrets)

  await mkdir(dirname(options.outputPath), { recursive: true })
  await writeFile(options.outputPath, `${JSON.stringify(secrets, null, 2)}\n`)

  return secrets
}

if (import.meta.main) {
  try {
    const args = parseScriptArgs(process.argv.slice(2))
    await writeWorkerSecrets({
      outputPath: args.outputPath,
      mergePath: args.mergePath
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to write Worker secrets.'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}
