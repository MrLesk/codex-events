import type { MultiWatchSources } from 'vue'
import type { ApiDataResponse } from '~/lib/api'

import { useApiClient } from './useApiClient'
import { useAuthorizationCache, type ApiCacheScope } from './useAuthorizationCache'

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
  const resolvedKey = cacheScope === 'protected'
    ? useAuthorizationCache().protectedKey(key)
    : key

  return useAsyncData<Data>(
    resolvedKey,
    (_nuxtApp, { signal }) => handler({ apiFetch, signal }),
    {
      deep: false,
      dedupe: 'cancel',
      ...asyncDataOptions
    }
  )
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
