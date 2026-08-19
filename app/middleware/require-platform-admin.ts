import {
  ensureAccountPageAccess,
  shouldSkipServerAuthenticatedNavigation
} from '~/domains/accounts/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  if (shouldSkipServerAuthenticatedNavigation(to.path)) {
    return
  }

  const redirect = await ensureAccountPageAccess(
    to,
    actor => actor.isPlatformAdmin,
    'Platform admin access required.'
  )

  if (redirect) {
    return navigateTo(
      redirect.redirectTo,
      redirect.external ? { external: true } : undefined
    )
  }
})
