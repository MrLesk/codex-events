import type { LocationQueryValue } from 'vue-router'
import type { SessionActor } from '~/domains/accounts/session-actor'

import { isEventRoleStaffEnabled } from '~/domains/events/access'
import { normalizeTabQueryValue } from '~/lib/query-values'

export interface ShellNavigationMatchOptions {
  accountEventNavigationMode?: 'participant' | 'staff' | 'admin'
}

const accountEventAdminTabs = ['participants', 'submissions', 'operations', 'settings'] as const

export function isAccountEventDetailPath(path: string) {
  return path.startsWith('/account/events/')
}

export function resolveShellAccountEventNavigationMode(options: {
  actor: SessionActor
  currentEventId?: string | null
  currentPath: string
}): 'participant' | 'staff' | 'admin' {
  if (!isAccountEventDetailPath(options.currentPath) || options.actor.kind !== 'platform_user') {
    return 'participant'
  }

  if (options.actor.isPlatformAdmin) {
    return 'admin'
  }

  const currentEventId = options.currentEventId?.trim() ?? ''

  if (!currentEventId) {
    return 'participant'
  }

  return options.actor.eventRoles.some(role =>
    role.role === 'event_admin' && role.eventId === currentEventId
  )
    ? 'admin'
    : options.actor.eventRoles.some(role =>
      role.eventId === currentEventId
      && isEventRoleStaffEnabled(role)
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
  const accountEventUsesAdminNavigation = isAccountEventDetailPath(currentPath)
    && options.accountEventNavigationMode === 'admin'
  const accountEventUsesStaffNavigation = isAccountEventDetailPath(currentPath)
    && options.accountEventNavigationMode === 'staff'
  const accountEventUsesParticipantNavigation = isAccountEventDetailPath(currentPath)
    && options.accountEventNavigationMode === 'participant'

  if (targetPath === '/account') {
    if (currentPath === '/account') {
      return true
    }

    if (!isAccountEventDetailPath(currentPath)) {
      return false
    }

    if (accountEventUsesAdminNavigation) {
      return false
    }

    if (accountEventUsesStaffNavigation) {
      return false
    }

    if (accountEventUsesParticipantNavigation) {
      return normalizedTab !== 'judging'
    }

    return normalizedTab !== 'judging' && !accountEventAdminTabs.includes(normalizedTab as (typeof accountEventAdminTabs)[number])
  }

  if (targetPath === '/account/staff') {
    return currentPath === '/account/staff'
      || (isAccountEventDetailPath(currentPath)
        && !accountEventUsesAdminNavigation
        && accountEventUsesStaffNavigation
        && normalizedTab !== 'judging')
  }

  if (targetPath === '/account/judging') {
    return currentPath === '/account/judging'
      || (isAccountEventDetailPath(currentPath)
        && !accountEventUsesAdminNavigation
        && normalizedTab === 'judging')
  }

  if (targetPath === '/account/admin') {
    return currentPath === '/account/admin'
      || currentPath === '/account/platform-admins'
      || currentPath === '/account/event-organizers'
      || currentPath === '/account/platform-legal'
      || (isAccountEventDetailPath(currentPath)
        && (
          accountEventUsesAdminNavigation
          || (
            !accountEventUsesParticipantNavigation
            && accountEventAdminTabs.includes(normalizedTab as (typeof accountEventAdminTabs)[number])
          )
        ))
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
}
