import type { RouteLocationNormalized } from 'vue-router'

import { buildAuthAccessHref } from './auth-navigation'

export function requireAuthNavigationGuard(to: RouteLocationNormalized) {
  if (useUser().value) {
    return
  }

  return navigateTo(buildAuthAccessHref(to.fullPath, 'signin'))
}
