import { ensureAccountPageAccess } from '~/utils/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  return await ensureAccountPageAccess(
    to,
    actor => actor.hackathonRoles.some(role => role.role === 'judge'),
    'Judge access required.'
  )
})
