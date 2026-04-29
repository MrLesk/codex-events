export interface ApiErrorShape {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ApiDataResponse<T> {
  data: T
}

export interface ApiListResponse<T> {
  data: T[]
  meta?: {
    page?: number
    pageSize?: number
    total?: number
    [key: string]: unknown
  }
}

export async function listAllPaginatedItems<T>(
  fetchPage: (page: number, pageSize: number) => Promise<ApiListResponse<T>>,
  pageSize: number = 100
) {
  const items: T[] = []
  let page = 1
  let total: number | null = null

  while (true) {
    const response = await fetchPage(page, pageSize)
    const pageItems = response.data

    items.push(...pageItems)
    total = response.meta?.total ?? total

    const reachedKnownTotal = total !== null && items.length >= total
    const reachedLastPage = pageItems.length < pageSize

    if (pageItems.length === 0 || reachedKnownTotal || reachedLastPage) {
      return items
    }

    page += 1
  }
}

export function getApiSubjectKey(subject: string | null | undefined) {
  return subject?.trim() || 'anonymous'
}

export function buildApiCacheKey(...parts: Array<string>) {
  return parts.join(':')
}

export function normalizeApiError(error: unknown): ApiErrorShape {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      data?: {
        error?: ApiErrorShape
      }
      response?: {
        _data?: {
          error?: ApiErrorShape
        }
      }
      message?: string
      statusMessage?: string
    }

    const apiError = maybeError.data?.error ?? maybeError.response?._data?.error

    if (apiError?.code && apiError.message) {
      return apiError
    }

    if (typeof maybeError.statusMessage === 'string' && maybeError.statusMessage.length > 0) {
      return {
        code: 'request_failed',
        message: maybeError.statusMessage
      }
    }

    if (typeof maybeError.message === 'string' && maybeError.message.length > 0) {
      return {
        code: 'request_failed',
        message: maybeError.message
      }
    }
  }

  return {
    code: 'request_failed',
    message: 'The request failed unexpectedly.'
  }
}
