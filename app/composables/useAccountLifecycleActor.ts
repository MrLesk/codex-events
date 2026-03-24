interface AccountLifecycleSessionUser {
  sub: string
  email?: string | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
}

interface AccountLifecyclePlatformUser {
  id: string
  email: string
  displayName: string
  isPlatformAdmin: boolean
  xProfileUrl?: string | null
  linkedinProfileUrl?: string | null
  githubProfileUrl?: string | null
  chatgptEmail?: string | null
  openaiOrgId?: string | null
  lumaUsername?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

type AccountLifecycleActor
  = | {
    kind: 'anonymous'
    isAuthenticated: false
    hasPlatformAccount: false
    sessionUser: null
    platformUser: null
    isPlatformAdmin: false
    hackathonRoles: []
  }
  | {
    kind: 'authenticated_identity'
    isAuthenticated: true
    hasPlatformAccount: false
    sessionUser: AccountLifecycleSessionUser
    platformUser: null
    isPlatformAdmin: false
    hackathonRoles: Array<{
      hackathonId: string
      role: string
      isInJudgePool: boolean
      createdAt: string
    }>
  }
  | {
    kind: 'platform_user'
    isAuthenticated: true
    hasPlatformAccount: true
    sessionUser: AccountLifecycleSessionUser
    platformUser: AccountLifecyclePlatformUser
    isPlatformAdmin: boolean
    hackathonRoles: Array<{
      hackathonId: string
      role: string
      isInJudgePool: boolean
      createdAt: string
    }>
  }

interface AccountLifecycleActorResponse {
  data: {
    actor: AccountLifecycleActor
  }
}

export async function useAccountLifecycleActor() {
  const user = useUser()
  const authSubject = computed(() => user.value?.sub ?? 'anonymous')
  const request = await useFetch<AccountLifecycleActorResponse>('/api/session', {
    key: () => `account-lifecycle-actor:${authSubject.value}`,
    watch: [authSubject]
  })

  return {
    ...request,
    actor: computed(() => request.data.value?.data.actor ?? null)
  }
}
