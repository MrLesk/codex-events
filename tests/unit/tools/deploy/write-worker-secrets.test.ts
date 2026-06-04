import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { describe, expect, test } from 'vitest'

import { resolveAuth0GeneratedSecrets } from '../../../../tools/auth0/generated-secrets'
import {
  buildWorkerSecrets,
  parseScriptArgs,
  writeWorkerSecrets
} from '../../../../tools/deploy/write-worker-secrets'

function createEnvironment(overrides: Record<string, string | undefined> = {}) {
  return {
    NUXT_AUTH0_CLIENT_ID: 'app-client-id',
    NUXT_AUTH0_CLIENT_SECRET: 'app-client-secret',
    ...overrides
  }
}

describe('Worker secret writer', () => {
  test('builds Worker secrets with generated Auth0 defaults', () => {
    const secrets = buildWorkerSecrets(createEnvironment())
    const generatedSecrets = resolveAuth0GeneratedSecrets(createEnvironment())

    expect(secrets).toMatchObject({
      NUXT_AUTH0_CLIENT_ID: 'app-client-id',
      NUXT_AUTH0_CLIENT_SECRET: 'app-client-secret',
      NUXT_AUTH0_SESSION_SECRET: generatedSecrets.sessionSecret,
      NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET: generatedSecrets.accountLinkChallengeSecret
    })
  })

  test('honors explicit Auth0 secret overrides and extra merged secrets', () => {
    expect(buildWorkerSecrets(createEnvironment({
      NUXT_AUTH0_SESSION_SECRET: 'explicit-session-secret',
      NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET: 'explicit-challenge-secret'
    }), {
      EXTRA_SECRET: 'extra-secret'
    })).toMatchObject({
      NUXT_AUTH0_SESSION_SECRET: 'explicit-session-secret',
      NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET: 'explicit-challenge-secret',
      EXTRA_SECRET: 'extra-secret'
    })
  })

  test('writes the secret-bulk JSON file and merges an optional extra secret file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'codex-events-worker-secrets-'))

    try {
      const outputPath = join(directory, 'worker-secrets.json')
      const mergePath = join(directory, 'extra-secret.json')
      await writeFile(mergePath, JSON.stringify({
        EXTRA_SECRET: 'extra-secret'
      }))

      await writeWorkerSecrets({
        outputPath,
        mergePath,
        environment: createEnvironment()
      })

      const payload = JSON.parse(await readFile(outputPath, 'utf8')) as Record<string, string>
      expect(payload.NUXT_AUTH0_CLIENT_ID).toBe('app-client-id')
      expect(payload.NUXT_AUTH0_SESSION_SECRET).toMatch(/^[0-9a-f]{64}$/)
      expect(payload.NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET).toMatch(/^[0-9a-f]{64}$/)
      expect(payload.EXTRA_SECRET).toBe('extra-secret')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('parses output and merge arguments', () => {
    expect(parseScriptArgs(['secrets.json', '--merge', 'extra.json'])).toEqual({
      outputPath: 'secrets.json',
      mergePath: 'extra.json'
    })

    expect(() => parseScriptArgs([])).toThrow('Usage:')
    expect(() => parseScriptArgs(['secrets.json', '--merge'])).toThrow('Missing value for --merge')
  })
})
