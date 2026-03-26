import { ensureHackathonRoleForSlugRoute } from '~/utils/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  return await ensureHackathonRoleForSlugRoute(to, ['hackathon_admin', 'judge'])
})
