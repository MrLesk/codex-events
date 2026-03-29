import { ensureAccountPageAccess } from '~/utils/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  const redirect = await ensureAccountPageAccess(
    to,
    actor => actor.isPlatformAdmin || actor.hackathonRoles.some(role => role.role === 'hackathon_admin'),
    'Hackathon admin access required.'
  )

  if (redirect) {
    return navigateTo(
      redirect.redirectTo,
      redirect.external ? { external: true } : undefined
    )
  }
})
