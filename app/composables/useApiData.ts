import type { MultiWatchSources } from 'vue'

interface UseApiDataOptions<Data> {
  default?: () => Data
  immediate?: boolean
  lazy?: boolean
  server?: boolean
  timeout?: number
  watch?: MultiWatchSources
}

interface UseApiDataContext {
  apiFetch: ReturnType<typeof useRequestFetch>
  signal: AbortSignal
}

interface ApiDataResponse<Data> {
  data: Data
}

export const useApiFetch = createUseFetch({
  deep: false,
  dedupe: 'cancel'
})

const useManagedApiData = createUseAsyncData({
  deep: false,
  dedupe: 'cancel'
})

export function useApiData<Data>(
  key: MaybeRefOrGetter<string>,
  handler: (context: UseApiDataContext) => Promise<Data>,
  options?: UseApiDataOptions<Data>
) {
  const apiFetch = import.meta.server ? useRequestFetch() : $fetch

  return useManagedApiData<Data>(
    key,
    (_nuxtApp, { signal }) => handler({ apiFetch, signal }),
    options
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
