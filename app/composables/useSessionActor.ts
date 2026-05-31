import type {
  AuthenticatedIdentitySessionActor,
  SessionActor,
  SessionActorResponse
} from '~/domains/accounts/session-actor'

import {
  buildAnonymousSessionActor,
  buildAuthenticatedIdentitySessionActor
} from '~/domains/accounts/session-actor'

export type ResolvedSessionActor = SessionActor

function buildGitHubProfileUrlFromUser(user: ReturnType<typeof useUser>['value']) {
  const username = user?.sub?.startsWith('github|')
    ? user.nickname?.trim()
    : ''

  return username ? `https://github.com/${encodeURIComponent(username)}` : null
}

function buildAuthenticatedIdentityFallback(user: ReturnType<typeof useUser>['value']): AuthenticatedIdentitySessionActor {
  return buildAuthenticatedIdentitySessionActor({
    sub: user?.sub ?? '',
    email: user?.email ?? null,
    email_verified: typeof user?.email_verified === 'boolean' ? user.email_verified : null,
    name: user?.name ?? null,
    nickname: user?.nickname ?? null,
    picture: user?.picture ?? null,
    githubProfileUrl: buildGitHubProfileUrlFromUser(user)
  })
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
