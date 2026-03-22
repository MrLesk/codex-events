import type { EventHandlerRequest, H3Event } from 'h3'

import { defineEventHandler } from 'h3'

import { sendApiError } from './api-error'

export function defineApiHandler<T>(
  handler: (event: H3Event<EventHandlerRequest>) => Promise<T> | T
) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    } catch (error) {
      return sendApiError(event, error)
    }
  })
}
