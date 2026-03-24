import { describe, expect, test } from 'vitest'

import {
  authLogoutHref,
  buildAuthAccessHref,
  buildAuthLoginHref,
  normalizeAuthReturnTo
} from '../../../../app/utils/auth-navigation'

describe('auth navigation helpers', () => {
  test('builds a login redirect with an encoded return target', () => {
    expect(buildAuthLoginHref('/dashboard?tab=judge')).toBe('/auth/login?returnTo=%2Fdashboard%3Ftab%3Djudge')
  })

  test('builds an app-owned auth entry route with mode and return target', () => {
    expect(buildAuthAccessHref('/hackathons/fixture', 'register')).toBe('/auth/access?returnTo=%2Fhackathons%2Ffixture&mode=register')
    expect(buildAuthAccessHref('/dashboard')).toBe('/auth/access?returnTo=%2Fdashboard')
  })

  test('falls back to the homepage when the return target is empty', () => {
    expect(buildAuthLoginHref('')).toBe('/auth/login?returnTo=%2F')
    expect(buildAuthLoginHref(undefined)).toBe('/auth/login?returnTo=%2F')
    expect(authLogoutHref).toBe('/auth/logout')
  })

  test('normalizes unsafe return targets back to the fallback route', () => {
    expect(normalizeAuthReturnTo('https://example.com')).toBe('/')
    expect(normalizeAuthReturnTo('//example.com')).toBe('/')
    expect(normalizeAuthReturnTo('not-a-path', '/dashboard')).toBe('/dashboard')
  })
})
