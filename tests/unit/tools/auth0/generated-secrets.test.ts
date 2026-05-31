import { describe, expect, test } from 'vitest'

import {
  deriveAuth0GeneratedSecret,
  resolveAuth0AccountLinkChallengeSecret,
  resolveAuth0GeneratedSecrets,
  resolveAuth0SessionSecret
} from '../../../../tools/auth0/generated-secrets'

describe('Auth0 generated secrets', () => {
  test('derives stable purpose-specific secrets from the Auth0 client secret', () => {
    const sessionSecret = deriveAuth0GeneratedSecret('app-client-secret', 'session')
    const challengeSecret = deriveAuth0GeneratedSecret('app-client-secret', 'account-link-challenge')

    expect(sessionSecret).toMatch(/^[0-9a-f]{64}$/)
    expect(challengeSecret).toMatch(/^[0-9a-f]{64}$/)
    expect(challengeSecret).not.toBe(sessionSecret)
    expect(deriveAuth0GeneratedSecret('app-client-secret', 'session')).toBe(sessionSecret)
  })

  test('uses explicit generated secret overrides when present', () => {
    const environment = {
      NUXT_AUTH0_CLIENT_SECRET: 'app-client-secret',
      NUXT_AUTH0_SESSION_SECRET: 'explicit-session-secret',
      NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET: 'explicit-challenge-secret'
    }

    expect(resolveAuth0GeneratedSecrets(environment)).toEqual({
      sessionSecret: 'explicit-session-secret',
      accountLinkChallengeSecret: 'explicit-challenge-secret'
    })
  })

  test('allows the Auth0 Action challenge secret name as the explicit account-link value', () => {
    expect(resolveAuth0AccountLinkChallengeSecret({
      AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET: 'action-secret'
    })).toBe('action-secret')
  })

  test('rejects mismatched runtime and Auth0 Action challenge secrets', () => {
    expect(() => resolveAuth0AccountLinkChallengeSecret({
      NUXT_AUTH0_CLIENT_SECRET: 'app-client-secret',
      NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET: 'runtime-secret',
      AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET: 'action-secret'
    })).toThrow('must match')
  })

  test('requires the Auth0 client secret when an explicit generated secret is omitted', () => {
    expect(() => resolveAuth0SessionSecret({})).toThrow('NUXT_AUTH0_CLIENT_SECRET is required')
    expect(() => resolveAuth0AccountLinkChallengeSecret({})).toThrow('NUXT_AUTH0_CLIENT_SECRET is required')
  })
})
