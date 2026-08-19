import type { H3Event } from 'h3'

import { setHeader } from 'h3'

export const publicEventCacheControl = 'public, max-age=0, s-maxage=30, stale-while-revalidate=60'
export const privatePublicEventCacheControl = 'private, no-store'

function hashCachePayload(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(16)
}

export function buildPublicEventEtag(scope: string, payload: unknown) {
  return `"${hashCachePayload(`${scope}:${JSON.stringify(payload)}`)}"`
}

export function setPrivatePublicEventCacheHeaders(event: H3Event) {
  setHeader(event, 'cache-control', privatePublicEventCacheControl)
}

export function setPublicEventCacheHeaders(event: H3Event, scope: string, payload: unknown) {
  setHeader(event, 'cache-control', publicEventCacheControl)
  setHeader(event, 'etag', buildPublicEventEtag(scope, payload))
  setHeader(event, 'vary', 'Accept-Encoding')
}
