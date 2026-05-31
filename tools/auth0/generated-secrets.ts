import { createHmac } from 'node:crypto'

type EnvironmentValues = Record<string, string | undefined>

type GeneratedSecretPurpose = 'session' | 'account-link-challenge'

const generatedSecretLabels = {
  'session': 'codex-events/auth0/session-secret/v1',
  'account-link-challenge': 'codex-events/auth0/account-link-challenge-secret/v1'
} satisfies Record<GeneratedSecretPurpose, string>

function readOptionalSecret(environment: EnvironmentValues, name: string) {
  return environment[name]?.trim() ?? ''
}

function requireSecret(value: string, name: string) {
  if (!value) {
    throw new Error(`${name} is required to derive generated Auth0 secrets.`)
  }

  return value
}

export function deriveAuth0GeneratedSecret(clientSecret: string, purpose: GeneratedSecretPurpose) {
  const sourceSecret = requireSecret(clientSecret.trim(), 'NUXT_AUTH0_CLIENT_SECRET')

  return createHmac('sha256', sourceSecret)
    .update(generatedSecretLabels[purpose])
    .digest('hex')
}

export function resolveAuth0SessionSecret(environment: EnvironmentValues) {
  return readOptionalSecret(environment, 'NUXT_AUTH0_SESSION_SECRET')
    || deriveAuth0GeneratedSecret(readOptionalSecret(environment, 'NUXT_AUTH0_CLIENT_SECRET'), 'session')
}

export function resolveAuth0AccountLinkChallengeSecret(environment: EnvironmentValues) {
  const runtimeSecret = readOptionalSecret(environment, 'NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET')
  const actionSecret = readOptionalSecret(environment, 'AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET')

  if (runtimeSecret && actionSecret && runtimeSecret !== actionSecret) {
    throw new Error('NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET and AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET must match when both are set.')
  }

  return runtimeSecret
    || actionSecret
    || deriveAuth0GeneratedSecret(readOptionalSecret(environment, 'NUXT_AUTH0_CLIENT_SECRET'), 'account-link-challenge')
}

export function resolveAuth0GeneratedSecrets(environment: EnvironmentValues) {
  return {
    sessionSecret: resolveAuth0SessionSecret(environment),
    accountLinkChallengeSecret: resolveAuth0AccountLinkChallengeSecret(environment)
  }
}
