import { isHackathonRoleStaffEnabled } from '~/domains/hackathons/access'
import { ensureAccountPageAccess } from '~/domains/accounts/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  const redirect = await ensureAccountPageAccess(
    to,
    actor => actor.hackathonRoles.some(role => isHackathonRoleStaffEnabled(role)),
    'Staff access required.'
  )

  if (redirect) {
    return navigateTo(
      redirect.redirectTo,
      redirect.external ? { external: true } : undefined
    )
  }
})
