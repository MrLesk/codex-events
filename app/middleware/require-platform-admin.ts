import { ensureAccountPageAccess } from '~/utils/navigation-guards'

export default defineNuxtRouteMiddleware(async (to) => {
  const redirect = await ensureAccountPageAccess(
    to,
    actor => actor.isPlatformAdmin,
    'Platform admin access required.'
  )

  if (redirect) {
    return navigateTo(
      redirect.redirectTo,
      redirect.external ? { external: true } : undefined
    )
  }
})
