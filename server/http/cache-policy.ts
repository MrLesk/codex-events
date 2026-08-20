import type { H3Event } from 'h3'

import {
  getRequestURL,
  getResponseHeader,
  isWebResponse,
  setHeader
} from 'h3'

export const protectedApiCacheControl = 'private, no-store'
export const protectedApiCdnCacheControl = 'private, no-store'

export const publicEventCacheControl = 'public, max-age=30, stale-if-error=0'
export const publicEventCdnCacheControl = 'public, max-age=30, stale-if-error=0'

type BeforeResponse = {
  body?: unknown
}

const publicCacheableApiPathPatterns = [
  /^\/api\/public\/events$/u,
  /^\/api\/public\/events\/[^/]+$/u,
  /^\/api\/public\/events\/[^/]+\/(?:evaluation-criteria|photos|prizes|published-projects|winners)$/u,
  /^\/api\/public\/events\/[^/]+\/images\/(?:background|banner)$/u,
  /^\/api\/public\/events\/[^/]+\/photos\/[^/]+\/image$/u,
  /^\/api\/public\/platform\/event-default-background-image$/u
]

function normalizedPath(path: string) {
  const withoutTrailingSlash = path.replace(/\/+$/u, '')
  return withoutTrailingSlash || '/'
}

function hasHeaderValue(value: string | number | string[] | undefined, expected: string) {
  return typeof value === 'string' && value === expected
}

function hasCanonicalPublicEventCacheHeaders(event: H3Event, body: unknown) {
  if (isWebResponse(body)) {
    return body.headers.get('cache-control') === publicEventCacheControl
      && body.headers.get('cloudflare-cdn-cache-control') === publicEventCdnCacheControl
  }

  return hasHeaderValue(getResponseHeader(event, 'cache-control'), publicEventCacheControl)
    && hasHeaderValue(
      getResponseHeader(event, 'cloudflare-cdn-cache-control'),
      publicEventCdnCacheControl
    )
}

function withProtectedResponseCacheHeaders(response: Response) {
  try {
    response.headers.set('cache-control', protectedApiCacheControl)
    response.headers.set('cloudflare-cdn-cache-control', protectedApiCdnCacheControl)
    return response
  } catch {
    const replacement = response.clone()
    replacement.headers.set('cache-control', protectedApiCacheControl)
    replacement.headers.set('cloudflare-cdn-cache-control', protectedApiCdnCacheControl)
    return replacement
  }
}

export function isPublicCacheableApiPath(path: string) {
  const normalized = normalizedPath(path)
  return publicCacheableApiPathPatterns.some(pattern => pattern.test(normalized))
}

export function isProtectedApiPath(path: string) {
  return normalizedPath(path).startsWith('/api/') && !isPublicCacheableApiPath(path)
}

export function applyApiResponseCachePolicy(
  event: H3Event,
  response?: BeforeResponse
) {
  const path = normalizedPath(getRequestURL(event).pathname)

  if (!path.startsWith('/api/')) {
    return 'outside_api' as const
  }

  const body = response?.body
  if (isPublicCacheableApiPath(path) && hasCanonicalPublicEventCacheHeaders(event, body)) {
    return 'public' as const
  }

  setHeader(event, 'cache-control', protectedApiCacheControl)
  setHeader(event, 'cloudflare-cdn-cache-control', protectedApiCdnCacheControl)

  if (response && isWebResponse(body)) {
    response.body = withProtectedResponseCacheHeaders(body)
  }

  return 'protected' as const
}
