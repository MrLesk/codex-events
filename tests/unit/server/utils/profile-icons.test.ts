import type { H3Event } from 'h3'

import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertValidProfileIconPart,
  getProfileIconsBucket,
  putProfileIconObject,
  profileIconMaxBytes,
  profileIconObjectKey
} from '../../../../server/utils/profile-icons'

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

describe('profile icon utilities', () => {
  test('builds the canonical profile icon object key', () => {
    expect(profileIconObjectKey('user_1')).toBe('users/user_1/profile-icon')
  })

  test('accepts supported image signatures and derives the content type from bytes', () => {
    const pngResult = assertValidProfileIconPart({
      type: 'image/gif',
      data: pngSignatureBytes
    })

    expect(pngResult.contentType).toBe('image/png')
    expect(pngResult.data.byteLength).toBe(pngSignatureBytes.byteLength)

    const jpegResult = assertValidProfileIconPart({
      type: 'image/png',
      data: jpegSignatureBytes
    })

    expect(jpegResult.contentType).toBe('image/jpeg')
    expect(jpegResult.data.byteLength).toBe(jpegSignatureBytes.byteLength)
  })

  test('rejects unsupported file bytes even when the declared type is allowed', () => {
    expect(() => assertValidProfileIconPart({
      type: 'image/png',
      data: new Uint8Array([1, 2, 3, 4])
    })).toThrowError(/JPEG or PNG/)
  })

  test('rejects files larger than 1MB', () => {
    expect(() => assertValidProfileIconPart({
      type: 'image/png',
      data: createOversizedPngBytes(profileIconMaxBytes + 1)
    })).toThrowError(/1MB or smaller/)
  })

  test('requires a configured profile-icons binding', () => {
    const event = {
      context: {
        cloudflare: {
          env: {}
        },
        runtimeConfig: {
          profileIcons: {
            binding: 'PROFILE_ICONS'
          }
        }
      }
    } as H3Event

    expect(() => getProfileIconsBucket(event)).toThrowError(ApiError)
    expect(() => getProfileIconsBucket(event)).toThrowError(/PROFILE_ICONS/)

    try {
      getProfileIconsBucket(event)
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      const apiError = error as ApiError
      expect(apiError.details).toMatchObject({
        binding: 'PROFILE_ICONS',
        availableR2Bindings: []
      })
    }
  })

  test('falls back to the default PROFILE_ICONS binding when configured binding is unavailable', () => {
    const bucket = createBucketStub()
    const event = {
      context: {
        cloudflare: {
          env: {
            PROFILE_ICONS: bucket
          }
        },
        runtimeConfig: {
          profileIcons: {
            binding: 'CUSTOM_PROFILE_ICONS'
          }
        }
      }
    } as H3Event

    expect(getProfileIconsBucket(event)).toBe(bucket)
  })

  test('uses middleware-injected profileIconsBucket when request env is missing', () => {
    const bucket = createBucketStub()
    const event = {
      context: {
        cloudflare: {
          env: {}
        },
        runtimeConfig: {
          profileIcons: {
            binding: 'PROFILE_ICONS'
          }
        },
        profileIconsBucket: bucket
      }
    } as H3Event

    expect(getProfileIconsBucket(event)).toBe(bucket)
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
            PROFILE_ICONS: bucket
          }
        },
        runtimeConfig: {
          profileIcons: {
            binding: 'PROFILE_ICONS'
          }
        }
      }
    } as H3Event

    await putProfileIconObject(event, 'user_1', {
      contentType: 'image/png',
      data: Buffer.from(pngSignatureBytes) as unknown as Uint8Array
    })

    expect(putCalls).toHaveLength(1)
    expect(Buffer.isBuffer(putCalls[0])).toBe(false)
    expect(putCalls[0]).toBeInstanceOf(Uint8Array)
  })
})
