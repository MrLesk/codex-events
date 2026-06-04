import type { H3Event } from 'h3'

import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../../server/http/api-error'
import {
  assertValidEventImagePart,
  getEventImagesBucket,
  eventImageMaxBytes,
  eventImageObjectKey,
  platformDefaultEventBackgroundImageObjectKey,
  putEventImageObject,
  publicEventImagePath,
  publicPlatformDefaultEventBackgroundImagePath
} from '../../../../../server/domains/events/images'

function createBucketStub() {
  return {
    async get() {
      return null
    },
    async put() {
      return undefined
    },
    async delete() {
      return undefined
    }
  }
}

const jpegSignatureBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xdb])
const pngSignatureBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function createOversizedPngBytes(size: number) {
  const data = new Uint8Array(size)
  data.set(pngSignatureBytes)
  return data
}

describe('event image utilities', () => {
  test('builds canonical event image object keys', () => {
    expect(eventImageObjectKey('event_1', 'background')).toBe('events/event_1/background-image')
    expect(eventImageObjectKey('event_1', 'banner')).toBe('events/event_1/banner-image')
    expect(platformDefaultEventBackgroundImageObjectKey()).toBe('platform/default-event-background-image')
  })

  test('builds canonical public event image paths', () => {
    expect(publicEventImagePath('codex-spring', 'background')).toBe('/api/public/events/codex-spring/images/background')
    expect(publicEventImagePath('codex-spring', 'banner')).toBe('/api/public/events/codex-spring/images/banner')
    expect(publicPlatformDefaultEventBackgroundImagePath()).toBe('/api/public/platform/event-default-background-image')
  })

  test('accepts supported image signatures and derives the content type from bytes', () => {
    const pngResult = assertValidEventImagePart({
      type: 'image/gif',
      data: pngSignatureBytes
    })

    expect(pngResult.contentType).toBe('image/png')
    expect(pngResult.data.byteLength).toBe(pngSignatureBytes.byteLength)

    const jpegResult = assertValidEventImagePart({
      type: 'image/png',
      data: jpegSignatureBytes
    })

    expect(jpegResult.contentType).toBe('image/jpeg')
    expect(jpegResult.data.byteLength).toBe(jpegSignatureBytes.byteLength)
  })

  test('rejects unsupported file bytes even when the declared type is allowed', () => {
    expect(() => assertValidEventImagePart({
      type: 'image/png',
      data: new Uint8Array([1, 2, 3, 4])
    })).toThrowError(/JPEG or PNG/)
  })

  test('rejects files larger than 5MB', () => {
    expect(() => assertValidEventImagePart({
      type: 'image/png',
      data: createOversizedPngBytes(eventImageMaxBytes + 1)
    })).toThrowError(/5MB or smaller/)
  })

  test('requires a configured event-images binding', () => {
    const event = {
      context: {
        cloudflare: {
          env: {}
        },
        runtimeConfig: {
          eventImages: {
            binding: 'EVENT_IMAGES'
          }
        }
      }
    } as H3Event

    expect(() => getEventImagesBucket(event)).toThrowError(ApiError)
    expect(() => getEventImagesBucket(event)).toThrowError(/EVENT_IMAGES/)

    try {
      getEventImagesBucket(event)
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      const apiError = error as ApiError
      expect(apiError.details).toMatchObject({
        binding: 'EVENT_IMAGES',
        availableR2Bindings: []
      })
    }
  })

  test('falls back to the default EVENT_IMAGES binding when configured binding is unavailable', () => {
    const bucket = createBucketStub()
    const event = {
      context: {
        cloudflare: {
          env: {
            EVENT_IMAGES: bucket
          }
        },
        runtimeConfig: {
          eventImages: {
            binding: 'CUSTOM_EVENT_IMAGES'
          }
        }
      }
    } as H3Event

    expect(getEventImagesBucket(event)).toBe(bucket)
  })

  test('uses middleware-injected eventImagesBucket when request env is missing', () => {
    const bucket = createBucketStub()
    const event = {
      context: {
        cloudflare: {
          env: {}
        },
        runtimeConfig: {
          eventImages: {
            binding: 'EVENT_IMAGES'
          }
        },
        eventImagesBucket: bucket
      }
    } as H3Event

    expect(getEventImagesBucket(event)).toBe(bucket)
  })

  test('normalizes Node Buffer payloads before writing to R2', async () => {
    const putCalls: unknown[] = []
    const bucket = {
      async get() {
        return null
      },
      async put(_key: string, value: unknown) {
        putCalls.push(value)
        return undefined
      },
      async delete() {
        return undefined
      }
    }
    const event = {
      context: {
        cloudflare: {
          env: {
            EVENT_IMAGES: bucket
          }
        },
        runtimeConfig: {
          eventImages: {
            binding: 'EVENT_IMAGES'
          }
        }
      }
    } as H3Event

    await putEventImageObject(event, 'event_1', 'background', {
      contentType: 'image/png',
      data: Buffer.from(pngSignatureBytes) as unknown as Uint8Array
    })

    expect(putCalls).toHaveLength(1)
    expect(Buffer.isBuffer(putCalls[0])).toBe(false)
    expect(putCalls[0]).toBeInstanceOf(Uint8Array)
  })
})
