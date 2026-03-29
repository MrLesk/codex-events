import { ensurePlatformAccountActor } from '~/utils/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  const resolvedSession = await ensurePlatformAccountActor(to)

  if ('redirectTo' in resolvedSession) {
    return navigateTo(
      resolvedSession.redirectTo,
      resolvedSession.external ? { external: true } : undefined
    )
  }
})
