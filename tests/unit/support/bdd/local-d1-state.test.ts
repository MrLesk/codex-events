import { describe, expect, test } from 'vitest'

import {
  applyLocalBddD1StateRoot,
  defaultLocalBddD1StateRoot,
  resolveLocalBddD1StateRoot
} from '../../../../tests/bdd/support/local-d1-state'

describe('local BDD D1 state resolution', () => {
  test('uses the explicit local D1 root when one is already set', () => {
    const environment = {
      LOCAL_D1_STATE_ROOT: '.wrangler/state-custom',
      LOCAL_BDD_D1_STATE_ROOT: '.wrangler/state-bdd-custom'
    } satisfies NodeJS.ProcessEnv

    expect(resolveLocalBddD1StateRoot(environment)).toBe('.wrangler/state-custom')
  })

  test('falls back to the BDD-specific root when no explicit root is set', () => {
    const environment = {
      LOCAL_BDD_D1_STATE_ROOT: '.wrangler/state-bdd-custom'
    } satisfies NodeJS.ProcessEnv

    expect(resolveLocalBddD1StateRoot(environment)).toBe('.wrangler/state-bdd-custom')
  })

  test('defaults to the dedicated BDD state root', () => {
    expect(resolveLocalBddD1StateRoot({})).toBe(defaultLocalBddD1StateRoot)
  })

  test('writes the resolved BDD root back to LOCAL_D1_STATE_ROOT', () => {
    const environment = {
      LOCAL_BDD_D1_STATE_ROOT: '.wrangler/state-bdd-custom'
    } satisfies NodeJS.ProcessEnv

    expect(applyLocalBddD1StateRoot(environment)).toBe('.wrangler/state-bdd-custom')
    expect(environment.LOCAL_D1_STATE_ROOT).toBe('.wrangler/state-bdd-custom')
  })
})
