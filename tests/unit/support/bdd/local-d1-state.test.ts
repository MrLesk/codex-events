import { describe, expect, test } from 'vitest'

import {
  applyLocalBddD1StateRoot,
  defaultLocalDevD1StateRoot,
  defaultLocalBddD1StateRoot,
  resolveLocalBddD1StateRoot
} from '../../../../tests/bdd/support/local-d1-state'

describe('local BDD D1 state resolution', () => {
  test('rejects a generic local D1 override that does not match the BDD root', () => {
    const environment = {
      LOCAL_D1_STATE_ROOT: '.wrangler/state-custom',
      LOCAL_BDD_D1_STATE_ROOT: '.wrangler/state-bdd-custom'
    } satisfies NodeJS.ProcessEnv

    expect(() => resolveLocalBddD1StateRoot(environment)).toThrowError(/LOCAL_D1_STATE_ROOT/)
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

  test('rejects a BDD root that matches the normal local app state root', () => {
    const environment = {
      LOCAL_BDD_D1_STATE_ROOT: defaultLocalDevD1StateRoot
    } satisfies NodeJS.ProcessEnv

    expect(() => resolveLocalBddD1StateRoot(environment)).toThrowError(/must not match/)
  })

  test('allows LOCAL_D1_STATE_ROOT when it already matches the resolved BDD root', () => {
    const environment = {
      LOCAL_D1_STATE_ROOT: '.wrangler/state-bdd-custom',
      LOCAL_BDD_D1_STATE_ROOT: '.wrangler/state-bdd-custom'
    } satisfies NodeJS.ProcessEnv

    expect(resolveLocalBddD1StateRoot(environment)).toBe('.wrangler/state-bdd-custom')
  })

  test('writes the resolved BDD root back to LOCAL_D1_STATE_ROOT', () => {
    const environment = {
      LOCAL_BDD_D1_STATE_ROOT: '.wrangler/state-bdd-custom'
    } satisfies NodeJS.ProcessEnv

    expect(applyLocalBddD1StateRoot(environment)).toBe('.wrangler/state-bdd-custom')
    expect(environment.LOCAL_D1_STATE_ROOT).toBe('.wrangler/state-bdd-custom')
  })
})
