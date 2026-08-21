import type { AsyncData, NuxtError, UseFetchOptions } from 'nuxt/app'
import type { FetchOptions, FetchRequest } from 'ofetch'

import { useAccountBootstrap } from './useAccountBootstrap'
import { useApiClient, type ApiClient } from './useApiClient'
import { useAuthorizationCache } from './useAuthorizationCache'

export function useApiFetch<Data>(
  request: MaybeRefOrGetter<string>,
  options?: UseFetchOptions<Data, Data, never[], Data>
): AsyncData<Data, NuxtError<unknown>> {
  const apiClient = useApiClient()
  const bootstrap = useAccountBootstrap()
  const authorizationCache = useAuthorizationCache()
  const protectedKey = authorizationCache.protectedKey(options?.key ?? request)
  const gatedApiClient: ApiClient = async <T>(request: FetchRequest, fetchOptions?: FetchOptions) => {
    await bootstrap.ensureLoaded(fetchOptions?.signal ?? undefined)
    return await apiClient<T>(request, fetchOptions)
  }

  return useFetch(request, {
    deep: false,
    dedupe: 'cancel',
    ...options,
    key: protectedKey,
    $fetch: gatedApiClient as unknown as typeof $fetch
  } as UseFetchOptions<Data, Data, never[], Data>) as AsyncData<Data, NuxtError<unknown>>
}
