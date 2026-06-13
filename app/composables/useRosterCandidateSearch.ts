import type { ApiListResponse } from '~/lib/api'

import { normalizeApiError } from '~/lib/api'

export type RosterCandidateLoadStatus = 'idle' | 'pending' | 'success' | 'error'

interface RosterCandidateSearchPageRequest {
  page: number
  pageSize: number
  search: string
}

interface UseRosterCandidateSearchOptions<TCandidate extends { id: string }> {
  pageSize: number
  resetKey: MaybeRefOrGetter<string | null>
  enabled?: MaybeRefOrGetter<boolean>
  debounceMs?: number
  loadPage: (request: RosterCandidateSearchPageRequest) => Promise<ApiListResponse<TCandidate>>
}

export function useRosterCandidateSearch<TCandidate extends { id: string }>(
  options: UseRosterCandidateSearchOptions<TCandidate>
) {
  const debounceMs = options.debounceMs ?? 250
  const isEnabled = computed(() => options.enabled === undefined || toValue(options.enabled))
  const activeResetKey = computed(() => isEnabled.value ? toValue(options.resetKey) : null)
  const candidateSearchInput = shallowRef('')
  const appliedCandidateSearch = shallowRef('')
  const candidateUsers = shallowRef<TCandidate[]>([])
  const candidateUsersTotal = shallowRef(0)
  const currentCandidatePage = shallowRef(1)
  const candidateUsersStatus = shallowRef<RosterCandidateLoadStatus>('pending')
  const candidateUsersErrorMessage = shallowRef('')
  const isLoadingMoreCandidates = shallowRef(false)
  const loadMoreCandidatesErrorMessage = shallowRef('')
  const initializedResetKey = shallowRef<string | null>(null)
  const candidateRequestSequence = shallowRef(0)
  let pendingCandidateSearchTimeout: ReturnType<typeof setTimeout> | null = null

  const hasMoreCandidates = computed(() => candidateUsers.value.length < candidateUsersTotal.value)

  function resetCandidateState() {
    candidateRequestSequence.value += 1
    candidateUsers.value = []
    candidateUsersTotal.value = 0
    currentCandidatePage.value = 1
    candidateUsersStatus.value = 'idle'
    candidateUsersErrorMessage.value = ''
    isLoadingMoreCandidates.value = false
    loadMoreCandidatesErrorMessage.value = ''
  }

  async function fetchCandidatePage(page: number) {
    return await options.loadPage({
      page,
      pageSize: options.pageSize,
      search: appliedCandidateSearch.value
    })
  }

  async function loadCandidateUsers() {
    if (!isEnabled.value) {
      return
    }

    const requestId = ++candidateRequestSequence.value

    candidateUsersStatus.value = 'pending'
    candidateUsersErrorMessage.value = ''
    loadMoreCandidatesErrorMessage.value = ''

    try {
      const response = await fetchCandidatePage(1)

      if (requestId !== candidateRequestSequence.value) {
        return
      }

      candidateUsers.value = response.data
      candidateUsersTotal.value = response.meta?.total ?? response.data.length
      currentCandidatePage.value = 1
      candidateUsersStatus.value = 'success'
    } catch (error) {
      if (requestId !== candidateRequestSequence.value) {
        return
      }

      candidateUsers.value = []
      candidateUsersTotal.value = 0
      currentCandidatePage.value = 1
      candidateUsersStatus.value = 'error'
      candidateUsersErrorMessage.value = normalizeApiError(error).message
    }
  }

  async function loadMoreCandidates() {
    if (
      !isEnabled.value
      || candidateUsersStatus.value === 'pending'
      || isLoadingMoreCandidates.value
      || !hasMoreCandidates.value
    ) {
      return
    }

    const requestId = ++candidateRequestSequence.value
    const nextPage = currentCandidatePage.value + 1

    isLoadingMoreCandidates.value = true
    loadMoreCandidatesErrorMessage.value = ''

    try {
      const response = await fetchCandidatePage(nextPage)

      if (requestId !== candidateRequestSequence.value) {
        return
      }

      const nextUsers = [...candidateUsers.value, ...response.data].filter((user, index, items) =>
        items.findIndex(candidate => candidate.id === user.id) === index
      )

      candidateUsers.value = nextUsers
      candidateUsersTotal.value = response.meta?.total ?? nextUsers.length
      currentCandidatePage.value = nextPage
    } catch (error) {
      if (requestId !== candidateRequestSequence.value) {
        return
      }

      loadMoreCandidatesErrorMessage.value = normalizeApiError(error).message
    } finally {
      if (requestId === candidateRequestSequence.value) {
        isLoadingMoreCandidates.value = false
      }
    }
  }

  function cancelPendingCandidateSearch() {
    if (pendingCandidateSearchTimeout) {
      clearTimeout(pendingCandidateSearchTimeout)
      pendingCandidateSearchTimeout = null
    }
  }

  function scheduleCandidateSearch(value: string) {
    cancelPendingCandidateSearch()

    pendingCandidateSearchTimeout = setTimeout(async () => {
      pendingCandidateSearchTimeout = null
      appliedCandidateSearch.value = value

      await loadCandidateUsers()
    }, debounceMs)
  }

  watch(candidateSearchInput, (value) => {
    const normalizedValue = value.trim()

    if (!isEnabled.value || normalizedValue === appliedCandidateSearch.value) {
      return
    }

    loadMoreCandidatesErrorMessage.value = ''
    scheduleCandidateSearch(normalizedValue)
  })

  watch(activeResetKey, async (nextResetKey) => {
    if (initializedResetKey.value === nextResetKey) {
      return
    }

    cancelPendingCandidateSearch()
    initializedResetKey.value = nextResetKey
    appliedCandidateSearch.value = ''
    candidateSearchInput.value = ''
    resetCandidateState()

    if (!nextResetKey) {
      return
    }

    await loadCandidateUsers()
  }, {
    immediate: import.meta.client
  })

  onBeforeUnmount(() => {
    cancelPendingCandidateSearch()
  })

  return {
    candidateSearchInput,
    appliedCandidateSearch,
    candidateUsers,
    candidateUsersStatus,
    candidateUsersErrorMessage,
    isLoadingMoreCandidates,
    loadMoreCandidatesErrorMessage,
    hasMoreCandidates,
    loadCandidateUsers,
    loadMoreCandidates
  }
}
