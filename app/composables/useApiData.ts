import type { MultiWatchSources } from 'vue'
import type { ApiDataResponse } from '~/lib/api'

import { useAccountBootstrap } from './useAccountBootstrap'
import { useApiClient } from './useApiClient'
import { useAuthorizationCache, type ApiCacheScope } from './useAuthorizationCache'
import { useProtectedRequestOwner } from './useProtectedRequestOwner'

interface UseApiDataOptions<Data> {
  cacheScope?: ApiCacheScope
  default?: () => Data
  dedupe?: 'cancel' | 'defer'
  immediate?: boolean
  lazy?: boolean
  server?: boolean
  timeout?: number
  watch?: MultiWatchSources
}

interface UseApiDataContext {
  apiFetch: ReturnType<typeof useApiClient>
  signal: AbortSignal
}

export function useApiData<Data>(
  key: MaybeRefOrGetter<string>,
  handler: (context: UseApiDataContext) => Promise<Data>,
  options?: UseApiDataOptions<Data>
) {
  const apiFetch = useApiClient()
  const cacheScope = options?.cacheScope ?? 'protected'
  const asyncDataOptions = { ...options }
  delete asyncDataOptions.cacheScope
  const bootstrap = cacheScope === 'protected'
    ? useAccountBootstrap()
    : null
  const resolvedKey = cacheScope === 'protected'
    ? useAuthorizationCache().protectedKey(key)
    : key
  const protectedRequestOwner = cacheScope === 'protected'
    ? useProtectedRequestOwner()
    : null

  const request = useAsyncData<Data>(
    resolvedKey,
    async (_nuxtApp, { signal }) => {
      if (!protectedRequestOwner) {
        return await handler({ apiFetch, signal })
      }

      await bootstrap?.ensureLoaded(signal)
      return await protectedRequestOwner.execute(
        toValue(resolvedKey),
        signal,
        async ownerSignal => await handler({ apiFetch, signal: ownerSignal })
      )
    },
    {
      deep: false,
      ...asyncDataOptions,
      dedupe: cacheScope === 'protected' ? 'cancel' : asyncDataOptions.dedupe ?? 'cancel'
    }
  )

  const rawExecute = request.execute
  const activate = (executeOptions?: Parameters<typeof request.execute>[0]) => {
    if (request.status.value !== 'idle') {
      return Promise.resolve()
    }

    return rawExecute({
      ...executeOptions,
      dedupe: 'defer'
    })
  }

  if (!protectedRequestOwner) {
    return Object.assign(request, { activate })
  }

  const rawRefresh = request.refresh
  const rawClear = request.clear
  const refresh = (refreshOptions?: Parameters<typeof request.refresh>[0]) => {
    protectedRequestOwner.invalidate(toValue(resolvedKey))
    return rawRefresh({
      ...refreshOptions,
      dedupe: 'cancel'
    })
  }
  const clear = () => {
    protectedRequestOwner.invalidate(toValue(resolvedKey))
    rawClear()
  }

  return Object.assign(request, {
    activate,
    clear,
    execute: refresh,
    refresh
  })
}

export function useApiResponse<Data>(
  key: MaybeRefOrGetter<string>,
  request: MaybeRefOrGetter<string>,
  options?: UseApiDataOptions<Data>
) {
  return useApiData<Data>(
    key,
    async ({ apiFetch, signal }) => {
      const response = await apiFetch<ApiDataResponse<Data>>(toValue(request), {
        signal
      })

      return response.data
    },
    options
  )
}
