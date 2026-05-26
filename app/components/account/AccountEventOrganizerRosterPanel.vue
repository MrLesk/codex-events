<script setup lang="ts">
import type { ApiListResponse } from '~/lib/api'
import type { EventRoleUserSummary } from '~/domains/events/access'

import { buildApiCacheKey, getApiSubjectKey, normalizeApiError } from '~/lib/api'

const toast = useToast()
const authenticatedUser = useUser()
const eventOrganizerCandidatePageSize = 20
type LoadStatus = 'idle' | 'pending' | 'success' | 'error'

const subjectKey = computed(() => getApiSubjectKey(authenticatedUser.value?.sub))
const currentOrganizers = useFetch<ApiListResponse<EventRoleUserSummary>>('/api/event-organizers', {
  key: () => buildApiCacheKey('event-organizers', subjectKey.value),
  watch: [subjectKey]
})

const mutationError = ref('')
const pendingActionUserId = ref<string | null>(null)
const candidateSearchInput = ref('')
const appliedCandidateSearch = ref('')
const candidateUsers = ref<EventRoleUserSummary[]>([])
const candidateUsersTotal = ref(0)
const currentCandidatePage = ref(1)
const candidateUsersStatus = ref<LoadStatus>('pending')
const candidateUsersErrorMessage = ref('')
const isLoadingMoreCandidates = ref(false)
const loadMoreCandidatesErrorMessage = ref('')
const initializedSubjectKey = ref<string | null>(null)
const candidateRequestSequence = ref(0)
let pendingCandidateSearchTimeout: ReturnType<typeof setTimeout> | null = null

const currentEventOrganizers = computed(() => currentOrganizers.data.value?.data ?? [])
const currentEventOrganizerCount = computed(() => currentEventOrganizers.value.length)
const candidateRows = computed(() =>
  candidateUsers.value.filter(user => appliedCandidateSearch.value.length > 0 || !user.isEventOrganizer)
)
const hasMoreCandidates = computed(() => candidateUsers.value.length < candidateUsersTotal.value)
const candidateSkeletonRowCount = 3
const emptyCandidateMessage = computed(() =>
  appliedCandidateSearch.value.length > 0
    ? 'No people match this search.'
    : hasMoreCandidates.value
      ? 'No new people are in this batch. Load more to keep looking.'
      : 'No more active users are available to add right now.'
)

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
  return await $fetch<ApiListResponse<EventRoleUserSummary>>('/api/event-organizers/candidates', {
    query: {
      page,
      page_size: eventOrganizerCandidatePageSize,
      ...(appliedCandidateSearch.value.length > 0
        ? {
            search: appliedCandidateSearch.value
          }
        : {})
    }
  })
}

async function loadCandidateUsers() {
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
  if (candidateUsersStatus.value === 'pending' || isLoadingMoreCandidates.value || !hasMoreCandidates.value) {
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
  }, 250)
}

watch(candidateSearchInput, (value) => {
  const normalizedValue = value.trim()

  if (normalizedValue === appliedCandidateSearch.value) {
    return
  }

  loadMoreCandidatesErrorMessage.value = ''
  scheduleCandidateSearch(normalizedValue)
})

watch(subjectKey, async (nextSubjectKey) => {
  if (initializedSubjectKey.value === nextSubjectKey) {
    return
  }

  cancelPendingCandidateSearch()
  initializedSubjectKey.value = nextSubjectKey
  appliedCandidateSearch.value = ''
  candidateSearchInput.value = ''
  resetCandidateState()
  await loadCandidateUsers()
}, {
  immediate: import.meta.client
})

onBeforeUnmount(() => {
  cancelPendingCandidateSearch()
})

function isPendingAction(userId: string) {
  return pendingActionUserId.value === userId
}

function isCandidateActionDisabled(user: EventRoleUserSummary) {
  return user.isEventOrganizer
}

function getCandidateActionLabel(user: EventRoleUserSummary) {
  return user.isEventOrganizer ? 'Already event organizer' : 'Add event organizer'
}

async function addEventOrganizer(user: EventRoleUserSummary) {
  mutationError.value = ''
  pendingActionUserId.value = user.id

  try {
    await $fetch(`/api/event-organizers/${user.id}`, {
      method: 'PUT'
    })
    toast.add({
      title: 'Event organizer added',
      description: `${user.displayName} can now create events and manage the events they create.`,
      color: 'success'
    })
    await Promise.all([
      currentOrganizers.refresh(),
      loadCandidateUsers()
    ])
  } catch (error) {
    mutationError.value = normalizeApiError(error).message
  } finally {
    pendingActionUserId.value = null
  }
}

