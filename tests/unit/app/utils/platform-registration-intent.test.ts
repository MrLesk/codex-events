import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  buildPlatformRegistrationDisplayName,
  clearPlatformRegistrationIntent,
  readPlatformRegistrationIntent,
  writePlatformRegistrationIntent
} from '../../../../app/utils/platform-registration-intent'

describe('platform registration intent helpers', () => {
  let originalWindow: typeof globalThis.window | undefined

  beforeEach(() => {
    originalWindow = globalThis.window

    const storage = new Map<string, string>()

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          clear() {
            storage.clear()
          },
          getItem(key: string) {
            return storage.has(key) ? storage.get(key)! : null
          },
          removeItem(key: string) {
            storage.delete(key)
          },
          setItem(key: string, value: string) {
            storage.set(key, value)
          }
        }
      }
    })

    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    window.localStorage.clear()

    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, 'window')
      return
    }

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow
    })
  })

  test('stores and reads a registration intent using a normalized return target', () => {
    writePlatformRegistrationIntent({
      privacyPolicyDocumentId: 'privacy_v1',
      platformTermsDocumentId: 'terms_v1',
      returnTo: 'https://example.com',
      createdAt: '2026-03-24T20:00:00.000Z'
    })

    expect(readPlatformRegistrationIntent(Date.parse('2026-03-24T20:30:00.000Z'))).toEqual({
      privacyPolicyDocumentId: 'privacy_v1',
      platformTermsDocumentId: 'terms_v1',
      returnTo: '/',
      createdAt: '2026-03-24T20:00:00.000Z'
    })
  })

  test('expires stale registration intent records', () => {
    writePlatformRegistrationIntent({
      privacyPolicyDocumentId: 'privacy_v1',
      platformTermsDocumentId: 'terms_v1',
      returnTo: '/dashboard',
      createdAt: '2026-03-24T12:00:00.000Z'
    })

    expect(readPlatformRegistrationIntent(Date.parse('2026-03-24T16:30:00.000Z'))).toBeNull()
  })

  test('clears persisted registration intent', () => {
    writePlatformRegistrationIntent({
      privacyPolicyDocumentId: 'privacy_v1',
      platformTermsDocumentId: 'terms_v1',
      returnTo: '/dashboard',
      createdAt: '2026-03-24T20:00:00.000Z'
    })

    clearPlatformRegistrationIntent()

    expect(readPlatformRegistrationIntent()).toBeNull()
  })

  test('derives a fallback display name from session identity fields', () => {
    expect(buildPlatformRegistrationDisplayName({
      name: 'Session User',
      nickname: 'session-user',
      email: 'session@example.com'
    })).toBe('Session User')

    expect(buildPlatformRegistrationDisplayName({
      name: '  ',
      nickname: 'session-user',
      email: 'session@example.com'
    })).toBe('session-user')

    expect(buildPlatformRegistrationDisplayName({
      name: '  ',
      nickname: ' ',
      email: 'session@example.com'
    })).toBe('session@example.com')
  })
})
