import type { RouteLocationNormalized } from 'vue-router'

import { buildAuthLoginHref } from './auth-navigation'

export function requireAuthNavigationGuard(to: RouteLocationNormalized) {
  if (useUser().value) {
    return
  }

  return navigateTo(buildAuthLoginHref(to.fullPath), { external: true })
}
