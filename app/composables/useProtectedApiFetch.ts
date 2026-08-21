import type { AsyncData, NuxtError, UseFetchOptions } from 'nuxt/app'
import type { FetchOptions, FetchRequest } from 'ofetch'
import { computed, toValue } from 'vue'

import { useAccountBootstrap } from './useAccountBootstrap'
import { useApiClient, type ApiClient } from './useApiClient'
import { useAuthorizationCache } from './useAuthorizationCache'
import {
  buildProtectedRequestKey,
  resolveProtectedWatchSources,
  useProtectedRequestOwner
} from './useProtectedRequestOwner'

export function useApiFetch<Data>(
  request: MaybeRefOrGetter<string>,
  options?: UseFetchOptions<Data, Data, never[], Data>
): AsyncData<Data, NuxtError<unknown>> {
  const apiClient = useApiClient()
  const bootstrap = useAccountBootstrap()
  const authorizationCache = useAuthorizationCache()
  const protectedRequestShapeKey = computed(() => buildProtectedRequestKey(
    toValue(options?.key ?? request),
    toValue(request),
    toValue(options?.method ?? 'GET'),
    toValue(options?.baseURL),
    toValue(options?.query),
    toValue(options?.params),
    toValue(options?.headers),
    toValue(options?.body),
    toValue(options?.responseType),
    toValue(options?.ignoreResponseError),
    resolveProtectedWatchSources(options?.watch)
  ))
  const protectedKey = authorizationCache.protectedKey(protectedRequestShapeKey)
  const protectedRequestOwner = useProtectedRequestOwner()
  const gatedApiClient: ApiClient = async <T>(request: FetchRequest, fetchOptions?: FetchOptions) => {
    const method = String(fetchOptions?.method ?? 'GET').toUpperCase()

    if (method !== 'GET' && method !== 'HEAD') {
      await bootstrap.ensureLoaded(fetchOptions?.signal ?? undefined)
      return await apiClient<T>(request, fetchOptions)
    }

    await bootstrap.ensureLoaded(fetchOptions?.signal ?? undefined)

    return await protectedRequestOwner.execute(
      toValue(protectedKey),
      fetchOptions?.signal ?? undefined,
      async ownerSignal => await apiClient<T>(request, {
        ...fetchOptions,
        signal: ownerSignal
      })
    )
  }

  const asyncData = useFetch(request, {
    deep: false,
    ...options,
    dedupe: 'cancel',
    key: protectedKey,
    $fetch: gatedApiClient as unknown as typeof $fetch
  } as UseFetchOptions<Data, Data, never[], Data>) as AsyncData<Data, NuxtError<unknown>>

  const rawRefresh = asyncData.refresh
  const rawExecute = asyncData.execute
  const rawClear = asyncData.clear
  const refresh = (refreshOptions?: Parameters<typeof asyncData.refresh>[0]) => {
    protectedRequestOwner.invalidate(toValue(protectedKey))
    return rawRefresh({
      ...refreshOptions,
      dedupe: 'cancel'
    })
  }
  const activate = (executeOptions?: Parameters<typeof asyncData.execute>[0]) => {
    if (asyncData.status.value !== 'idle') {
      return Promise.resolve()
    }

    return rawExecute({
      ...executeOptions,
      dedupe: 'defer'
    })
  }
  const clear = () => {
    protectedRequestOwner.invalidate(toValue(protectedKey))
    rawClear()
  }

  return Object.assign(asyncData, {
    activate,
    clear,
    execute: refresh,
    refresh
  })
}
