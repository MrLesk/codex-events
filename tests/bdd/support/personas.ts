import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { z } from 'zod'

export const defaultLocalBddBaseUrl = 'http://localhost:3100'

export const stablePersonaKeys = [
  'platform_admin',
  'event_admin',
  'judge',
  'regular_user'
] as const

export type StablePersonaKey = (typeof stablePersonaKeys)[number]

export interface StablePersona {
  key: StablePersonaKey
  email: string
  displayName: string
  nickname: string
  auth0Subject: string
}

const bddBaseUrlEnvironmentSchema = z.object({
  BDD_BASE_URL: z.string().url().optional()
})

const stablePersonas: StablePersona[] = [
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
]

export function getStablePersonas(): StablePersona[] {
  return stablePersonas.map(persona => ({ ...persona }))
}

export function getBaseUrl(environment: NodeJS.ProcessEnv = process.env) {
  const config = bddBaseUrlEnvironmentSchema.parse(environment)
  return config.BDD_BASE_URL ?? defaultLocalBddBaseUrl
}

export function getAuthArtifactDirectory() {
  const directory = join(fileURLToPath(new URL('../.auth', import.meta.url)))
  mkdirSync(directory, { recursive: true })
  return directory
}

export function resetAuthArtifactDirectory() {
  const directory = join(fileURLToPath(new URL('../.auth', import.meta.url)))
  rmSync(directory, { recursive: true, force: true })
  mkdirSync(directory, { recursive: true })
  return directory
}

export function storageStatePathForPersona(personaKey: StablePersonaKey) {
  return join(getAuthArtifactDirectory(), `${personaKey}.json`)
}
