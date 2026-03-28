export const authLogoutHref = '/auth/logout'
export const accountDashboardHref = '/account'
export const accountSettingsHref = '/account/settings'

interface RedirectAwareActor {
  kind: 'anonymous' | 'authenticated_identity' | 'platform_user'
}

export function normalizeAuthReturnTo(returnTo: string | null | undefined, fallback = '/') {
  const normalizedReturnTo = returnTo?.trim() || fallback

  if (!normalizedReturnTo.startsWith('/') || normalizedReturnTo.startsWith('//')) {
    return fallback
  }

  return normalizedReturnTo
}

export function buildAuthLoginHref(returnTo: string | null | undefined) {
  const normalizedReturnTo = normalizeAuthReturnTo(returnTo, accountDashboardHref)
  const loginReturnTo = normalizedReturnTo === '/' ? accountDashboardHref : normalizedReturnTo

  return `/auth/login?returnTo=${encodeURIComponent(loginReturnTo)}`
}

export function buildAccountSettingsHref(returnTo: string | null | undefined) {
  return `${accountSettingsHref}?returnTo=${encodeURIComponent(normalizeAuthReturnTo(returnTo, accountDashboardHref))}`
}

export function resolveActorAppRedirect(actor: RedirectAwareActor, returnTo: string | null | undefined) {
  const normalizedReturnTo = normalizeAuthReturnTo(returnTo, accountDashboardHref)

  if (actor.kind === 'authenticated_identity') {
    return buildAccountSettingsHref(normalizedReturnTo)
  }

  return normalizedReturnTo
}
