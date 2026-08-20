import { readFileSync } from 'node:fs'

import { describe, expect, test, vi } from 'vitest'

import {
  buildManagedMediaCleanupQueueMessage,
  getManagedMediaCleanupQueueName,
  managedMediaCleanupDelaySeconds,
  parseManagedMediaCleanupMessage,
  processManagedMediaCleanupQueueMessage,
  sendManagedMediaCleanupMessage
} from '../../../../../server/domains/media/cleanup-queue'

function createMessage(body: unknown) {
  return {
    id: 'message_1',
    body,
    ack: vi.fn(),
    retry: vi.fn()
  }
}

describe('managed media cleanup queue', () => {
  test('keeps the local Nuxt queue name aligned with the Wrangler producer and consumer', () => {
    const localWranglerConfig = readFileSync(new URL('../../../../../wrangler.jsonc', import.meta.url), 'utf8')

    expect(getManagedMediaCleanupQueueName({})).toBe('codex-events-dev-media-cleanup')
    expect(localWranglerConfig).toMatch(/"binding": "MEDIA_CLEANUP_QUEUE",\s*"queue": "codex-events-dev-media-cleanup"/u)
    expect(localWranglerConfig).toMatch(/"queue": "codex-events-dev-media-cleanup",[\s\S]*?"dead_letter_queue": "codex-events-dev-media-cleanup-dlq"/u)
  })

  test('accepts immutable and migration-era stable object keys while rejecting unsafe keys', () => {
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

    for (const message of [
      { kind: 'event_image', objectKey: 'events/event_1/background-image' },
      { kind: 'event_image', objectKey: 'events/event_1/banner-image' },
      { kind: 'event_photo', objectKey: 'events/event_1/photos/photo_1' },
      { kind: 'platform_default_event_background', objectKey: 'platform/default-event-background-image' },
      { kind: 'profile_icon', objectKey: 'users/user_1/profile-icon' }
    ] as const) {
      expect(parseManagedMediaCleanupMessage({
        ...message,
        enqueuedAt: '2026-08-20T12:00:00.000Z'
      })).toMatchObject(message)
    }
  })

  test('sends validated cleanup without request fan-out or a second queue delay', async () => {
    const send = vi.fn(async () => undefined)
    await sendManagedMediaCleanupMessage({ send }, {
      kind: 'event_photo',
      objectKey: 'events/event_1/photos/photo_1/object_1'
    }, new Date('2026-08-20T12:00:00.000Z'))

    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'event_photo',
      objectKey: 'events/event_1/photos/photo_1/object_1'
    }), {
      contentType: 'json'
    })
    expect(managedMediaCleanupDelaySeconds).toBeGreaterThanOrEqual(30)
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
