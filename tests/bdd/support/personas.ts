import { mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

import { z } from 'zod'

export const stablePersonaKeys = [
  'platform_admin',
  'hackathon_admin',
  'judge',
  'regular_user'
] as const

export type StablePersonaKey = (typeof stablePersonaKeys)[number]

export interface StablePersona {
  key: StablePersonaKey
  email: string
  password: string
  displayName: string
  nickname: string
}

export interface ProvisionedStablePersona extends StablePersona {
  auth0Subject: string
}

const stablePersonaEnvironmentSchema = z.object({
  NUXT_AUTH0_APP_BASE_URL: z.string().url(),
  E2E_PLATFORM_ADMIN_EMAIL: z.string().email(),
  E2E_PLATFORM_ADMIN_PASSWORD: z.string().min(1),
  E2E_HACKATHON_ADMIN_EMAIL: z.string().email(),
  E2E_HACKATHON_ADMIN_PASSWORD: z.string().min(1),
  E2E_JUDGE_EMAIL: z.string().email(),
  E2E_JUDGE_PASSWORD: z.string().min(1),
  E2E_REGULAR_USER_EMAIL: z.string().email(),
  E2E_REGULAR_USER_PASSWORD: z.string().min(1)
})

const provisioningEnvironmentSchema = stablePersonaEnvironmentSchema.extend({
  NUXT_AUTH0_CLIENT_ID: z.string().min(1),
  AUTH0_TEST_DOMAIN: z.string().min(1),
  AUTH0_TEST_MGMT_CLIENT_ID: z.string().min(1),
  AUTH0_TEST_MGMT_CLIENT_SECRET: z.string().min(1),
  AUTH0_TEST_MGMT_AUDIENCE: z.string().url(),
  AUTH0_TEST_CONNECTION_NAME: z.string().min(1)
})

export type StablePersonaEnvironment = z.infer<typeof stablePersonaEnvironmentSchema>
export type ProvisioningEnvironment = z.infer<typeof provisioningEnvironmentSchema>

export function loadStablePersonaEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  return stablePersonaEnvironmentSchema.parse(environment)
}

export function loadProvisioningEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  return provisioningEnvironmentSchema.parse(environment)
}

export function getStablePersonas(environment: NodeJS.ProcessEnv = process.env): StablePersona[] {
  const config = loadStablePersonaEnvironment(environment)

  return [
    {
      key: 'platform_admin',
      email: config.E2E_PLATFORM_ADMIN_EMAIL,
      password: config.E2E_PLATFORM_ADMIN_PASSWORD,
      displayName: 'Platform Admin',
      nickname: 'platform-admin'
    },
    {
      key: 'hackathon_admin',
      email: config.E2E_HACKATHON_ADMIN_EMAIL,
      password: config.E2E_HACKATHON_ADMIN_PASSWORD,
      displayName: 'Hackathon Admin',
      nickname: 'hackathon-admin'
    },
    {
      key: 'judge',
      email: config.E2E_JUDGE_EMAIL,
      password: config.E2E_JUDGE_PASSWORD,
      displayName: 'Judge Persona',
      nickname: 'judge-persona'
    },
    {
      key: 'regular_user',
      email: config.E2E_REGULAR_USER_EMAIL,
      password: config.E2E_REGULAR_USER_PASSWORD,
      displayName: 'Regular User',
      nickname: 'regular-user'
    }
  ]
}

export function getBaseUrl(environment: NodeJS.ProcessEnv = process.env) {
  return loadStablePersonaEnvironment(environment).NUXT_AUTH0_APP_BASE_URL
}

export function getAuth0TestConnectionName(environment: NodeJS.ProcessEnv = process.env) {
  return loadProvisioningEnvironment(environment).AUTH0_TEST_CONNECTION_NAME
}

export function getAuth0ClientId(environment: NodeJS.ProcessEnv = process.env) {
  return loadProvisioningEnvironment(environment).NUXT_AUTH0_CLIENT_ID
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
