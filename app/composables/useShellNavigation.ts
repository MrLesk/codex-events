import { buildAuthAccessHref } from '~/utils/auth-navigation'

interface ShellSessionUser {
  sub: string
  email?: string | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
}

interface ShellPlatformUser {
  id: string
  email: string
  displayName: string
  isPlatformAdmin: boolean
  xProfileUrl: string | null
  linkedinProfileUrl: string | null
  githubProfileUrl: string | null
  chatgptEmail: string | null
  openaiOrgId: string | null
  lumaUsername: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

interface ShellHackathonRole {
  hackathonId: string
  role: 'hackathon_admin' | 'judge'
  isInJudgePool: boolean
  createdAt: string
}

interface AnonymousShellActor {
  kind: 'anonymous'
  isAuthenticated: false
  hasPlatformAccount: false
  sessionUser: null
  platformUser: null
  isPlatformAdmin: false
  hackathonRoles: []
}

interface AuthenticatedIdentityShellActor {
  kind: 'authenticated_identity'
  isAuthenticated: true
  hasPlatformAccount: false
  sessionUser: ShellSessionUser
  platformUser: null
  isPlatformAdmin: false
  hackathonRoles: []
}

interface PlatformShellActor {
  kind: 'platform_user'
  isAuthenticated: true
  hasPlatformAccount: true
  sessionUser: ShellSessionUser
  platformUser: ShellPlatformUser
  isPlatformAdmin: boolean
  hackathonRoles: ShellHackathonRole[]
}

interface ShellSessionResponse {
  data: {
    actor: AuthenticatedIdentityShellActor | PlatformShellActor
  }
}

interface ShellPrizeRedemptionsResponse {
  data: Array<{
    id: string
  }>
}

export type ShellActor = AnonymousShellActor | AuthenticatedIdentityShellActor | PlatformShellActor

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

export interface DashboardEntry extends ShellNavigationItem {
  accent: 'primary' | 'secondary' | 'success' | 'warning' | 'neutral'
}

function buildFallbackActor(user: ReturnType<typeof useUser>['value']): AuthenticatedIdentityShellActor {
  return {
    kind: 'authenticated_identity',
    isAuthenticated: true,
    hasPlatformAccount: false,
    sessionUser: {
      sub: user?.sub ?? '',
      email: user?.email ?? null,
      name: user?.name ?? null,
      nickname: user?.nickname ?? null,
      picture: user?.picture ?? null
    },
    platformUser: null,
    isPlatformAdmin: false,
    hackathonRoles: []
  }
}

export function useShellNavigation() {
  const route = useRoute()
  const user = useUser()
  const actorKey = computed(() => `shell-session-actor-${user.value?.sub ?? 'anonymous'}`)

  const returnTo = computed(() => route.fullPath || '/dashboard')
  const authEntryHref = computed(() => buildAuthAccessHref(returnTo.value, 'signin'))

  const {
    data: actorResponse,
    status,
    refresh,
    clear
  } = useAsyncData<ShellActor | null>(actorKey, async () => {
    if (!user.value?.sub) {
      return null
    }

    const response = await $fetch<ShellSessionResponse>('/api/session')

    return response.data.actor
  }, {
    default: () => null,
    watch: [computed(() => user.value?.sub ?? null)]
  })

  watch(() => user.value?.sub ?? null, (sub, previousSub) => {
    if (sub !== previousSub) {
      clear()
    }
  })

  const actor = computed<ShellActor>(() => {
    if (!user.value?.sub) {
      return {
        kind: 'anonymous',
        isAuthenticated: false,
        hasPlatformAccount: false,
        sessionUser: null,
        platformUser: null,
        isPlatformAdmin: false,
        hackathonRoles: []
      }
    }

    return actorResponse.value ?? buildFallbackActor(user.value)
  })

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

      const response = await $fetch<ShellPrizeRedemptionsResponse>('/api/prize-redemptions/me')

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

  const isResolvingActor = computed(() => Boolean(user.value?.sub) && status.value === 'pending' && !actorResponse.value)
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
      return ['Authenticated identity', 'Platform account required']
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
        description: 'Role-aware overview and next steps',
        to: '/dashboard',
        icon: 'i-lucide-layout-dashboard'
      }, {
        id: 'discover',
        label: 'Hackathons',
        description: 'Participant and public entry surface',
        to: '/',
        icon: 'i-lucide-sparkles'
      }, {
        id: 'account',
        label: 'Account',
        description: 'Profile details and platform lifecycle',
        to: '/account',
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

  const dashboardEntries = computed<DashboardEntry[]>(() => {
    if (actor.value.kind === 'anonymous') {
      return [{
        id: 'discover',
        label: 'Browse public hackathons',
        description: 'Inspect visible program timing, criteria, prizes, and current terms references before you sign in.',
        to: '/',
        icon: 'i-lucide-sparkles',
        badge: 'Public',
        accent: 'primary'
      }, {
        id: 'signin',
        label: 'Authenticate with Auth0',
        description: 'Start a real session so the platform can resolve your actor and role-aware workflow entry points.',
        to: authEntryHref.value,
        icon: 'i-lucide-log-in',
        badge: 'Protected areas',
        accent: 'secondary',
        external: true
      }]
    }

    if (actor.value.kind === 'authenticated_identity') {
      return [{
        id: 'complete-account',
        label: 'Complete your platform account',
        description: 'Finish platform registration and exact-version document acceptance before entering hackathon participation workflows.',
        to: buildAuthAccessHref('/dashboard', 'register'),
        icon: 'i-lucide-id-card',
        badge: 'Onboarding',
        accent: 'primary'
      }, {
        id: 'discover',
        label: 'Explore public hackathons',
        description: 'You can inspect visible programs now, but team, submission, and admin workflows stay closed until your platform account exists.',
        to: '/',
        icon: 'i-lucide-sparkles',
        badge: 'Public',
        accent: 'neutral'
      }]
    }

    const entries: DashboardEntry[] = [{
      id: 'participant',
      label: 'Participate in hackathons',
      description: 'Use discovery and participant surfaces for applications, team formation, and team-owned submission work.',
      to: '/',
      icon: 'i-lucide-users',
      badge: 'Participant',
      accent: 'primary'
    }, {
      id: 'account',
      label: 'Manage your account',
      description: 'Keep profile links current and handle your own platform-account lifecycle actions.',
      to: '/account',
      icon: 'i-lucide-id-card',
      badge: 'Account',
      accent: 'neutral'
    }]

    if (hasPrizeRecipientAccess.value) {
      entries.push({
        id: 'prizes',
        label: 'Check prize redemptions',
        description: 'Open winner-facing redemption tasks when a hackathon outcome makes them available.',
        to: '/prize-redemptions',
        icon: 'i-lucide-gift',
        badge: 'Winner-facing',
        accent: 'success'
      })
    }

    if (hasJudgeAccess.value) {
      entries.unshift({
        id: 'judge',
        label: 'Review judge assignments',
        description: 'Enter the blind workspace for assigned submissions without exposing restricted team identity.',
        to: '/judging',
        icon: 'i-lucide-scale',
        badge: 'Judge',
        accent: 'warning'
      })
    }

    if (hasAdminAccess.value) {
      entries.unshift({
        id: 'admin',
        label: 'Operate hackathons',
        description: 'Configure programs, manage lifecycle controls, and oversee role-aware operational surfaces.',
        to: '/admin',
        icon: 'i-lucide-shield-check',
        badge: actor.value.isPlatformAdmin ? 'Platform admin' : 'Hackathon admin',
        accent: 'secondary'
      })
    }

    return entries
  })

  return {
    actor,
    dashboardEntries,
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
