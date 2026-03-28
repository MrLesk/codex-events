import { ensurePlatformAccountActor } from '~/utils/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  const resolvedSession = await ensurePlatformAccountActor(to)

  if ('redirect' in resolvedSession) {
    return resolvedSession.redirect
  }
})
