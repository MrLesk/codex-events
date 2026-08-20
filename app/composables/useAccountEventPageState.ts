import { computed, shallowRef, toValue, watch } from 'vue'

import type { AccountEventPageShell } from '#shared/domains/events/account-event-page-shell'
import type {
  AccountEventPageName,
  AccountEventPageQuery
} from '~/domains/events/account-workspace-page'
import {
  getAccountEventPageForTab,
  type AccountEventWorkspaceTab
} from '~/domains/events/account-workspace-tabs'

const emptyPageQuery = Object.freeze({}) as AccountEventPageQuery
const eventShellPageQuery = Object.freeze({
  includeEventShell: true
}) as AccountEventPageQuery

export function resolveInitialAccountEventPageFamily(options: {
  isDirectNonEntryNavigation: boolean
  selectedTab: AccountEventWorkspaceTab
}) {
  return options.isDirectNonEntryNavigation
    ? getAccountEventPageForTab(options.selectedTab)
    : null
}

export interface UseAccountEventPageStateOptions {
  initialPageFamily: AccountEventPageName | null
  slug: MaybeRefOrGetter<string>
  authorizationGeneration: MaybeRefOrGetter<number>
}

export function useAccountEventPageState(options: UseAccountEventPageStateOptions) {
  const pageShell = shallowRef<AccountEventPageShell | null>(null)
  const retainedPageShell = computed(() => pageShell.value)
  const resolvedSlug = computed(() => toValue(options.slug))
  const resolvedAuthorizationGeneration = computed(() => toValue(options.authorizationGeneration))

  function clearRetainedShell() {
    pageShell.value = null
  }

  watch([resolvedSlug, resolvedAuthorizationGeneration], clearRetainedShell)

  function queryForPage(page: AccountEventPageName) {
    return options.initialPageFamily === page
      ? eventShellPageQuery
      : emptyPageQuery
  }

  function applySelectedPageState(input: {
    entryPagePresent: boolean
    shell?: AccountEventPageShell | null
  }) {
    if (input.entryPagePresent) {
      clearRetainedShell()
      return
    }

    if (input.shell) {
      pageShell.value = input.shell
    }
  }

  return {
    applySelectedPageState,
    clearRetainedShell,
    initialPageFamily: options.initialPageFamily,
    pageShell: retainedPageShell,
    queryForPage
  }
}
