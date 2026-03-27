import { accountDashboardHref } from '~/utils/auth-navigation'
import { ensureAuthenticatedActor } from '~/utils/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  const resolvedSession = await ensureAuthenticatedActor(to)

  if ('redirect' in resolvedSession) {
    return resolvedSession.redirect
  }

  const actor = resolvedSession.actor

  if (actor.kind === 'platform_user' && actor.isPlatformAdmin) {
    return
  }

  return navigateTo(accountDashboardHref)
})
