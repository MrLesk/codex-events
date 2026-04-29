import { ensureHackathonRoleForSlugRoute } from '~/domains/accounts/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  const redirect = await ensureHackathonRoleForSlugRoute(to, ['judge'])

  if (redirect) {
    return navigateTo(
      redirect.redirectTo,
      redirect.external ? { external: true } : undefined
    )
  }
})
