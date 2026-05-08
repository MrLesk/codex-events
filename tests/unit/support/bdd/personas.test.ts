import { describe, expect, test } from 'vitest'

import {
  defaultLocalBddBaseUrl,
  getAuth0ClientId,
  getAuth0TestConnectionName,
  getBaseUrl,
  getStablePersonas,
  loadBddBaseUrlEnvironment,
  loadProvisioningEnvironment,
  loadStablePersonaEnvironment,
  resetAuthArtifactDirectory,
  storageStatePathForPersona
} from '../../../bdd/support/personas'

const baseEnvironment = {
  NUXT_AUTH0_APP_BASE_URL: 'http://localhost:3000',
  E2E_PLATFORM_ADMIN_EMAIL: 'platform-admin@example.com',
  E2E_PLATFORM_ADMIN_PASSWORD: 'password-1',
  E2E_EVENT_ADMIN_EMAIL: 'event-admin@example.com',
  E2E_EVENT_ADMIN_PASSWORD: 'password-2',
  E2E_JUDGE_EMAIL: 'judge@example.com',
  E2E_JUDGE_PASSWORD: 'password-3',
  E2E_REGULAR_USER_EMAIL: 'regular@example.com',
  E2E_REGULAR_USER_PASSWORD: 'password-4'
}

describe('stable Auth0 personas', () => {
  test('resolves the BDD base url from the BDD-specific override first', () => {
    expect(getBaseUrl({
      NUXT_AUTH0_APP_BASE_URL: 'http://localhost:3000',
      NUXT_AUTH0_BDD_APP_BASE_URL: 'http://localhost:3100'
    })).toBe('http://localhost:3100')
  })

  test('still parses the normal app base url without using it as the BDD default', () => {
    expect(loadBddBaseUrlEnvironment({
      NUXT_AUTH0_APP_BASE_URL: 'http://localhost:3000'
    }).NUXT_AUTH0_APP_BASE_URL).toBe('http://localhost:3000')

    expect(getBaseUrl({
      NUXT_AUTH0_APP_BASE_URL: 'http://localhost:3000'
    })).toBe(defaultLocalBddBaseUrl)
  })

  test('defaults the BDD base url to the dedicated local test port', () => {
    expect(getBaseUrl({})).toBe(defaultLocalBddBaseUrl)
  })

  test('loads the stable persona environment and derives the documented personas', () => {
    const environment = loadStablePersonaEnvironment(baseEnvironment)
    const personas = getStablePersonas(baseEnvironment)

    expect(environment.NUXT_AUTH0_APP_BASE_URL).toBe('http://localhost:3000')
    expect(personas.map(persona => persona.key)).toEqual([
      'platform_admin',
      'event_admin',
      'judge',
      'regular_user'
    ])
  })

  test('requires provisioning inputs for Auth0 and the Auth0 test connection', () => {
    expect(() => loadProvisioningEnvironment(baseEnvironment)).toThrow()
    expect(() => loadProvisioningEnvironment({
      ...baseEnvironment,
      NUXT_AUTH0_CLIENT_ID: 'nuxt-client-id',
      AUTH0_TEST_DOMAIN: 'example.us.auth0.com',
      AUTH0_TEST_MGMT_CLIENT_ID: 'client-id',
      AUTH0_TEST_MGMT_CLIENT_SECRET: 'client-secret',
      AUTH0_TEST_MGMT_AUDIENCE: 'https://example.us.auth0.com/api/v2/',
      AUTH0_TEST_CONNECTION_NAME: 'codex-events-e2e-users'
    })).not.toThrow()
  })

  test('exposes the provisioning connection name and client id helpers', () => {
    const environment = {
      ...baseEnvironment,
      NUXT_AUTH0_CLIENT_ID: 'nuxt-client-id',
      AUTH0_TEST_DOMAIN: 'example.us.auth0.com',
      AUTH0_TEST_MGMT_CLIENT_ID: 'client-id',
      AUTH0_TEST_MGMT_CLIENT_SECRET: 'client-secret',
      AUTH0_TEST_MGMT_AUDIENCE: 'https://example.us.auth0.com/api/v2/',
      AUTH0_TEST_CONNECTION_NAME: 'codex-events-e2e-users'
    }

    expect(getAuth0ClientId(environment)).toBe('nuxt-client-id')
    expect(getAuth0TestConnectionName(environment)).toBe('codex-events-e2e-users')
  })

  test('writes storage state under the BDD auth artifact directory', () => {
    resetAuthArtifactDirectory()
    expect(storageStatePathForPersona('judge')).toContain('tests/bdd/.auth/judge.json')
  })
})
