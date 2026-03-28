import { ensureAccountPageAccess } from '~/utils/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  return await ensureAccountPageAccess(
    to,
    actor => actor.isPlatformAdmin || actor.hackathonRoles.some(role => role.role === 'hackathon_admin'),
    'Hackathon admin access required.'
  )
})
