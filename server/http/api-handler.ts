import type { EventHandlerRequest, H3Event } from 'h3'

import { defineEventHandler, setResponseHeader } from 'h3'

import { d1BookmarkHeader, getDatabaseBookmark } from '#server/database/client'
import { sendApiError } from './api-error'

export function defineApiHandler<T>(
  handler: (event: H3Event<EventHandlerRequest>) => Promise<T> | T
) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    } catch (error) {
      return sendApiError(event, error)
    } finally {
      const bookmark = getDatabaseBookmark(event)

      if (bookmark) {
        setResponseHeader(event, d1BookmarkHeader, bookmark)
      }
    }
  })
}
