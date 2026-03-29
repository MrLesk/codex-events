import { ensureAuthenticatedActor } from '~/utils/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  const resolvedSession = await ensureAuthenticatedActor(to)

  if ('redirectTo' in resolvedSession) {
    return navigateTo(
      resolvedSession.redirectTo,
      resolvedSession.external ? { external: true } : undefined
    )
  }
})
