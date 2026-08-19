import {
  ensurePlatformAccountActor,
  shouldSkipServerAuthenticatedNavigation
} from '~/domains/accounts/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  if (shouldSkipServerAuthenticatedNavigation(to.path)) {
    return
  }

  const resolvedSession = await ensurePlatformAccountActor(to)

  if ('redirectTo' in resolvedSession) {
    return navigateTo(
      resolvedSession.redirectTo,
      resolvedSession.external ? { external: true } : undefined
    )
  }
})
