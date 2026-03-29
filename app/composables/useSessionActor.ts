interface SessionActorUser {
  sub: string
  email?: string | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
}

interface SessionActorPlatformUser {
  id: string
  email: string
  displayName: string
  firstName: string
  familyName: string
  isPlatformAdmin: boolean
  xProfileUrl: string | null
  linkedinProfileUrl: string | null
  githubProfileUrl: string | null
  chatgptEmail: string | null
  openaiOrgId: string | null
  lumaUsername: string | null
  profileIconUpdatedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

interface SessionActorHackathonRole {
  hackathonId: string
  role: 'hackathon_admin' | 'judge'
  isInJudgePool: boolean
  createdAt: string
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

export function useSessionActor() {
  const user = useUser()
  const apiFetch = import.meta.server ? useRequestFetch() : $fetch
  const authSubject = computed(() => user.value?.sub ?? null)

  const {
    data,
    status,
    refresh,
    clear
  } = useAsyncData<ResolvedSessionActor | null>(
    () => `session-actor:${authSubject.value ?? 'anonymous'}`,
    async () => {
      if (!authSubject.value) {
        return null
      }

      const response = await apiFetch<SessionActorResponse>('/api/session')

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
