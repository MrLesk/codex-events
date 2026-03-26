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

describe('profile icon utilities', () => {
  test('builds the canonical profile icon object key', () => {
    expect(profileIconObjectKey('user_1')).toBe('users/user_1/profile-icon')
  })

  test('accepts valid image files under the size limit', () => {
    const result = assertValidProfileIconPart({
      type: 'image/png',
      data: new Uint8Array([1, 2, 3])
    })

    expect(result.contentType).toBe('image/png')
    expect(result.data.byteLength).toBe(3)
  })

  test('rejects unsupported content types', () => {
    expect(() => assertValidProfileIconPart({
      type: 'image/gif',
      data: new Uint8Array([1])
    })).toThrowError(ApiError)

    expect(() => assertValidProfileIconPart({
      type: 'image/gif',
      data: new Uint8Array([1])
    })).toThrowError(/JPEG or PNG/)
  })

  test('rejects files larger than 1MB', () => {
    expect(() => assertValidProfileIconPart({
      type: 'image/png',
      data: new Uint8Array(profileIconMaxBytes + 1)
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
      data: Buffer.from([1, 2, 3]) as unknown as Uint8Array
    })

    expect(putCalls).toHaveLength(1)
    expect(Buffer.isBuffer(putCalls[0])).toBe(false)
    expect(putCalls[0]).toBeInstanceOf(Uint8Array)
  })
})
