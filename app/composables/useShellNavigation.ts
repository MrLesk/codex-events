import type { ResolvedSessionActor } from '~/composables/useSessionActor'
import type { PublicApiDataResponse } from '~/domains/events/presentation'

import { accountDashboardHref, buildAuthLoginHref } from '#shared/domains/accounts/auth-navigation'
import {
  canAccessAdminDashboard,
  isEventRoleJudgingEnabled,
  isEventRoleStaffEnabled
} from '~/domains/events/access'
import {
  isAccountEventDetailPath,
  resolveShellAccountEventNavigationMode
} from '~/domains/accounts/shell-navigation'

interface ShellPrizeRedemptionsResponse {
  data: Array<{
    id: string
  }>
}

export type ShellActor = ResolvedSessionActor

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

export function useShellNavigation() {
  const route = useRoute()
  const user = useUser()

  const returnTo = computed(() => route.fullPath || accountDashboardHref)
  const authEntryHref = computed(() => buildAuthLoginHref(returnTo.value))
  const { actor, status, refresh } = useSessionActor()
  const currentAccountEventSlug = computed(() =>
    isAccountEventDetailPath(route.path) ? String(route.params.slug ?? '').trim() : ''
  )
  const {
    data: currentAccountEvent
  } = useApiData<{ id: string } | null>(
    () => `shell-account-event:${currentAccountEventSlug.value || 'none'}`,
    async ({ apiFetch, signal }) => {
      if (!currentAccountEventSlug.value) {
        return null
      }

      const response = await apiFetch<PublicApiDataResponse<{ id: string }>>(
        `/api/events/slug/${currentAccountEventSlug.value}`,
        {
          signal
        }
      )

      return response.data
    },
    {
      default: () => null,
      watch: [currentAccountEventSlug]
    }
  )

  const {
    data: pendingPrizeRedemptions,
    error: pendingPrizeRedemptionsError,
    clear: clearPrizeRedemptions
  } = useApiData<Array<{ id: string }>>(
    computed(() => `shell-prize-redemptions-${user.value?.sub ?? 'anonymous'}`),
    async ({ apiFetch, signal }) => {
      if (actor.value.kind !== 'platform_user') {
        return []
      }

      const response = await apiFetch<ShellPrizeRedemptionsResponse>('/api/prize-redemptions/me', {
        signal
      })

      return response.data
    },
    {
      default: () => [],
      watch: [computed(() => actor.value.kind === 'platform_user' ? actor.value.platformUser.id : null)]
    }
  )

  watch(() => user.value?.sub ?? null, (sub, previousSub) => {
    if (sub !== previousSub) {
      clearPrizeRedemptions()
    }
  })

  watch(() => route.path, async (nextPath, previousPath) => {
    if (!import.meta.client || !user.value?.sub || !previousPath) {
      return
    }

    const leftAccountSettings = previousPath.startsWith('/account/settings')
      && !nextPath.startsWith('/account/settings')

    if (!leftAccountSettings) {
      return
    }

    await refresh()
    await refreshNuxtData(`shell-prize-redemptions-${user.value.sub}`)
  })

  const isResolvingActor = computed(() => Boolean(user.value?.sub) && status.value === 'pending')
  const hasPlatformAccount = computed(() => actor.value.kind === 'platform_user')
  const hasAdminAccess = computed(() => actor.value.kind === 'platform_user'
    && canAccessAdminDashboard(actor.value))
  const hasStaffAccess = computed(() => actor.value.kind === 'platform_user'
    && actor.value.eventRoles.some(role => isEventRoleStaffEnabled(role)))
  const hasJudgeAccess = computed(() => actor.value.kind === 'platform_user'
    && actor.value.eventRoles.some(role => isEventRoleJudgingEnabled(role)))
  const accountEventNavigationMode = computed(() =>
    resolveShellAccountEventNavigationMode({
      actor: actor.value,
      currentEventId: currentAccountEvent.value?.id ?? null,
      currentPath: route.path
    })
  )
  const hasPrizeRecipientAccess = computed(() => pendingPrizeRedemptions.value.length > 0)
  const prizeRedemptionsErrorMessage = computed(() => {
    if (actor.value.kind !== 'platform_user' || !pendingPrizeRedemptionsError.value) {
      return ''
    }

    return pendingPrizeRedemptionsError.value.statusMessage
      ?? pendingPrizeRedemptionsError.value.message
      ?? 'Winner-facing prize redemption status could not be loaded right now.'
  })

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
      id: 'my-events',
      label: 'My events',
      description: 'Your active, upcoming, and past events',
      to: '/account',
      icon: 'i-lucide-flag'
    }, {
      id: 'profile-settings',
      label: 'Profile settings',
      description: 'Profile details and platform lifecycle',
      to: '/account/settings',
      icon: 'i-lucide-id-card'
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
    hasPrizeRecipientAccess,
    isResolvingActor,
    authEntryHref,
    accountEventNavigationMode,
    prizeRedemptionsErrorMessage,
    refresh,
    roleChips,
    sidebarGroups
  }
}
