import { request } from '@playwright/test'

import { getBaseUrl, storageStatePathForPersona, type StablePersonaKey } from './personas.ts'

export async function createAuthenticatedApiClient(
  personaKey: StablePersonaKey,
  environment: NodeJS.ProcessEnv = process.env
) {
  return await request.newContext({
    baseURL: getBaseUrl(environment),
    storageState: storageStatePathForPersona(personaKey)
  })
}
