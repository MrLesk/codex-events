import {
  ensureAccountPageAccess,
  shouldSkipServerAuthenticatedNavigation
} from '~/domains/accounts/navigation-guards'
import { canCreateEvent } from '~/domains/events/access'

export default defineNuxtRouteMiddleware(async (to) => {
  if (shouldSkipServerAuthenticatedNavigation(to.path)) {
    return
  }

  const redirect = await ensureAccountPageAccess(
    to,
    actor => canCreateEvent(actor),
    'Event creator access required.'
  )

  if (redirect) {
    return navigateTo(
      redirect.redirectTo,
      redirect.external ? { external: true } : undefined
    )
  }
})
