import type {
  SessionActor,
  SessionActorResponse
} from '~/domains/accounts/session-actor'

import {
  buildAnonymousSessionActor
} from '~/domains/accounts/session-actor'
import {
  canAccessAdminDashboard,
  canCreateEvent,
  isEventRoleJudgingEnabled,
  isEventRoleStaffEnabled
} from '~/domains/events/access'

export type ResolvedSessionActor = SessionActor

export interface SessionActorCapabilities {
  canAccessAdminDashboard: boolean
  canAccessJudgeDashboard: boolean
  canAccessPlatformSettings: boolean
  canAccessStaffDashboard: boolean
  canCreateEvent: boolean
}

export interface SessionActorBootstrap {
  actor: ResolvedSessionActor
  capabilities: SessionActorCapabilities
}

function isUnauthorizedError(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const status = error as { status?: unknown, statusCode?: unknown }

  return status.status === 401 || status.statusCode === 401
}

export function useSessionActor() {
  const {
    data,
    error,
    status,
    refresh,
    clear
  } = useApiData<ResolvedSessionActor>(
    'session-actor',
    async ({ apiFetch, signal }) => {
      try {
        const response = await apiFetch<SessionActorResponse>('/api/session', {
          signal
        })

        return response.data.actor
      } catch (error) {
        if (isUnauthorizedError(error)) {
          return buildAnonymousSessionActor()
        }

        throw error
      }
    },
    {
      default: () => buildAnonymousSessionActor(),
      dedupe: 'defer',
      lazy: false,
      server: false
    }
  )

  const actor = computed<ResolvedSessionActor>(() => {
    return data.value ?? buildAnonymousSessionActor()
  })

  const capabilities = computed<SessionActorCapabilities>(() => ({
    canAccessAdminDashboard: canAccessAdminDashboard(actor.value),
    canAccessJudgeDashboard: actor.value.kind === 'platform_user'
      && actor.value.eventRoles.some(role => isEventRoleJudgingEnabled(role)),
    canAccessPlatformSettings: actor.value.kind === 'platform_user'
      && actor.value.isPlatformAdmin,
    canAccessStaffDashboard: actor.value.kind === 'platform_user'
      && actor.value.eventRoles.some(role => isEventRoleStaffEnabled(role)),
    canCreateEvent: canCreateEvent(actor.value)
  }))

  const bootstrap = computed<SessionActorBootstrap>(() => ({
    actor: actor.value,
    capabilities: capabilities.value
  }))
  const isReady = computed(() => status.value === 'success')

  async function ensureLoaded() {
    if (status.value === 'success') {
      return
    }

    await refresh()

    if (error.value) {
      throw error.value
    }
  }

  return {
    actor,
    bootstrap,
    capabilities,
    error,
    ensureLoaded,
    isReady,
    status,
    refresh,
    clear
  }
}
