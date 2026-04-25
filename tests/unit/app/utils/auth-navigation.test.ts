import { describe, expect, test } from 'vitest'

import {
  accountDashboardHref,
  accountRegisterHref,
  authLogoutHref,
  buildAccountRegisterHref,
  buildAccountSettingsHref,
  buildAuthLoginHref,
  normalizeAuthReturnTo
} from '../../../../shared/auth-navigation'
import { resolveActorAppRedirect } from '../../../../app/utils/auth-navigation'

describe('auth navigation helpers', () => {
  test('builds a login redirect with an encoded return target', () => {
    expect(buildAuthLoginHref('/account?tab=judging')).toBe('/auth/login?returnTo=%2Faccount%3Ftab%3Djudging')
  })

  test('builds account settings route with return target', () => {
    expect(buildAccountSettingsHref('/hackathons/fixture')).toBe('/account/settings?returnTo=%2Fhackathons%2Ffixture')
    expect(buildAccountSettingsHref('/account')).toBe('/account/settings?returnTo=%2Faccount')
    expect(buildAccountRegisterHref('/hackathons/fixture/register')).toBe('/account/register?returnTo=%2Fhackathons%2Ffixture%2Fregister')
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

  test('routes incomplete actors to account registration and preserves complete platform user return targets', () => {
    expect(resolveActorAppRedirect({
      kind: 'authenticated_identity',
      hasAcceptedCurrentPlatformDocuments: false
    }, '/account/judging')).toBe('/account/register?returnTo=%2Faccount%2Fjudging')

    expect(resolveActorAppRedirect({
      kind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: false
    }, '/account')).toBe('/account/register?returnTo=%2Faccount')

    expect(resolveActorAppRedirect({
      kind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true
    }, '/account')).toBe(accountDashboardHref)
  })

  test('keeps incomplete actors on the account-registration route and redirects complete actors out of it', () => {
    expect(resolveActorAppRedirect({
      kind: 'authenticated_identity',
      hasAcceptedCurrentPlatformDocuments: false
    }, `${accountRegisterHref}?returnTo=%2Fhackathons%2Ffixture%2Fregister`))
      .toBe('/account/register?returnTo=%2Fhackathons%2Ffixture%2Fregister')

    expect(resolveActorAppRedirect({
      kind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true
    }, `${accountRegisterHref}?returnTo=%2Fhackathons%2Ffixture%2Fregister`))
      .toBe('/hackathons/fixture/register')
  })
})
