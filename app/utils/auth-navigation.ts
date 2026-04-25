import {
  accountDashboardHref,
  accountRegisterHref,
  buildAccountRegisterHref,
  normalizeAuthReturnTo
} from '#shared/auth-navigation'

interface RedirectAwareActor {
  kind: 'anonymous' | 'authenticated_identity' | 'platform_user'
  hasAcceptedCurrentPlatformDocuments?: boolean
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
