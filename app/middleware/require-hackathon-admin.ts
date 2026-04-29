import { ensureHackathonRoleForSlugRoute } from '~/domains/accounts/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  const redirect = await ensureHackathonRoleForSlugRoute(to, ['hackathon_admin'])

  if (redirect) {
    return navigateTo(
      redirect.redirectTo,
      redirect.external ? { external: true } : undefined
    )
  }
})
