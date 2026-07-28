import { writeFileSync } from 'node:fs'

import {
  getBaseUrl,
  storageStatePathForPersona,
  type StablePersona
} from './personas.ts'

export function writePersonaStorageState(
  persona: StablePersona,
  environment: NodeJS.ProcessEnv = process.env
) {
  const baseUrl = new URL(getBaseUrl(environment))
  const storageStatePath = storageStatePathForPersona(persona.key)

  writeFileSync(storageStatePath, JSON.stringify({
    cookies: [
      {
        name: 'codex-events-local-user',
        value: persona.email,
        domain: baseUrl.hostname,
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: baseUrl.protocol === 'https:',
        sameSite: 'Lax'
      }
    ],
    origins: []
  }, null, 2))

  return storageStatePath
}
