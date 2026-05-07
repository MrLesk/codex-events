import { ensureAccountPageAccess } from '~/domains/accounts/navigation-guards'
import { canCreateHackathon } from '~/domains/hackathons/access'

export default defineNuxtRouteMiddleware(async (to) => {
  const redirect = await ensureAccountPageAccess(
    to,
    actor => canCreateHackathon(actor),
    'Hackathon creator access required.'
  )

  if (redirect) {
    return navigateTo(
      redirect.redirectTo,
      redirect.external ? { external: true } : undefined
    )
  }
})
