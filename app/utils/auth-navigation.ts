export const authLogoutHref = '/auth/logout'
export const accountDashboardHref = '/account/dashboard'
export const accountSettingsHref = '/account/settings'

export type ActorOnboardingState = 'terms_pending' | 'profile_pending' | 'completed'

interface RedirectAwareActor {
  kind: 'anonymous' | 'authenticated_identity' | 'platform_user'
  onboardingState: ActorOnboardingState | null
}

export function normalizeAuthReturnTo(returnTo: string | null | undefined, fallback = '/') {
  const normalizedReturnTo = returnTo?.trim() || fallback

  if (!normalizedReturnTo.startsWith('/') || normalizedReturnTo.startsWith('//')) {
    return fallback
  }

  return normalizedReturnTo
}

export function buildAuthLoginHref(returnTo: string | null | undefined) {
  return `/auth/login?returnTo=${encodeURIComponent(normalizeAuthReturnTo(returnTo))}`
}

export function buildTermsOnboardingHref(returnTo: string | null | undefined) {
  return `${accountSettingsHref}?returnTo=${encodeURIComponent(normalizeAuthReturnTo(returnTo, accountDashboardHref))}`
}

export function buildPlatformOnboardingStartHref(returnTo: string | null | undefined) {
  return buildAuthLoginHref(normalizeAuthReturnTo(returnTo, accountDashboardHref))
}

export function buildAccountOnboardingHref(returnTo: string | null | undefined) {
  return `${accountSettingsHref}?returnTo=${encodeURIComponent(normalizeAuthReturnTo(returnTo, accountDashboardHref))}`
}

export function resolveActorAppRedirect(actor: RedirectAwareActor, returnTo: string | null | undefined) {
  const normalizedReturnTo = normalizeAuthReturnTo(returnTo, accountDashboardHref)

  if (actor.kind === 'authenticated_identity') {
    return accountSettingsHref
  }

  if (actor.kind === 'platform_user' && actor.onboardingState === 'profile_pending' && normalizedReturnTo !== accountSettingsHref) {
    return accountSettingsHref
  }

  return normalizedReturnTo
}
