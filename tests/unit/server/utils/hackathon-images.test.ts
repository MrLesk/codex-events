import type { H3Event } from 'h3'

import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/http/api-error'
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

const jpegSignatureBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xdb])
const pngSignatureBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function createOversizedPngBytes(size: number) {
  const data = new Uint8Array(size)
  data.set(pngSignatureBytes)
  return data
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

  test('accepts supported image signatures and derives the content type from bytes', () => {
    const pngResult = assertValidHackathonImagePart({
      type: 'image/gif',
      data: pngSignatureBytes
    })

    expect(pngResult.contentType).toBe('image/png')
    expect(pngResult.data.byteLength).toBe(pngSignatureBytes.byteLength)

    const jpegResult = assertValidHackathonImagePart({
      type: 'image/png',
      data: jpegSignatureBytes
    })

    expect(jpegResult.contentType).toBe('image/jpeg')
    expect(jpegResult.data.byteLength).toBe(jpegSignatureBytes.byteLength)
  })

  test('rejects unsupported file bytes even when the declared type is allowed', () => {
    expect(() => assertValidHackathonImagePart({
      type: 'image/png',
      data: new Uint8Array([1, 2, 3, 4])
    })).toThrowError(/JPEG or PNG/)
  })

  test('rejects files larger than 5MB', () => {
    expect(() => assertValidHackathonImagePart({
      type: 'image/png',
      data: createOversizedPngBytes(hackathonImageMaxBytes + 1)
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
      data: Buffer.from(pngSignatureBytes) as unknown as Uint8Array
    })

    expect(putCalls).toHaveLength(1)
    expect(Buffer.isBuffer(putCalls[0])).toBe(false)
    expect(putCalls[0]).toBeInstanceOf(Uint8Array)
  })
})
