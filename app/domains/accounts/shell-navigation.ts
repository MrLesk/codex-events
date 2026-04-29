import type { LocationQueryValue } from 'vue-router'
import type { SessionActor } from '~/domains/accounts/session-actor'

import { isHackathonRoleStaffEnabled } from '~/domains/hackathons/access'
import { normalizeTabQueryValue } from '~/lib/query-values'

export interface ShellNavigationMatchOptions {
  accountHackathonNavigationMode?: 'participant' | 'staff' | 'admin'
}

const accountHackathonAdminTabs = ['participants', 'submissions', 'operations', 'settings'] as const

export function isAccountHackathonDetailPath(path: string) {
  return path.startsWith('/account/hackathons/')
}

export function resolveShellAccountHackathonNavigationMode(options: {
  actor: SessionActor
  currentHackathonId?: string | null
  currentPath: string
}): 'participant' | 'staff' | 'admin' {
  if (!isAccountHackathonDetailPath(options.currentPath) || options.actor.kind !== 'platform_user') {
    return 'participant'
  }

  if (options.actor.isPlatformAdmin) {
    return 'admin'
  }

  const currentHackathonId = options.currentHackathonId?.trim() ?? ''

  if (!currentHackathonId) {
    return 'participant'
  }

  return options.actor.hackathonRoles.some(role =>
    role.role === 'hackathon_admin' && role.hackathonId === currentHackathonId
  )
    ? 'admin'
    : options.actor.hackathonRoles.some(role =>
      role.hackathonId === currentHackathonId
      && isHackathonRoleStaffEnabled(role)
    )
      ? 'staff'
      : 'participant'
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
  const accountHackathonUsesStaffNavigation = isAccountHackathonDetailPath(currentPath)
    && options.accountHackathonNavigationMode === 'staff'
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

    if (accountHackathonUsesStaffNavigation) {
      return false
    }

    if (accountHackathonUsesParticipantNavigation) {
      return normalizedTab !== 'judging'
    }

    return normalizedTab !== 'judging' && !accountHackathonAdminTabs.includes(normalizedTab as (typeof accountHackathonAdminTabs)[number])
  }

  if (targetPath === '/account/staff') {
    return currentPath === '/account/staff'
      || (isAccountHackathonDetailPath(currentPath)
        && !accountHackathonUsesAdminNavigation
        && accountHackathonUsesStaffNavigation
        && normalizedTab !== 'judging')
  }

  if (targetPath === '/account/judging') {
    return currentPath === '/account/judging'
      || (isAccountHackathonDetailPath(currentPath)
        && !accountHackathonUsesAdminNavigation
        && normalizedTab === 'judging')
  }

  if (targetPath === '/account/admin') {
    return currentPath === '/account/admin'
      || currentPath === '/account/platform-admins'
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
