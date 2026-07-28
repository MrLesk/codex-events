import { applyLocalBddD1StateRoot } from './support/local-d1-state.ts'
import {
  getStablePersonas,
  resetAuthArtifactDirectory
} from './support/personas.ts'
import { resetPlatformFixtures } from './support/platform-fixtures.ts'
import { writePersonaStorageState } from './support/session-state.ts'

applyLocalBddD1StateRoot()

const personas = getStablePersonas()

console.log('Resetting platform fixtures.')
await resetPlatformFixtures(personas)

console.log('Writing local persona session state.')
resetAuthArtifactDirectory()
for (const persona of personas) {
  writePersonaStorageState(persona)
}

console.log(`Seeded ${personas.length} local personas and saved their session state.`)
