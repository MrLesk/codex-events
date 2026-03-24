import { describe, expect, test } from 'vitest'

import { authLogoutHref, buildAuthLoginHref } from '../../../../app/utils/auth-navigation'

describe('auth navigation helpers', () => {
  test('builds a login redirect with an encoded return target', () => {
    expect(buildAuthLoginHref('/dashboard?tab=judge')).toBe('/auth/login?returnTo=%2Fdashboard%3Ftab%3Djudge')
  })

  test('falls back to the homepage when the return target is empty', () => {
    expect(buildAuthLoginHref('')).toBe('/auth/login?returnTo=%2F')
    expect(buildAuthLoginHref(undefined)).toBe('/auth/login?returnTo=%2F')
    expect(authLogoutHref).toBe('/auth/logout')
  })
})
