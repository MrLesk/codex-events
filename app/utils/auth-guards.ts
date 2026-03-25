import type { RouteLocationNormalized } from 'vue-router'

import { buildAuthLoginHref, resolveActorAppRedirect } from './auth-navigation'

export const requireAuthNavigationGuard = defineNuxtRouteMiddleware(async (to: RouteLocationNormalized) => {
  if (useUser().value) {
    const sessionFetch = import.meta.server ? useRequestFetch() : $fetch
    const response = await sessionFetch<{
      data: {
        actor: {
          kind: 'authenticated_identity' | 'platform_user'
          onboardingState: 'terms_pending' | 'profile_pending' | 'completed'
        }
      }
    }>('/api/session')
    const redirectTarget = resolveActorAppRedirect(response.data.actor, to.fullPath)

    if (redirectTarget !== to.fullPath) {
      return navigateTo(redirectTarget)
    }

    return
  }

  return navigateTo(buildAuthLoginHref(to.fullPath), { external: true })
})
