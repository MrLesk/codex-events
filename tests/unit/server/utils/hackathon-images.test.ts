import type { H3Event } from 'h3'

import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertValidHackathonImagePart,
  getHackathonImagesBucket,
  hackathonImageMaxBytes,
  hackathonImageObjectKey,
  putHackathonImageObject,
  publicHackathonImagePath
} from '../../../../server/utils/hackathon-images'

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

describe('hackathon image utilities', () => {
  test('builds canonical hackathon image object keys', () => {
    expect(hackathonImageObjectKey('hackathon_1', 'background')).toBe('hackathons/hackathon_1/background-image')
    expect(hackathonImageObjectKey('hackathon_1', 'banner')).toBe('hackathons/hackathon_1/banner-image')
  })

  test('builds canonical public hackathon image paths', () => {
    expect(publicHackathonImagePath('codex-spring', 'background')).toBe('/api/public/hackathons/codex-spring/images/background')
    expect(publicHackathonImagePath('codex-spring', 'banner')).toBe('/api/public/hackathons/codex-spring/images/banner')
  })

  test('accepts valid image files under the size limit', () => {
    const result = assertValidHackathonImagePart({
      type: 'image/png',
      data: new Uint8Array([1, 2, 3])
    })

    expect(result.contentType).toBe('image/png')
    expect(result.data.byteLength).toBe(3)
  })

  test('rejects unsupported content types', () => {
    expect(() => assertValidHackathonImagePart({
      type: 'image/gif',
      data: new Uint8Array([1])
    })).toThrowError(ApiError)

    expect(() => assertValidHackathonImagePart({
      type: 'image/gif',
      data: new Uint8Array([1])
    })).toThrowError(/JPEG or PNG/)
  })

  test('rejects files larger than 5MB', () => {
    expect(() => assertValidHackathonImagePart({
      type: 'image/png',
      data: new Uint8Array(hackathonImageMaxBytes + 1)
    })).toThrowError(/5MB or smaller/)
  })

  test('requires a configured hackathon-images binding', () => {
    const event = {
      context: {
        cloudflare: {
          env: {}
        },
        runtimeConfig: {
          hackathonImages: {
            binding: 'HACKATHON_IMAGES'
          }
        }
      }
    } as H3Event

    expect(() => getHackathonImagesBucket(event)).toThrowError(ApiError)
    expect(() => getHackathonImagesBucket(event)).toThrowError(/HACKATHON_IMAGES/)

    try {
      getHackathonImagesBucket(event)
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      const apiError = error as ApiError
      expect(apiError.details).toMatchObject({
        binding: 'HACKATHON_IMAGES',
        availableR2Bindings: []
      })
    }
  })

  test('falls back to the default HACKATHON_IMAGES binding when configured binding is unavailable', () => {
    const bucket = createBucketStub()
    const event = {
      context: {
        cloudflare: {
          env: {
            HACKATHON_IMAGES: bucket
          }
        },
        runtimeConfig: {
          hackathonImages: {
            binding: 'CUSTOM_HACKATHON_IMAGES'
          }
        }
      }
    } as H3Event

    expect(getHackathonImagesBucket(event)).toBe(bucket)
  })

  test('uses middleware-injected hackathonImagesBucket when request env is missing', () => {
    const bucket = createBucketStub()
    const event = {
      context: {
        cloudflare: {
          env: {}
        },
        runtimeConfig: {
          hackathonImages: {
            binding: 'HACKATHON_IMAGES'
          }
        },
        hackathonImagesBucket: bucket
      }
    } as H3Event

    expect(getHackathonImagesBucket(event)).toBe(bucket)
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
            HACKATHON_IMAGES: bucket
          }
        },
        runtimeConfig: {
          hackathonImages: {
            binding: 'HACKATHON_IMAGES'
          }
        }
      }
    } as H3Event

    await putHackathonImageObject(event, 'hackathon_1', 'background', {
      contentType: 'image/png',
      data: Buffer.from([1, 2, 3]) as unknown as Uint8Array
    })

    expect(putCalls).toHaveLength(1)
    expect(Buffer.isBuffer(putCalls[0])).toBe(false)
    expect(putCalls[0]).toBeInstanceOf(Uint8Array)
  })
})
