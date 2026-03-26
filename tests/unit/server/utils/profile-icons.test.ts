import type { H3Event } from 'h3'

import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertValidProfileIconPart,
  getProfileIconsBucket,
  profileIconMaxBytes,
  profileIconObjectKey
} from '../../../../server/utils/profile-icons'

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
  })
})
