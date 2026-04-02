import { resolve } from 'node:path'

export const defaultLocalBddD1StateRoot = '.wrangler/state-bdd'
export const defaultLocalDevD1StateRoot = '.wrangler/state'

function resolvePersistRoot(root: string) {
  return resolve(process.cwd(), root.trim())
}

export function resolveLocalBddD1StateRoot(environment: NodeJS.ProcessEnv = process.env) {
  const bddRoot = environment.LOCAL_BDD_D1_STATE_ROOT?.trim() || defaultLocalBddD1StateRoot
  const explicitRoot = environment.LOCAL_D1_STATE_ROOT?.trim()
  const localDevRoot = environment.LOCAL_DEV_D1_STATE_ROOT?.trim() || defaultLocalDevD1StateRoot

  if (resolvePersistRoot(bddRoot) === resolvePersistRoot(localDevRoot)) {
    throw new Error(
      `BDD D1 state root must not match the normal local app state root (${bddRoot}). `
      + 'Use a dedicated LOCAL_BDD_D1_STATE_ROOT.'
    )
  }

  if (explicitRoot && resolvePersistRoot(explicitRoot) !== resolvePersistRoot(bddRoot)) {
    throw new Error(
      `BDD D1 state root mismatch: LOCAL_D1_STATE_ROOT points to "${explicitRoot}" but BDD requires "${bddRoot}". `
      + 'Use LOCAL_BDD_D1_STATE_ROOT for BDD overrides.'
    )
  }

  return bddRoot
}

export function applyLocalBddD1StateRoot(environment: NodeJS.ProcessEnv = process.env) {
  const localBddD1StateRoot = resolveLocalBddD1StateRoot(environment)

  environment.LOCAL_D1_STATE_ROOT = localBddD1StateRoot

  return localBddD1StateRoot
}
