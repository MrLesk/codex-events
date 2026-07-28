import { describe, expect, test } from 'vitest'

import { shouldUseLocalCodexAuth } from '../../../../tools/local-auth/mode'

const completeAuth0Environment = {
  NUXT_AUTH0_DOMAIN: 'login.example.com',
  NUXT_AUTH0_CLIENT_ID: 'client-id',
  NUXT_AUTH0_CLIENT_SECRET: 'client-secret',
  NUXT_AUTH0_SESSION_SECRET: 'session-secret'
}

describe('local Codex auth mode', () => {
  test('uses local Codex auth in development when Auth0 is not configured', () => {
    expect(shouldUseLocalCodexAuth(true, {})).toBe(true)
  })

  test('does not use local Codex auth outside development', () => {
    expect(shouldUseLocalCodexAuth(false, {})).toBe(false)
  })

  test('does not use local Codex auth when Auth0 is configured', () => {
    expect(shouldUseLocalCodexAuth(true, completeAuth0Environment)).toBe(false)
  })
})
