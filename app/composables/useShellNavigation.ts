import type { ResolvedSessionActor } from '~/composables/useSessionActor'

import { accountDashboardHref, buildAuthLoginHref } from '~/utils/auth-navigation'

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
  const apiFetch = import.meta.server ? useRequestFetch() : $fetch

  const returnTo = computed(() => route.fullPath || accountDashboardHref)
  const authEntryHref = computed(() => buildAuthLoginHref(returnTo.value))
  const { actor, status, refresh } = useSessionActor()

  const {
    data: pendingPrizeRedemptions,
    error: pendingPrizeRedemptionsError,
    clear: clearPrizeRedemptions
  } = useAsyncData<Array<{ id: string }>>(
    computed(() => `shell-prize-redemptions-${user.value?.sub ?? 'anonymous'}`),
    async () => {
      if (actor.value.kind !== 'platform_user') {
        return []
      }

      const response = await apiFetch<ShellPrizeRedemptionsResponse>('/api/prize-redemptions/me')

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

    const leftOnboardingSurface = (
      previousPath.startsWith('/onboarding/')
      || previousPath.startsWith('/account/settings')
    ) && !nextPath.startsWith('/onboarding/')
    && !nextPath.startsWith('/account/settings')

    if (!leftOnboardingSurface) {
      return
    }

    await refresh()
    await refreshNuxtData(`shell-prize-redemptions-${user.value.sub}`)
  })

  const isResolvingActor = computed(() => Boolean(user.value?.sub) && status.value === 'pending')
  const hasPlatformAccount = computed(() => actor.value.kind === 'platform_user')
  const hasAdminAccess = computed(() => actor.value.kind === 'platform_user'
    && (actor.value.isPlatformAdmin || actor.value.hackathonRoles.some(role => role.role === 'hackathon_admin')))
  const hasJudgeAccess = computed(() => actor.value.kind === 'platform_user'
    && (hasAdminAccess.value || actor.value.hackathonRoles.some(role => role.role === 'judge')))
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
      return ['Onboarding required']
    }

    const chips = ['Platform user']

    if (actor.value.isPlatformAdmin) {
      chips.push('Platform admin')
    }

    if (actor.value.hackathonRoles.some(role => role.role === 'hackathon_admin')) {
      chips.push('Hackathon admin')
    }

    if (actor.value.hackathonRoles.some(role => role.role === 'judge')) {
      chips.push('Judge')
    }

    return chips
  })

  const sidebarGroups = computed<ShellNavigationGroup[]>(() => {
    if (actor.value.kind !== 'platform_user') {
      return []
    }

    const groups: ShellNavigationGroup[] = [{
      label: 'Workspace',
      items: [{
        id: 'dashboard',
        label: 'Dashboard',
        description: 'Role-aware operational overview',
        to: '/account/dashboard',
        icon: 'i-lucide-layout-dashboard'
      }, {
        id: 'settings',
        label: 'Settings',
        description: 'Profile details and platform lifecycle',
        to: '/account/settings',
        icon: 'i-lucide-id-card'
      }]
    }]

    const specializedItems: ShellNavigationItem[] = []

    if (hasJudgeAccess.value) {
      specializedItems.unshift({
        id: 'judge',
        label: 'Judge workspace',
        description: 'Blind judging and assignment progress',
        to: '/judging',
        icon: 'i-lucide-scale'
      })
    }

    if (hasAdminAccess.value) {
      specializedItems.push({
        id: 'admin',
        label: 'Admin operations',
        description: 'Setup, lifecycle controls, and oversight',
        to: '/admin',
        icon: 'i-lucide-shield-check'
      })
    }

    if (hasPrizeRecipientAccess.value) {
      specializedItems.push({
        id: 'prizes',
        label: 'Prize redemptions',
        description: 'Winner-facing redemption tasks',
        to: '/prize-redemptions',
        icon: 'i-lucide-gift'
      })
    }

    if (specializedItems.length > 0) {
      groups.push({
        label: 'Specialized areas',
        items: specializedItems
      })
    }

    return groups
  })

  return {
    actor,
    hasAdminAccess,
    hasJudgeAccess,
    hasPlatformAccount,
    hasPrizeRecipientAccess,
    isResolvingActor,
    authEntryHref,
    prizeRedemptionsErrorMessage,
    refresh,
    roleChips,
    sidebarGroups
  }
}
