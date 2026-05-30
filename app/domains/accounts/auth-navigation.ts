import {
  accountDashboardHref,
  accountRegisterHref,
  buildAccountRegisterHref,
  normalizeAuthReturnTo
} from '#shared/domains/accounts/auth-navigation'

interface RedirectAwareActor {
  kind: 'anonymous' | 'authenticated_identity' | 'platform_user'
  hasAcceptedCurrentPlatformDocuments?: boolean
  isPlatformAdmin?: boolean
}

function readRegisterReturnTo(registerHref: string) {
  const queryIndex = registerHref.indexOf('?')

  if (queryIndex === -1) {
    return accountDashboardHref
  }

  const params = new URLSearchParams(registerHref.slice(queryIndex + 1))
  return normalizeAuthReturnTo(params.get('returnTo'), accountDashboardHref)
}

function isPlatformLegalSettingsRoute(returnTo: string) {
  const hashIndex = returnTo.indexOf('#')
  const pathAndQuery = hashIndex === -1 ? returnTo : returnTo.slice(0, hashIndex)
  const queryIndex = pathAndQuery.indexOf('?')
  const pathname = queryIndex === -1 ? pathAndQuery : pathAndQuery.slice(0, queryIndex)

  if (pathname !== '/account/platform-settings') {
    return false
  }

  const params = new URLSearchParams(queryIndex === -1 ? '' : pathAndQuery.slice(queryIndex + 1))
  const tab = params.get('tab')?.trim()

  return !tab || tab === 'legal'
}

export function resolveActorAppRedirect(actor: RedirectAwareActor, returnTo: string | null | undefined) {
  const normalizedReturnTo = normalizeAuthReturnTo(returnTo, accountDashboardHref)
  const isRegisterRoute = normalizedReturnTo.startsWith(accountRegisterHref)

  if (
    actor.kind === 'platform_user'
    && !actor.hasAcceptedCurrentPlatformDocuments
    && actor.isPlatformAdmin
    && isPlatformLegalSettingsRoute(normalizedReturnTo)
  ) {
    return normalizedReturnTo
  }

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
