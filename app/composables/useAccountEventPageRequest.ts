import type { MultiWatchSources } from 'vue'

import type { ApiDataResponse } from '~/lib/api'
import { throwIfAborted } from '~/lib/request-cancellation'
import {
  buildAccountEventPageCacheKey,
  buildAccountEventPagePath,
  type AccountEventPageName,
  type AccountEventPageResponse
} from '~/domains/events/account-workspace-page'

import { useAbortableRequest } from './useAbortableRequest'
import { useApiData } from './useApiData'
import { useAuthorizationCache } from './useAuthorizationCache'
import { useSessionActor } from './useSessionActor'

export interface UseAccountEventPageRequestOptions<TPage> {
  default?: () => AccountEventPageResponse<TPage>
  immediate?: boolean
  watch?: MultiWatchSources
}

function linkAbortSignals(...signals: AbortSignal[]) {
  const controller = new AbortController()
  const abort = () => controller.abort()

  if (signals.some(signal => signal.aborted)) {
    controller.abort()
    return {
      signal: controller.signal,
      dispose: () => undefined
    }
  }

  for (const signal of signals) {
    signal.addEventListener('abort', abort, { once: true })
  }

  return {
    signal: controller.signal,
    dispose: () => {
      for (const signal of signals) {
        signal.removeEventListener('abort', abort)
      }
    }
  }
}

export function useAccountEventPageRequest<TPage>(
  slug: MaybeRefOrGetter<string>,
  page: MaybeRefOrGetter<AccountEventPageName>,
  options: UseAccountEventPageRequestOptions<TPage> = {}
) {
  const session = useSessionActor()
  const authorizationCache = useAuthorizationCache()
  const requests = useAbortableRequest()
  const resolvedSlug = computed(() => toValue(slug))
  const resolvedPage = computed(() => toValue(page))
  const requestKey = computed(() => buildAccountEventPageCacheKey(
    resolvedSlug.value,
    resolvedPage.value
  ))
  const path = computed(() => buildAccountEventPagePath(
    resolvedSlug.value,
    resolvedPage.value
  ))

  const pageRequest = useApiData<AccountEventPageResponse<TPage>>(
    requestKey,
    async ({ apiFetch, signal }) => {
      const pageSignal = requests.createSignal('account-event-page')
      const linkedSignal = linkAbortSignals(signal, pageSignal)

      try {
        throwIfAborted(signal)
        throwIfAborted(pageSignal)

        await session.ensureLoaded()
        throwIfAborted(signal)
        throwIfAborted(pageSignal)

        const response = await apiFetch<ApiDataResponse<AccountEventPageResponse<TPage>>>(
          path.value,
          { signal: linkedSignal.signal }
        )

        throwIfAborted(signal)
        throwIfAborted(pageSignal)
        return response.data
      } finally {
        linkedSignal.dispose()
      }
    },
    {
      cacheScope: 'protected',
      default: options.default,
      dedupe: 'cancel',
      immediate: options.immediate ?? true,
      server: false,
      watch: [resolvedSlug, resolvedPage, ...(options.watch ?? [])]
    }
  )

  return {
    actor: session.actor,
    authorizationGeneration: authorizationCache.authorizationGeneration,
    bootstrap: session.bootstrap,
    capabilities: session.capabilities,
    clear: pageRequest.clear,
    data: pageRequest.data,
    error: pageRequest.error,
    page: resolvedPage,
    path,
    pending: pageRequest.pending,
    refresh: pageRequest.refresh,
    requestKey,
    slug: resolvedSlug,
    status: pageRequest.status,
    abort: () => requests.abort('account-event-page')
  }
}
