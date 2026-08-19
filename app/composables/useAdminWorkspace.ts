import type { Ref } from 'vue'

import type { EventRecord } from '~/domains/events/records'
import { filterManageableEvents } from '~/domains/events/access'
import { buildApiCacheKey, getApiSubjectKey } from '~/lib/api'

import { useApiFetch } from './useApiClient'
import { useSessionActor } from './useSessionActor'

interface AdminWorkspaceOptions {
  loadEvents?: MaybeRefOrGetter<boolean>
}

interface RefreshableAsyncRequest {
  status: Ref<string>
  refresh: () => Promise<unknown>
}

function resolveLoadFlag(flag: MaybeRefOrGetter<boolean> | undefined) {
  return computed(() => flag === undefined ? true : toValue(flag))
}

function refreshWhenEnabled(request: RefreshableAsyncRequest, enabled: Ref<boolean>) {
  watch(enabled, async (isEnabled) => {
    if (!isEnabled || request.status.value !== 'idle') {
      return
    }

    await request.refresh()
  })
}

/**
 * Root admin dashboard data is separate from event-page reads. It owns the
 * manageable-event index needed by admin navigation and event creation; it
 * does not orchestrate any event-tab resources.
 */
export function useAdminWorkspace(options: AdminWorkspaceOptions = {}) {
  const loadEvents = resolveLoadFlag(options.loadEvents)
  const session = useSessionActor()
  const actor = session.actor
  const subjectKey = computed(() => getApiSubjectKey(
    actor.value.isAuthenticated ? actor.value.sessionUser.sub : null
  ))
  const events = useApiFetch<{ data: EventRecord[] }>(
    '/api/events?page=1&page_size=100',
    {
      key: () => buildApiCacheKey('admin-workspace-events', subjectKey.value),
      watch: [subjectKey],
      immediate: loadEvents.value
    }
  )

  refreshWhenEnabled(events, loadEvents)

  const manageableEvents = computed(() => filterManageableEvents(
    events.data.value?.data ?? [],
    actor.value
  ))

  async function refreshRoot() {
    const requests: Array<Promise<unknown>> = [session.refresh()]

    if (loadEvents.value) {
      requests.push(events.refresh())
    }

    await Promise.all(requests)
  }

  return {
    session,
    actor,
    subjectKey,
    events,
    manageableEvents,
    refreshRoot
  }
}
