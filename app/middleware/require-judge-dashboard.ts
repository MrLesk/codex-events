import {
  ensureAccountPageAccess,
  shouldSkipServerAuthenticatedNavigation
} from '~/domains/accounts/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  if (shouldSkipServerAuthenticatedNavigation(to.path)) {
    return
  }

  const redirect = await ensureAccountPageAccess(
    to,
    actor => actor.eventRoles.some(role => role.role === 'judge' || (role.role === 'event_admin' && role.isInJudgePool)),
    'Judge access required.'
  )

  if (redirect) {
    return navigateTo(
      redirect.redirectTo,
      redirect.external ? { external: true } : undefined
    )
  }
})
