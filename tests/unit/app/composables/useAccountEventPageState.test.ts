import { effectScope, nextTick, ref, watch, type EffectScope } from 'vue'
import { afterEach, describe, expect, test } from 'vitest'

import type { AccountEventPageShell } from '#shared/domains/events/account-event-page-shell'
import type { AccountEventPageName } from '../../../../app/domains/events/account-workspace-page'
import {
  resolveInitialAccountEventPageFamily,
  useAccountEventPageState
} from '../../../../app/composables/useAccountEventPageState'

const shell = {} as AccountEventPageShell

const scopes: EffectScope[] = []

function createPageState(initialPageFamily: AccountEventPageName | null) {
  const scope = effectScope()
  scopes.push(scope)
  const slug = ref('fixture-event')
  const authorizationGeneration = ref(1)
  let pageState: ReturnType<typeof useAccountEventPageState> | undefined

  scope.run(() => {
    pageState = useAccountEventPageState({
      initialPageFamily,
      slug,
      authorizationGeneration
    })
  })

  if (!pageState) {
    throw new Error('The account-event page state was not created.')
  }

  return {
    authorizationGeneration,
    pageState,
    slug
  }
}

afterEach(() => {
  while (scopes.length > 0) {
    scopes.pop()?.stop()
  }
})

describe('useAccountEventPageState', () => {
  test('retains the hard-direct shell through operations → settings → operations', async () => {
    const { pageState } = createPageState('operations')
    const operationsQuery = pageState.queryForPage('operations')
    const settingsQuery = pageState.queryForPage('settings')
    const activePage = ref<'operations' | 'settings'>('operations')
    const selectedPageResponse = ref<{ shell?: AccountEventPageShell }>({ shell })

    watch(activePage, () => {
      pageState.applySelectedPageState({
        entryPagePresent: false,
        shell: selectedPageResponse.value.shell
      })
    })

    expect(operationsQuery).toEqual({ includeEventShell: true })
    expect(settingsQuery).toEqual({})
    expect(pageState.queryForPage('operations')).toBe(operationsQuery)
    expect(pageState.queryForPage('settings')).toBe(settingsQuery)

    pageState.applySelectedPageState({
      entryPagePresent: false,
      shell
    })

    selectedPageResponse.value = {}
    activePage.value = 'settings'
    await nextTick()
    expect(pageState.pageShell.value).toEqual(shell)

    activePage.value = 'operations'
    await nextTick()
    expect(pageState.pageShell.value).toEqual(shell)
    expect(pageState.queryForPage('operations')).toBe(operationsQuery)

    pageState.applySelectedPageState({
      entryPagePresent: true
    })
    expect(pageState.pageShell.value).toBeNull()
  })

  test.each([
    ['prizes', 'prizes'],
    ['participants', 'participants'],
    ['judges', 'rosters'],
    ['staff', 'rosters']
  ] as const)('assigns the initial %s tab shell to its %s page request', (tab, page) => {
    const initialPageFamily = resolveInitialAccountEventPageFamily({
      isDirectNonEntryNavigation: true,
      selectedTab: tab
    })
    const { pageState } = createPageState(initialPageFamily)

    expect(initialPageFamily).toBe(page)
    expect(pageState.queryForPage(page)).toEqual({ includeEventShell: true })
    expect(pageState.queryForPage(page)).toBe(pageState.queryForPage(page))
    expect(pageState.queryForPage(page === 'prizes' ? 'participants' : 'prizes')).toEqual({})
  })

  test('does not retain shell state across slug or authorization-generation invalidation', async () => {
    const { authorizationGeneration, pageState, slug } = createPageState('operations')

    pageState.applySelectedPageState({
      entryPagePresent: false,
      shell
    })
    expect(pageState.pageShell.value).toEqual(shell)

    slug.value = 'another-event'
    await nextTick()
    expect(pageState.pageShell.value).toBeNull()

    pageState.applySelectedPageState({
      entryPagePresent: false,
      shell
    })
    authorizationGeneration.value = 2
    await nextTick()
    expect(pageState.pageShell.value).toBeNull()
  })
})
