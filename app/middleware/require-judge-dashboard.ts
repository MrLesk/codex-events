import { ensureAccountPageAccess } from '~/utils/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  const redirect = await ensureAccountPageAccess(
    to,
    actor => actor.hackathonRoles.some(role => role.role === 'judge' || (role.role === 'hackathon_admin' && role.isInJudgePool)),
    'Judge access required.'
  )

  if (redirect) {
    return navigateTo(
      redirect.redirectTo,
      redirect.external ? { external: true } : undefined
    )
  }
})
