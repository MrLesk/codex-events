import { ensureEventRoleForSlugRoute } from '~/domains/accounts/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  const redirect = await ensureEventRoleForSlugRoute(to, ['event_admin'])

  if (redirect) {
    return navigateTo(
      redirect.redirectTo,
      redirect.external ? { external: true } : undefined
    )
  }
})
