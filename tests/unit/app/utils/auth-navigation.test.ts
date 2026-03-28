import { describe, expect, test } from 'vitest'

import {
  accountDashboardHref,
  authLogoutHref,
  buildAccountSettingsHref,
  buildAuthLoginHref,
  normalizeAuthReturnTo,
  resolveActorAppRedirect
} from '../../../../app/utils/auth-navigation'

describe('auth navigation helpers', () => {
  test('builds a login redirect with an encoded return target', () => {
    expect(buildAuthLoginHref('/account?tab=judging')).toBe('/auth/login?returnTo=%2Faccount%3Ftab%3Djudging')
  })

  test('builds account settings route with return target', () => {
    expect(buildAccountSettingsHref('/hackathons/fixture')).toBe('/account/settings?returnTo=%2Fhackathons%2Ffixture')
    expect(buildAccountSettingsHref('/account')).toBe('/account/settings?returnTo=%2Faccount')
  })

  test('falls back to the account dashboard when the return target is empty', () => {
    expect(buildAuthLoginHref('')).toBe('/auth/login?returnTo=%2Faccount')
    expect(buildAuthLoginHref(undefined)).toBe('/auth/login?returnTo=%2Faccount')
    expect(authLogoutHref).toBe('/auth/logout')
  })

  test('normalizes unsafe return targets back to the fallback route', () => {
    expect(normalizeAuthReturnTo('https://example.com')).toBe('/')
    expect(normalizeAuthReturnTo('//example.com')).toBe('/')
    expect(normalizeAuthReturnTo('not-a-path', '/account')).toBe('/account')
  })

  test('routes authenticated identities to account settings, but preserves platform user return targets', () => {
    expect(resolveActorAppRedirect({
      kind: 'authenticated_identity'
    }, '/account/judging')).toBe('/account/settings?returnTo=%2Faccount%2Fjudging')

    expect(resolveActorAppRedirect({
      kind: 'platform_user'
    }, '/account')).toBe(accountDashboardHref)

    expect(resolveActorAppRedirect({
      kind: 'platform_user'
    }, '/account')).toBe(accountDashboardHref)
  })
})