async function removeEventOrganizer(user: EventRoleUserSummary) {
  const confirmed = window.confirm(`Remove event organizer access for ${user.displayName}?`)

  if (!confirmed) {
    return
  }

  mutationError.value = ''
  pendingActionUserId.value = user.id

  try {
    await $fetch(`/api/event-organizers/${user.id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Event organizer removed',
      description: user.isPlatformAdmin
        ? `${user.displayName} still has platform admin access.`
        : `${user.displayName} can no longer create events as an event organizer.`,
      color: 'success'
    })
    await Promise.all([
      currentOrganizers.refresh(),
      loadCandidateUsers()
    ])
  } catch (error) {
    mutationError.value = normalizeApiError(error).message
  } finally {
    pendingActionUserId.value = null
  }
}
</script>

<template>
  <AppCard class="rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted dark:text-white">
          Event organizers
        </h2>
        <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
          Review who can create events without granting platform-wide admin access.
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <AppAlert
        v-if="mutationError"
        color="error"
        variant="soft"
        title="Event organizer update failed"
        :description="mutationError"
      />

      <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            Current event organizers
          </h3>
          <p class="text-xs text-muted">
            {{ currentEventOrganizerCount }} current
          </p>
        </div>

        <AppAlert
          v-if="currentOrganizers.error.value"
          color="error"
          variant="soft"
          title="Unable to load event organizers"
          :description="currentOrganizers.error.value.message"
        />

        <AppAlert
          v-else-if="currentOrganizers.status.value === 'pending'"
          color="neutral"
          variant="soft"
          title="Loading event organizers"
          description="Fetching the current event-organizer roster."
        />

        <div
          v-else-if="currentEventOrganizers.length > 0"
          class="grid gap-3"
        >
          <div
            v-for="user in currentEventOrganizers"
            :key="user.id"
            class="min-h-[4.75rem] flex flex-col gap-3 rounded-lg border border-black/8 bg-white/85 px-4 py-3 md:flex-row md:items-center md:justify-between dark:border-white/[0.08] dark:bg-[#111111]"
          >
            <div class="min-w-0 flex-1 space-y-0.5">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-semibold text-highlighted">
                  {{ user.displayName }}
                </p>
                <AppBadge
                  color="primary"
                  variant="soft"
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                >
                  Event organizer
                </AppBadge>
                <AppBadge
                  v-if="user.isPlatformAdmin"
                  color="neutral"
                  variant="soft"
                  class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                >
                  Platform admin
                </AppBadge>
              </div>
              <p class="text-sm text-muted">
                {{ user.email }}
              </p>
            </div>

            <AppButton
              size="sm"
              color="error"
              variant="soft"
              class="shrink-0 self-start md:self-auto"
              :loading="isPendingAction(user.id)"
              @click="removeEventOrganizer(user)"
            >
              Remove access
            </AppButton>
          </div>
        </div>

        <p
          v-else
          class="text-sm text-muted"
        >
          No active event organizers are configured.
        </p>
      </div>

      <div class="space-y-4 border-t border-black/8 pt-6 dark:border-white/[0.08]">
        <div class="space-y-1">
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            Add event organizers
          </h3>
          <p class="text-sm text-muted">
            Search by name, email, or user ID. Event organizers can create events and manage only the events they create or are assigned to.
          </p>
        </div>

        <AppInput
          v-model="candidateSearchInput"
          type="search"
          name="event-organizer-candidate-search"
          autocomplete="off"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          placeholder="Search users by name, email, or user ID"
        />

        <AppAlert
          v-if="candidateUsersStatus === 'error'"
          color="error"
          variant="soft"
          title="Unable to load candidate users"
          :description="candidateUsersErrorMessage"
        />

        <div
          v-else
          class="grid gap-3"
        >
          <template v-if="candidateUsersStatus === 'pending' && candidateUsers.length === 0">
            <div
              v-for="index in candidateSkeletonRowCount"
              :key="`event-organizer-candidate-skeleton-${index}`"
              class="min-h-[4.75rem] flex flex-col gap-3 rounded-lg border border-black/8 bg-white/85 px-4 py-3 md:flex-row md:items-center md:justify-between dark:border-white/[0.08] dark:bg-[#111111]"
              aria-hidden="true"
            >
              <div class="space-y-1.5">
                <div class="h-5 w-36 animate-pulse rounded-full bg-black/8 dark:bg-white/[0.08]" />
                <div class="h-4 w-52 animate-pulse rounded-full bg-black/6 dark:bg-white/[0.06]" />
              </div>

              <div class="h-8 w-32 animate-pulse rounded-lg bg-black/6 dark:bg-white/[0.06] md:self-auto" />
            </div>
          </template>

          <template v-else>
            <div
              v-for="user in candidateRows"
              :key="user.id"
              class="min-h-[4.75rem] flex flex-col gap-3 rounded-lg border border-black/8 bg-white/85 px-4 py-3 md:flex-row md:items-center md:justify-between dark:border-white/[0.08] dark:bg-[#111111]"
            >
              <div class="min-w-0 flex-1 space-y-0.5">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="mr-1 font-semibold text-highlighted">
                    {{ user.displayName }}
                  </p>
                  <AppBadge
                    v-if="user.isEventOrganizer"
                    color="primary"
                    variant="soft"
                    class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  >
                    Event organizer
                  </AppBadge>
                  <AppBadge
                    v-if="user.isPlatformAdmin"
                    color="neutral"
                    variant="soft"
                    class="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                  >
                    Platform admin
                  </AppBadge>
                </div>
                <p class="text-sm text-muted">
                  {{ user.email }}
                </p>
              </div>

              <AppButton
                size="sm"
                color="neutral"
                variant="soft"
                class="shrink-0 self-start md:self-auto"
                :disabled="isCandidateActionDisabled(user)"
                :loading="!isCandidateActionDisabled(user) && isPendingAction(user.id)"
                @click="isCandidateActionDisabled(user) ? undefined : addEventOrganizer(user)"
              >
                {{ getCandidateActionLabel(user) }}
              </AppButton>
            </div>

            <p
              v-if="candidateRows.length === 0"
              class="text-sm text-muted"
            >
              {{ emptyCandidateMessage }}
            </p>
          </template>
        </div>

        <div class="flex flex-col items-start gap-3">
          <AppButton
            v-if="hasMoreCandidates && candidateUsersStatus !== 'error'"
            color="neutral"
            variant="outline"
            :loading="isLoadingMoreCandidates"
            @click="loadMoreCandidates"
          >
            Load more
          </AppButton>

          <AppAlert
            v-if="loadMoreCandidatesErrorMessage"
            color="warning"
            variant="soft"
            title="More users unavailable"
            :description="loadMoreCandidatesErrorMessage"
          />
        </div>
      </div>
    </div>
  </AppCard>
</template>
