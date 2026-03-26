import { describe, expect, test } from 'vitest'

import {
  authLogoutHref,
  buildAccountOnboardingHref,
  buildAuthLoginHref,
  buildPlatformOnboardingStartHref,
  buildTermsOnboardingHref,
  normalizeAuthReturnTo,
  resolveActorAppRedirect
} from '../../../../app/utils/auth-navigation'

describe('auth navigation helpers', () => {
  test('builds a login redirect with an encoded return target', () => {
    expect(buildAuthLoginHref('/account/dashboard?tab=judge')).toBe('/auth/login?returnTo=%2Faccount%2Fdashboard%3Ftab%3Djudge')
  })

  test('builds onboarding entry routes with explicit post-auth steps', () => {
    expect(buildTermsOnboardingHref('/hackathons/fixture')).toBe('/account/settings?returnTo=%2Fhackathons%2Ffixture')
    expect(buildPlatformOnboardingStartHref('/account/dashboard')).toBe('/auth/login?returnTo=%2Faccount%2Fdashboard')
    expect(buildAccountOnboardingHref('/account/dashboard')).toBe('/account/settings?returnTo=%2Faccount%2Fdashboard')
  })

  test('falls back to the homepage when the return target is empty', () => {
    expect(buildAuthLoginHref('')).toBe('/auth/login?returnTo=%2F')
    expect(buildAuthLoginHref(undefined)).toBe('/auth/login?returnTo=%2F')
    expect(authLogoutHref).toBe('/auth/logout')
  })

  test('normalizes unsafe return targets back to the fallback route', () => {
    expect(normalizeAuthReturnTo('https://example.com')).toBe('/')
    expect(normalizeAuthReturnTo('//example.com')).toBe('/')
    expect(normalizeAuthReturnTo('not-a-path', '/account/dashboard')).toBe('/account/dashboard')
  })

  test('routes authenticated actors through the required onboarding step before the app workspace', () => {
    expect(resolveActorAppRedirect({
      kind: 'authenticated_identity',
      onboardingState: 'terms_pending'
    }, '/judging')).toBe('/account/settings')

    expect(resolveActorAppRedirect({
      kind: 'platform_user',
      onboardingState: 'profile_pending'
    }, '/account/dashboard')).toBe('/account/settings')

    expect(resolveActorAppRedirect({
      kind: 'platform_user',
      onboardingState: 'completed'
    }, '/account/dashboard')).toBe('/account/dashboard')
  })
})
