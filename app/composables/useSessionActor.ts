interface SessionActorUser {
  sub: string
  email?: string | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
  githubProfileUrl?: string | null
}

interface SessionActorPlatformUser {
  id: string
  email: string
  displayName: string
  firstName: string
  familyName: string
  company?: string | null
  bio?: string | null
  isPlatformAdmin: boolean
  xProfileUrl: string | null
  linkedinProfileUrl: string | null
  githubProfileUrl: string | null
  chatgptEmail: string | null
  openaiOrgId: string | null
  lumaEmail: string | null
  lumaUsername: string | null
  profileIconUpdatedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

interface SessionActorHackathonRole {
  hackathonId: string
  role: 'hackathon_admin' | 'judge' | 'staff'
  isInJudgePool: boolean
  isStaff: boolean
  createdAt: string
}

interface SessionActorAccountLink {
  required: true
  email: string
  linkLoginHref: '/auth/link/login'
}

interface AnonymousSessionActor {
  kind: 'anonymous'
  isAuthenticated: false
  hasPlatformAccount: false
  hasAcceptedCurrentPlatformDocuments: false
  sessionUser: null
  platformUser: null
  isPlatformAdmin: false
  hackathonRoles: []
}

interface AuthenticatedIdentitySessionActor {
  kind: 'authenticated_identity'
  isAuthenticated: true
  hasPlatformAccount: false
  hasAcceptedCurrentPlatformDocuments: false
  accountLink: SessionActorAccountLink | null
  sessionUser: SessionActorUser
  platformUser: null
  isPlatformAdmin: false
  hackathonRoles: []
}

interface PlatformSessionActor {
  kind: 'platform_user'
  isAuthenticated: true
  hasPlatformAccount: true
  hasAcceptedCurrentPlatformDocuments: boolean
  sessionUser: SessionActorUser
  platformUser: SessionActorPlatformUser
  isPlatformAdmin: boolean
  hackathonRoles: SessionActorHackathonRole[]
}

interface SessionActorResponse {
  data: {
    actor: AuthenticatedIdentitySessionActor | PlatformSessionActor
  }
}

export type ResolvedSessionActor = AnonymousSessionActor | AuthenticatedIdentitySessionActor | PlatformSessionActor

function buildGitHubProfileUrlFromUser(user: ReturnType<typeof useUser>['value']) {
  const username = user?.sub?.startsWith('github|')
    ? user.nickname?.trim()
    : ''

  return username ? `https://github.com/${encodeURIComponent(username)}` : null
}

function buildAnonymousSessionActor(): AnonymousSessionActor {
  return {
    kind: 'anonymous',
    isAuthenticated: false,
    hasPlatformAccount: false,
    hasAcceptedCurrentPlatformDocuments: false,
    sessionUser: null,
    platformUser: null,
    isPlatformAdmin: false,
    hackathonRoles: []
  }
}

function buildAuthenticatedIdentityFallback(user: ReturnType<typeof useUser>['value']): AuthenticatedIdentitySessionActor {
  return {
    kind: 'authenticated_identity',
    isAuthenticated: true,
    hasPlatformAccount: false,
    hasAcceptedCurrentPlatformDocuments: false,
    accountLink: null,
    sessionUser: {
      sub: user?.sub ?? '',
      email: user?.email ?? null,
      name: user?.name ?? null,
      nickname: user?.nickname ?? null,
      picture: user?.picture ?? null,
      githubProfileUrl: buildGitHubProfileUrlFromUser(user)
    },
    platformUser: null,
    isPlatformAdmin: false,
    hackathonRoles: []
  }
}

export function useSessionActor() {
  const user = useUser()
  const authSubject = computed(() => user.value?.sub ?? null)

  const {
    data,
    status,
    refresh,
    clear
  } = useApiData<ResolvedSessionActor | null>(
    () => `session-actor:${authSubject.value ?? 'anonymous'}`,
    async ({ apiFetch, signal }) => {
      if (!authSubject.value) {
        return null
      }

      const response = await apiFetch<SessionActorResponse>('/api/session', {
        signal
      })

      return response.data.actor
    },
    {
      default: () => null,
      watch: [authSubject]
    }
  )

  watch(authSubject, (subject, previousSubject) => {
    if (subject !== previousSubject) {
      clear()
    }
  })

  const actor = computed<ResolvedSessionActor>(() => {
    if (!authSubject.value) {
      return buildAnonymousSessionActor()
    }

    return data.value ?? buildAuthenticatedIdentityFallback(user.value)
  })

  return {
    actor,
    status,
    refresh,
    clear
  }
}
