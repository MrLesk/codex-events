import type { ResolvedSessionActor } from '~/composables/useAccountBootstrap'
import type { AccountEventPageResponse } from '~/domains/events/account-workspace-page'

import { accountDashboardHref, buildAuthLoginHref } from '#shared/domains/accounts/auth-navigation'
import {
  isEventRoleJudgingEnabled,
  isEventRoleStaffEnabled
} from '~/domains/events/access'
import {
  isAccountEventDetailPath,
  resolveShellAccountEventNavigationMode
} from '~/domains/accounts/shell-navigation'
import { buildAccountEventPageCacheKey } from '~/domains/events/account-workspace-page'

export type ShellActor = ResolvedSessionActor

export interface ShellNavigationOptions {
  currentAccountEventId?: MaybeRefOrGetter<string | null | undefined>
}

export interface ShellNavigationItem {
  id: string
  label: string
  description: string
  to: string
  icon: string
  badge?: string
  external?: boolean
}

export interface ShellNavigationGroup {
  label: string
  items: ShellNavigationItem[]
}

export function useShellAccountEventPageContext() {
  const route = useRoute()
  const nuxtApp = useNuxtApp()
  const authorizationCache = useAuthorizationCache()
  const slug = computed(() =>
    isAccountEventDetailPath(route.path) ? String(route.params.slug ?? '').trim() : ''
  )
  const entryPageKey = authorizationCache.protectedKey(computed(() =>
    buildAccountEventPageCacheKey(slug.value, 'entry')
  ))
  const currentAccountEventId = computed(() => {
    if (!slug.value) {
      return null
    }

    const entryPage = nuxtApp.payload.data[entryPageKey.value] as AccountEventPageResponse<unknown> | undefined
    return entryPage?.event.id ?? null
  })

  return {
    currentAccountEventId
  }
}

export function useShellNavigation(options: ShellNavigationOptions = {}) {
  const route = useRoute()

  const returnTo = computed(() => route.fullPath || accountDashboardHref)
  const authEntryHref = computed(() => buildAuthLoginHref(returnTo.value))
  const { actor, capabilities, status, refresh } = useSessionActor()
  const currentAccountEventId = computed(() => {
    const eventId = options.currentAccountEventId === undefined
      ? ''
      : String(toValue(options.currentAccountEventId) ?? '').trim()

    return eventId || null
  })

  const isResolvingActor = computed(() => status.value === 'pending')
  const hasPlatformAccount = computed(() => actor.value.kind === 'platform_user')
  const hasAdminAccess = computed(() => capabilities.value.canAccessAdminDashboard)
  const hasStaffAccess = computed(() => capabilities.value.canAccessStaffDashboard)
  const hasJudgeAccess = computed(() => capabilities.value.canAccessJudgeDashboard)
  const accountEventNavigationMode = computed(() =>
    resolveShellAccountEventNavigationMode({
      actor: actor.value,
      currentEventId: currentAccountEventId.value,
      currentPath: route.path
    })
  )

  const roleChips = computed(() => {
    if (actor.value.kind === 'anonymous') {
      return ['Public view']
    }

    if (actor.value.kind === 'authenticated_identity') {
      return ['Platform account required']
    }

    const chips = ['Platform user']

    if (actor.value.isPlatformAdmin) {
      chips.push('Platform admin')
    }

    if (actor.value.isEventOrganizer) {
      chips.push('Event organizer')
    }

    if (actor.value.eventRoles.some(role => role.role === 'event_admin')) {
      chips.push('Event admin')
    }

    if (actor.value.eventRoles.some(role => isEventRoleStaffEnabled(role))) {
      chips.push('Staff')
    }

    if (actor.value.eventRoles.some(role => isEventRoleJudgingEnabled(role))) {
      chips.push('Judge')
    }

    return chips
  })

  const sidebarGroups = computed<ShellNavigationGroup[]>(() => {
    if (actor.value.kind !== 'platform_user') {
      return []
    }

    const items: ShellNavigationItem[] = [{
      id: 'profile-settings',
      label: 'Profile settings',
      description: 'Profile details and platform lifecycle',
      to: '/account/settings',
      icon: 'i-lucide-id-card'
    }, {
      id: 'my-events',
      label: 'My events',
      description: 'Your active, upcoming, and past events',
      to: '/account',
      icon: 'i-lucide-flag'
    }]

    if (hasJudgeAccess.value) {
      items.push({
        id: 'judge-dashboard',
        label: 'Judge dashboard',
        description: 'Events where you are assigned as a judge',
        to: '/account/judging',
        icon: 'i-lucide-scale'
      })
    }

    if (hasStaffAccess.value) {
      items.push({
        id: 'staff-dashboard',
        label: 'Staff dashboard',
        description: 'Events where you support staff operations',
        to: '/account/staff',
        icon: 'i-lucide-users'
      })
    }

    if (hasAdminAccess.value) {
      items.push({
        id: 'admin-dashboard',
        label: 'Admin dashboard',
        description: actor.value.isPlatformAdmin
          ? 'Events you can manage'
          : 'Events you can manage and create',
        to: '/account/admin',
        icon: 'i-lucide-shield-check'
      })
    }

    if (actor.value.isPlatformAdmin) {
      items.push({
        id: 'platform-settings',
        label: 'Platform settings',
        description: 'Legal settings and platform-wide access',
        to: '/account/platform-settings',
        icon: 'i-lucide-settings'
      })
    }

    return [{
      label: '',
      items
    }]
  })

  return {
    actor,
    hasAdminAccess,
    hasJudgeAccess,
    hasStaffAccess,
    hasPlatformAccount,
    isResolvingActor,
    authEntryHref,
    accountEventNavigationMode,
    refresh,
    roleChips,
    sidebarGroups
  }
}
