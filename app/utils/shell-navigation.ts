import type { LocationQueryValue } from 'vue-router'

import { normalizeTabQueryValue } from './tab-query'

export interface ShellNavigationMatchOptions {
  accountHackathonNavigationMode?: 'participant' | 'admin'
}

function isAccountHackathonDetailPath(path: string) {
  return path.startsWith('/account/hackathons/')
}

export function isShellNavigationLinkActive(
  currentPath: string,
  currentTab: LocationQueryValue | LocationQueryValue[] | null | undefined,
  targetPath: string,
  options: ShellNavigationMatchOptions = {}
) {
  if (targetPath === '/') {
    return currentPath === '/'
  }

  const normalizedTab = normalizeTabQueryValue(currentTab)
  const accountHackathonUsesAdminNavigation = isAccountHackathonDetailPath(currentPath)
    && options.accountHackathonNavigationMode === 'admin'

  if (targetPath === '/account') {
    if (currentPath === '/account') {
      return true
    }

    if (!isAccountHackathonDetailPath(currentPath)) {
      return false
    }

    if (accountHackathonUsesAdminNavigation) {
      return false
    }

    return normalizedTab !== 'judging' && normalizedTab !== 'operations' && normalizedTab !== 'settings'
  }

  if (targetPath === '/account/judging') {
    return currentPath === '/account/judging'
      || (isAccountHackathonDetailPath(currentPath)
        && !accountHackathonUsesAdminNavigation
        && normalizedTab === 'judging')
  }

  if (targetPath === '/account/admin') {
    return currentPath === '/account/admin'
      || (isAccountHackathonDetailPath(currentPath)
        && (accountHackathonUsesAdminNavigation || normalizedTab === 'operations' || normalizedTab === 'settings'))
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
}
