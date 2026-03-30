import type { LocationQueryValue } from 'vue-router'

import { normalizeTabQueryValue } from './tab-query'

export interface ShellNavigationMatchOptions {
  accountHackathonNavigationMode?: 'participant' | 'admin'
}

const accountHackathonAdminTabs = ['participants', 'submissions', 'operations', 'settings'] as const

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
  const accountHackathonUsesParticipantNavigation = isAccountHackathonDetailPath(currentPath)
    && options.accountHackathonNavigationMode === 'participant'

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

    if (accountHackathonUsesParticipantNavigation) {
      return normalizedTab !== 'judging'
    }

    return normalizedTab !== 'judging' && !accountHackathonAdminTabs.includes(normalizedTab as (typeof accountHackathonAdminTabs)[number])
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
        && (
          accountHackathonUsesAdminNavigation
          || (
            !accountHackathonUsesParticipantNavigation
            && accountHackathonAdminTabs.includes(normalizedTab as (typeof accountHackathonAdminTabs)[number])
          )
        ))
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
}
