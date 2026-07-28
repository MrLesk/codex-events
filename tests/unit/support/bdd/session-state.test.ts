import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

import * as sessionState from '../../../bdd/support/session-state'
import {
  getStablePersonas,
  resetAuthArtifactDirectory
} from '../../../bdd/support/personas'

describe('local persona session state', () => {
  test('writes the existing local-development session cookie for the persona', () => {
    const writePersonaStorageState = (
      sessionState as unknown as {
        writePersonaStorageState?: (
          persona: ReturnType<typeof getStablePersonas>[number],
          environment?: NodeJS.ProcessEnv
        ) => string
      }
    ).writePersonaStorageState

    expect(writePersonaStorageState).toBeTypeOf('function')
    if (!writePersonaStorageState) {
      return
    }

    resetAuthArtifactDirectory()
    const persona = getStablePersonas()[2]!
    const storageStatePath = writePersonaStorageState(persona, {
      BDD_BASE_URL: 'http://127.0.0.1:3100'
    })

    expect(JSON.parse(readFileSync(storageStatePath, 'utf8'))).toEqual({
      cookies: [
        {
          name: 'codex-events-local-user',
          value: 'judge@bdd.codex-events.test',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: 'Lax'
        }
      ],
      origins: []
    })
  })
})
