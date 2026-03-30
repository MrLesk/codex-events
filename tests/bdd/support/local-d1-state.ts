export const defaultLocalBddD1StateRoot = '.wrangler/state-bdd'

export function resolveLocalBddD1StateRoot(environment: NodeJS.ProcessEnv = process.env) {
  const explicitRoot = environment.LOCAL_D1_STATE_ROOT?.trim()

  if (explicitRoot) {
    return explicitRoot
  }

  const bddRoot = environment.LOCAL_BDD_D1_STATE_ROOT?.trim()

  if (bddRoot) {
    return bddRoot
  }

  return defaultLocalBddD1StateRoot
}

export function applyLocalBddD1StateRoot(environment: NodeJS.ProcessEnv = process.env) {
  const localBddD1StateRoot = resolveLocalBddD1StateRoot(environment)

  environment.LOCAL_D1_STATE_ROOT = localBddD1StateRoot

  return localBddD1StateRoot
}
