import type { FetchHook, FetchOptions, FetchRequest } from 'ofetch'

const d1BookmarkHeader = 'x-d1-bookmark'
const d1BookmarkStateKey = 'account-api:d1-bookmark'
const d1RequestSequenceStateKey = 'account-api:d1-request-sequence'
const d1AppliedBookmarkSequenceStateKey = 'account-api:d1-applied-bookmark-sequence'

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
  const requestSequence = useState<number>(d1RequestSequenceStateKey, () => 0)
  const appliedBookmarkSequence = useState<number>(d1AppliedBookmarkSequenceStateKey, () => 0)
  const requestFetch: ApiClient = import.meta.server
    ? useRequestFetch() as unknown as ApiClient
    : $fetch as unknown as ApiClient

  const apiClient = async <T>(request: FetchRequest, options?: FetchOptions) => {
    const sequence = requestSequence.value + 1
    requestSequence.value = sequence
    const captureBookmark: FetchHook = ({ response }) => {
      const nextBookmark = response?.headers.get(d1BookmarkHeader)?.trim()

      if (nextBookmark && sequence >= appliedBookmarkSequence.value) {
        appliedBookmarkSequence.value = sequence
        bookmark.value = nextBookmark
      }
    }

    return await requestFetch<T>(request, {
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
  }

  return apiClient as ApiClient
}
