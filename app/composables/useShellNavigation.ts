import type { ResolvedSessionActor } from '~/composables/useSessionActor'
import type { PublicApiDataResponse } from '~/composables/useHackathonPresentation'

import { accountDashboardHref, buildAuthLoginHref } from '../../shared/auth-navigation'
import {
  isHackathonRoleJudgingEnabled,
  isHackathonRoleStaffEnabled
} from '~/utils/admin-workspace'
import {
  isAccountHackathonDetailPath,
  resolveShellAccountHackathonNavigationMode
} from '~/utils/shell-navigation'

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
  const currentAccountHackathonSlug = computed(() =>
    isAccountHackathonDetailPath(route.path) ? String(route.params.slug ?? '').trim() : ''
  )
  const {
    data: currentAccountHackathon
  } = useApiData<{ id: string } | null>(
    () => `shell-account-hackathon:${currentAccountHackathonSlug.value || 'none'}`,
    async ({ apiFetch, signal }) => {
      if (!currentAccountHackathonSlug.value) {
        return null
      }

      const response = await apiFetch<PublicApiDataResponse<{ id: string }>>(
        `/api/hackathons/slug/${currentAccountHackathonSlug.value}`,
        {
          signal
        }
      )

      return response.data
    },
    {
      default: () => null,
      watch: [currentAccountHackathonSlug]
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
    && (actor.value.isPlatformAdmin || actor.value.hackathonRoles.some(role => role.role === 'hackathon_admin')))
  const hasStaffAccess = computed(() => actor.value.kind === 'platform_user'
    && actor.value.hackathonRoles.some(role => isHackathonRoleStaffEnabled(role)))
  const hasJudgeAccess = computed(() => actor.value.kind === 'platform_user'
    && actor.value.hackathonRoles.some(role => isHackathonRoleJudgingEnabled(role)))
  const accountHackathonNavigationMode = computed(() =>
    resolveShellAccountHackathonNavigationMode({
      actor: actor.value,
      currentHackathonId: currentAccountHackathon.value?.id ?? null,
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

    if (actor.value.hackathonRoles.some(role => role.role === 'hackathon_admin')) {
      chips.push('Hackathon admin')
    }

    if (actor.value.hackathonRoles.some(role => isHackathonRoleStaffEnabled(role))) {
      chips.push('Staff')
    }

    if (actor.value.hackathonRoles.some(role => isHackathonRoleJudgingEnabled(role))) {
      chips.push('Judge')
    }

    return chips
  })

  const sidebarGroups = computed<ShellNavigationGroup[]>(() => {
    if (actor.value.kind !== 'platform_user') {
      return []
    }

    const items: ShellNavigationItem[] = [{
      id: 'my-hackathons',
      label: 'My hackathons',
      description: 'Your active, upcoming, and past hackathons',
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
        description: 'Hackathons where you are assigned as a judge',
        to: '/account/judging',
        icon: 'i-lucide-scale'
      })
    }

    if (hasStaffAccess.value) {
      items.push({
        id: 'staff-dashboard',
        label: 'Staff dashboard',
        description: 'Hackathons where you support staff operations',
        to: '/account/staff',
        icon: 'i-lucide-users'
      })
    }

    if (hasAdminAccess.value) {
      items.push({
        id: 'admin-dashboard',
        label: 'Admin dashboard',
        description: 'Hackathons you can manage and platform-wide admin work',
        to: '/account/admin',
        icon: 'i-lucide-shield-check'
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
    accountHackathonNavigationMode,
    prizeRedemptionsErrorMessage,
    refresh,
    roleChips,
    sidebarGroups
  }
}
