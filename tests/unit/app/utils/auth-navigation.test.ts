import { describe, expect, test } from 'vitest'

import {
  accountDashboardHref,
  accountSettingsHref,
  authLogoutHref,
  buildAccountSettingsHref,
  buildAuthLoginHref,
  normalizeAuthReturnTo,
  resolveActorAppRedirect
} from '../../../../app/utils/auth-navigation'

describe('auth navigation helpers', () => {
  test('builds a login redirect with an encoded return target', () => {
    expect(buildAuthLoginHref('/account/dashboard?tab=judge')).toBe('/auth/login?returnTo=%2Faccount%2Fdashboard%3Ftab%3Djudge')
  })

  test('builds account settings route with return target', () => {
    expect(buildAccountSettingsHref('/hackathons/fixture')).toBe('/account/settings?returnTo=%2Fhackathons%2Ffixture')
    expect(buildAccountSettingsHref('/account/dashboard')).toBe('/account/settings?returnTo=%2Faccount%2Fdashboard')
  })

  test('falls back to the account dashboard when the return target is empty', () => {
    expect(buildAuthLoginHref('')).toBe('/auth/login?returnTo=%2Faccount%2Fdashboard')
    expect(buildAuthLoginHref(undefined)).toBe('/auth/login?returnTo=%2Faccount%2Fdashboard')
    expect(authLogoutHref).toBe('/auth/logout')
  })

  test('normalizes unsafe return targets back to the fallback route', () => {
    expect(normalizeAuthReturnTo('https://example.com')).toBe('/')
    expect(normalizeAuthReturnTo('//example.com')).toBe('/')
    expect(normalizeAuthReturnTo('not-a-path', '/account/dashboard')).toBe('/account/dashboard')
  })

  test('routes authenticated identities to account settings, but preserves platform user return targets', () => {
    expect(resolveActorAppRedirect({
      kind: 'authenticated_identity'
    }, '/account/judging')).toBe(accountSettingsHref)

    expect(resolveActorAppRedirect({
      kind: 'platform_user'
    }, '/account/dashboard')).toBe(accountDashboardHref)

    expect(resolveActorAppRedirect({
      kind: 'platform_user'
    }, '/account/dashboard')).toBe(accountDashboardHref)
  })
})
