import type { FetchHook, FetchOptions, FetchRequest } from 'ofetch'
import type { AsyncData, NuxtError, UseFetchOptions } from 'nuxt/app'

const d1BookmarkHeader = 'x-d1-bookmark'
const d1BookmarkStateKey = 'account-api:d1-bookmark'

export type ApiClient = <T = unknown>(
  request: FetchRequest,
  options?: FetchOptions
) => Promise<T>

function listHooks(hook: FetchOptions['onResponse'] | FetchOptions['onResponseError']) {
  if (!hook) {
    return []
  }

  return Array.isArray(hook) ? hook : [hook]
}

function addBookmarkHeader(headers: HeadersInit | undefined, bookmark: string | null) {
  const nextHeaders = new Headers(headers)

  if (bookmark) {
    nextHeaders.set(d1BookmarkHeader, bookmark)
  }

  return nextHeaders
}

export function useApiClient() {
  const bookmark = useState<string | null>(d1BookmarkStateKey, () => null)
  const requestFetch: ApiClient = import.meta.server
    ? useRequestFetch() as unknown as ApiClient
    : $fetch as unknown as ApiClient

  const captureBookmark: FetchHook = ({ response }) => {
    const nextBookmark = response?.headers.get(d1BookmarkHeader)?.trim()

    if (nextBookmark) {
      bookmark.value = nextBookmark
    }
  }

  const apiClient = async <T>(request: FetchRequest, options?: FetchOptions) => await requestFetch<T>(request, {
    ...options,
    headers: addBookmarkHeader(options?.headers, bookmark.value),
    onResponse: [
      captureBookmark,
      ...listHooks(options?.onResponse)
    ],
    onResponseError: [
      captureBookmark,
      ...listHooks(options?.onResponseError)
    ]
  })

  return apiClient as ApiClient
}

export function useApiFetch<Data>(
  request: MaybeRefOrGetter<string>,
  options?: UseFetchOptions<Data, Data, never[], Data>
): AsyncData<Data, NuxtError<unknown>> {
  const apiClient = useApiClient()

  return useFetch(request, {
    deep: false,
    dedupe: 'cancel',
    ...options,
    $fetch: apiClient as unknown as typeof $fetch
  } as UseFetchOptions<Data, Data, never[], Data>) as AsyncData<Data, NuxtError<unknown>>
}
