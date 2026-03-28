import type { LocationQueryValue } from 'vue-router'

import { normalizeTabQueryValue } from './tab-query'

function isAccountHackathonDetailPath(path: string) {
  return path.startsWith('/account/hackathons/')
}

export function isShellNavigationLinkActive(
  currentPath: string,
  currentTab: LocationQueryValue | LocationQueryValue[] | null | undefined,
  targetPath: string
) {
  if (targetPath === '/') {
    return currentPath === '/'
  }

  const normalizedTab = normalizeTabQueryValue(currentTab)

  if (targetPath === '/account') {
    if (currentPath === '/account') {
      return true
    }

    if (!isAccountHackathonDetailPath(currentPath)) {
      return false
    }

    return normalizedTab !== 'judging' && normalizedTab !== 'operations' && normalizedTab !== 'settings'
  }

  if (targetPath === '/account/judging') {
    return currentPath === '/account/judging'
      || (isAccountHackathonDetailPath(currentPath) && normalizedTab === 'judging')
  }

  if (targetPath === '/account/admin') {
    return currentPath === '/account/admin'
      || (isAccountHackathonDetailPath(currentPath) && (normalizedTab === 'operations' || normalizedTab === 'settings'))
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
}
