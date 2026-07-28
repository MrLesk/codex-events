import { describe, expect, test } from 'vitest'

import {
  defaultLocalBddBaseUrl,
  getBaseUrl,
  getStablePersonas,
  storageStatePathForPersona
} from '../../../bdd/support/personas'

describe('stable local personas', () => {
  test('uses BDD_BASE_URL as the only base URL override', () => {
    expect(getBaseUrl({
      BDD_BASE_URL: 'http://127.0.0.1:3200',
      NUXT_AUTH0_APP_BASE_URL: 'http://localhost:3000',
      NUXT_AUTH0_BDD_APP_BASE_URL: 'http://localhost:3300'
    })).toBe('http://127.0.0.1:3200')

    expect(getBaseUrl({
      NUXT_AUTH0_APP_BASE_URL: 'http://localhost:3000',
      NUXT_AUTH0_BDD_APP_BASE_URL: 'http://localhost:3300'
    })).toBe(defaultLocalBddBaseUrl)
  })

  test('defaults to the dedicated local test port', () => {
    expect(getBaseUrl({})).toBe(defaultLocalBddBaseUrl)
  })

  test('defines the four local personas without credentials', () => {
    expect(getStablePersonas()).toEqual([
      {
        key: 'platform_admin',
        email: 'platform-admin@bdd.codex-events.test',
        displayName: 'Platform Admin',
        nickname: 'platform-admin',
        auth0Subject: 'local-chatgpt|platform-admin@bdd.codex-events.test'
      },
      {
        key: 'event_admin',
        email: 'event-admin@bdd.codex-events.test',
        displayName: 'Event Admin',
        nickname: 'event-admin',
        auth0Subject: 'local-chatgpt|event-admin@bdd.codex-events.test'
      },
      {
        key: 'judge',
        email: 'judge@bdd.codex-events.test',
        displayName: 'Judge Persona',
        nickname: 'judge-persona',
        auth0Subject: 'local-chatgpt|judge@bdd.codex-events.test'
      },
      {
        key: 'regular_user',
        email: 'regular-user@bdd.codex-events.test',
        displayName: 'Regular User',
        nickname: 'regular-user',
        auth0Subject: 'local-chatgpt|regular-user@bdd.codex-events.test'
      }
    ])
  })

  test('writes storage state under the BDD auth artifact directory', () => {
    expect(storageStatePathForPersona('judge')).toContain('tests/bdd/.auth/judge.json')
  })
})
