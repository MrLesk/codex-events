import { ensureAuthenticatedActor } from '~/utils/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  const resolvedSession = await ensureAuthenticatedActor(to)

  if ('redirect' in resolvedSession) {
    return resolvedSession.redirect
  }
})
