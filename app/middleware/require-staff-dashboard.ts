import { isHackathonRoleStaffEnabled } from '~/utils/admin-workspace'
import { ensureAccountPageAccess } from '~/utils/navigation-guards'

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
