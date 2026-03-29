import { ensureHackathonRoleForSlugRoute } from '~/utils/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  const redirect = await ensureHackathonRoleForSlugRoute(to, ['hackathon_admin', 'judge'])

  if (redirect) {
    return navigateTo(
      redirect.redirectTo,
      redirect.external ? { external: true } : undefined
    )
  }
})
