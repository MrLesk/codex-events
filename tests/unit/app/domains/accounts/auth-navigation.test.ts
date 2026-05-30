import { describe, expect, test } from 'vitest'

import {
  accountDashboardHref,
  accountRegisterHref,
  authLogoutHref,
  buildAccountRegisterHref,
  buildAccountSettingsHref,
  buildAuthLoginHref,
  normalizeAuthReturnTo
} from '../../../../../shared/domains/accounts/auth-navigation'
import { resolveActorAppRedirect } from '../../../../../app/domains/accounts/auth-navigation'

describe('auth navigation helpers', () => {
  test('builds a login redirect with an encoded return target', () => {
    expect(buildAuthLoginHref('/account?tab=judging')).toBe('/auth/login?returnTo=%2Faccount%3Ftab%3Djudging')
  })

  test('builds account settings route with return target', () => {
    expect(buildAccountSettingsHref('/events/fixture')).toBe('/account/settings?returnTo=%2Fevents%2Ffixture')
    expect(buildAccountSettingsHref('/account')).toBe('/account/settings?returnTo=%2Faccount')
    expect(buildAccountRegisterHref('/events/fixture/register')).toBe('/account/register?returnTo=%2Fevents%2Ffixture%2Fregister')
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

  test('allows unconsented platform admins to reach the legal setup tab only', () => {
    expect(resolveActorAppRedirect({
      kind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: false,
      isPlatformAdmin: true
    }, '/account/platform-settings')).toBe('/account/platform-settings')

    expect(resolveActorAppRedirect({
      kind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: false,
      isPlatformAdmin: true
    }, '/account/platform-settings?tab=legal')).toBe('/account/platform-settings?tab=legal')

    expect(resolveActorAppRedirect({
      kind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: false,
      isPlatformAdmin: true
    }, '/account/platform-settings?tab=platform-admins'))
      .toBe('/account/register?returnTo=%2Faccount%2Fplatform-settings%3Ftab%3Dplatform-admins')

    expect(resolveActorAppRedirect({
      kind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: false,
      isPlatformAdmin: false
    }, '/account/platform-settings?tab=legal'))
      .toBe('/account/register?returnTo=%2Faccount%2Fplatform-settings%3Ftab%3Dlegal')
  })

  test('keeps incomplete actors on the account-registration route and redirects complete actors out of it', () => {
    expect(resolveActorAppRedirect({
      kind: 'authenticated_identity',
      hasAcceptedCurrentPlatformDocuments: false
    }, `${accountRegisterHref}?returnTo=%2Fevents%2Ffixture%2Fregister`))
      .toBe('/account/register?returnTo=%2Fevents%2Ffixture%2Fregister')

    expect(resolveActorAppRedirect({
      kind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true
    }, `${accountRegisterHref}?returnTo=%2Fevents%2Ffixture%2Fregister`))
      .toBe('/events/fixture/register')
  })
})
