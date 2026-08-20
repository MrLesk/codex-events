import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'

import {
  buildManagedMediaCleanupQueueMessage,
  enqueueManagedMediaCleanupMessage,
  managedMediaCleanupDelaySeconds,
  parseManagedMediaCleanupMessage,
  processManagedMediaCleanupQueueMessage,
  scheduleManagedMediaCleanup
} from '../../../../../server/domains/media/cleanup-queue'

function createEvent(cloudflareEnv: Record<string, unknown>, runtimeConfig: Record<string, unknown> = {}) {
  return {
    context: {
      cloudflare: {
        env: cloudflareEnv
      },
      runtimeConfig
    }
  } as H3Event
}

function createMessage(body: unknown) {
  return {
    id: 'message_1',
    body,
    ack: vi.fn(),
    retry: vi.fn()
  }
}

describe('managed media cleanup queue', () => {
  test('builds fixed-kind messages and rejects unsafe object keys', () => {
    expect(buildManagedMediaCleanupQueueMessage({
      kind: 'event_image',
      objectKey: 'events/event_1/background/object_1'
    }, new Date('2026-08-20T12:00:00.000Z'))).toEqual({
      kind: 'event_image',
      objectKey: 'events/event_1/background/object_1',
      enqueuedAt: '2026-08-20T12:00:00.000Z'
    })
    expect(parseManagedMediaCleanupMessage({
      kind: 'profile_icon',
      objectKey: 'events/event_1/background/object_1',
      enqueuedAt: '2026-08-20T12:00:00.000Z'
    })).toBeNull()
  })

  test('sends cleanup with an explicit delayed delivery', async () => {
    const send = vi.fn(async () => undefined)
    const result = await enqueueManagedMediaCleanupMessage(
      createEvent({ MEDIA_CLEANUP_QUEUE: { send } }),
      {
        kind: 'event_photo',
        objectKey: 'events/event_1/photos/photo_1/object_1'
      }
    )

    expect(result).toEqual({ status: 'enqueued' })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'event_photo',
      objectKey: 'events/event_1/photos/photo_1/object_1'
    }), {
      contentType: 'json',
      delaySeconds: managedMediaCleanupDelaySeconds
    })
    expect(managedMediaCleanupDelaySeconds).toBeGreaterThanOrEqual(30)
  })

  test('schedules after the response boundary without awaiting the queue send', async () => {
    const send = vi.fn(async () => undefined)
    const waitUntil = vi.fn()
    const event = Object.assign(createEvent({ MEDIA_CLEANUP_QUEUE: { send } }), { waitUntil }) as H3Event & {
      waitUntil: (promise: Promise<unknown>) => void
    }

    scheduleManagedMediaCleanup(event, {
      kind: 'profile_icon',
      objectKey: 'users/user_1/profile-icon/object_1'
    })

    expect(waitUntil).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledTimes(1)
    await waitUntil.mock.calls[0]![0]
    expect(send).toHaveBeenCalledTimes(1)
  })

  test('maps fixed kinds to the correct bucket and acknowledges successful deletion', async () => {
    const eventImages = { delete: vi.fn(async () => undefined) }
    const profileIcons = { delete: vi.fn(async () => undefined) }
    const message = createMessage(buildManagedMediaCleanupQueueMessage({
      kind: 'profile_icon',
      objectKey: 'users/user_1/profile-icon/object_1'
    }))

    const outcome = await processManagedMediaCleanupQueueMessage(message, {
      cloudflareEnv: {
        EVENT_IMAGES: eventImages,
        PROFILE_ICONS: profileIcons
      }
    })

    expect(outcome).toMatchObject({ action: 'ack', reason: 'object_deleted' })
    expect(message.ack).toHaveBeenCalledTimes(1)
    expect(message.retry).not.toHaveBeenCalled()
    expect(profileIcons.delete).toHaveBeenCalledWith('users/user_1/profile-icon/object_1')
    expect(eventImages.delete).not.toHaveBeenCalled()
  })

  test('acknowledges invalid messages and retries transient cleanup failures', async () => {
    const invalidMessage = createMessage({
      kind: 'profile_icon',
      objectKey: 'events/event_1/background/object_1',
      enqueuedAt: '2026-08-20T12:00:00.000Z'
    })
    const invalidOutcome = await processManagedMediaCleanupQueueMessage(invalidMessage)

    expect(invalidOutcome).toMatchObject({ action: 'ack', reason: 'queue_message_invalid' })
    expect(invalidMessage.ack).toHaveBeenCalledTimes(1)

    const deleteError = new Error('R2 unavailable')
    const eventImages = {
      delete: vi.fn(async () => {
        throw deleteError
      })
    }
    const failedMessage = createMessage(buildManagedMediaCleanupQueueMessage({
      kind: 'platform_default_event_background',
      objectKey: 'platform/default-event-background/object_1'
    }))
    const failedOutcome = await processManagedMediaCleanupQueueMessage(failedMessage, {
      cloudflareEnv: {
        EVENT_IMAGES: eventImages
      },
      runtimeConfig: {
        mediaCleanup: {
          retryDelaySeconds: 45
        }
      }
    })

    expect(failedOutcome).toMatchObject({ action: 'retry', reason: 'object_delete_failed' })
    expect(failedMessage.ack).not.toHaveBeenCalled()
    expect(failedMessage.retry).toHaveBeenCalledWith({ delaySeconds: 45 })
  })
})
