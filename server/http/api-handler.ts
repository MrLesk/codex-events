import type { EventHandlerRequest, H3Event } from 'h3'

import { defineEventHandler } from 'h3'

import { sendApiError } from './api-error'
import { emitRequestTiming, startRequestTiming } from './request-timing'

export function defineApiHandler<T>(
  handler: (event: H3Event<EventHandlerRequest>) => Promise<T> | T
) {
  return defineEventHandler(async (event) => {
    startRequestTiming(event)

    try {
      const result = await handler(event)
      emitRequestTiming(event)
      return result
    } catch (error) {
      emitRequestTiming(event)
      return sendApiError(event, error)
    }
  })
}
