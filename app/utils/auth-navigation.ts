export const authLogoutHref = '/auth/logout'
export const accountDashboardHref = '/account'
export const accountRegisterHref = '/account/register'
export const accountSettingsHref = '/account/settings'

interface RedirectAwareActor {
  kind: 'anonymous' | 'authenticated_identity' | 'platform_user'
  hasAcceptedCurrentPlatformDocuments?: boolean
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

export function buildGitHubAuthLoginHref(returnTo: string | null | undefined) {
  const normalizedReturnTo = normalizeAuthReturnTo(returnTo, accountDashboardHref)
  const loginReturnTo = normalizedReturnTo === '/' ? accountDashboardHref : normalizedReturnTo

  return `/auth/login/github?returnTo=${encodeURIComponent(loginReturnTo)}`
}

export function buildAccountRegisterHref(returnTo: string | null | undefined) {
  return `${accountRegisterHref}?returnTo=${encodeURIComponent(normalizeAuthReturnTo(returnTo, accountDashboardHref))}`
}

export function buildAccountSettingsHref(returnTo: string | null | undefined) {
  return `${accountSettingsHref}?returnTo=${encodeURIComponent(normalizeAuthReturnTo(returnTo, accountDashboardHref))}`
}

function readRegisterReturnTo(registerHref: string) {
  const queryIndex = registerHref.indexOf('?')

  if (queryIndex === -1) {
    return accountDashboardHref
  }

  const params = new URLSearchParams(registerHref.slice(queryIndex + 1))
  return normalizeAuthReturnTo(params.get('returnTo'), accountDashboardHref)
}

export function resolveActorAppRedirect(actor: RedirectAwareActor, returnTo: string | null | undefined) {
  const normalizedReturnTo = normalizeAuthReturnTo(returnTo, accountDashboardHref)
  const isRegisterRoute = normalizedReturnTo.startsWith(accountRegisterHref)

  if (
    actor.kind === 'authenticated_identity'
    || (actor.kind === 'platform_user' && !actor.hasAcceptedCurrentPlatformDocuments)
  ) {
    return isRegisterRoute
      ? normalizedReturnTo
      : buildAccountRegisterHref(normalizedReturnTo)
  }

  if (isRegisterRoute) {
    return readRegisterReturnTo(normalizedReturnTo)
  }

  return normalizedReturnTo
}
