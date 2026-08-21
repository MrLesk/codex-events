import type {
  SessionActor,
  SessionActorResponse
} from '~/domains/accounts/session-actor'
import type { ShallowRef } from 'vue'

import { computed, shallowRef, watch } from 'vue'

import {
  buildAnonymousSessionActor
} from '~/domains/accounts/session-actor'
import {
  canAccessAdminDashboard,
  canCreateEvent,
  isEventRoleJudgingEnabled,
  isEventRoleStaffEnabled
} from '~/domains/events/access'
import { createAbortError, throwIfAborted } from '~/lib/request-cancellation'

import { useApiClient } from './useApiClient'
import { useAuthorizationCache } from './useAuthorizationCache'

interface AccountBootstrapState {
  clear: (() => void) | null
  refresh: (() => Promise<unknown>) | null
  refreshPromise: Promise<void> | null
  ready: ShallowRef<boolean>
  version: number
}

const accountBootstrapStates = new WeakMap<object, AccountBootstrapState>()

function getAccountBootstrapState(nuxtApp: object) {
  const existingState = accountBootstrapStates.get(nuxtApp)

  if (existingState) {
    return existingState
  }

  const state: AccountBootstrapState = {
    clear: null,
    refresh: null,
    refreshPromise: null,
    ready: shallowRef(false),
    version: 0
  }

  accountBootstrapStates.set(nuxtApp, state)
  return state
}

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

async function waitForAbortable<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) {
    return await promise
  }

  throwIfAborted(signal)

  return await new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      cleanup()
      reject(createAbortError())
    }
    const cleanup = () => {
      signal.removeEventListener('abort', onAbort)
    }

    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        cleanup()
        resolve(value)
      },
      (error) => {
        cleanup()
        reject(error)
      }
    )
  })
}

export function useAccountBootstrap() {
  const bootstrapState = getAccountBootstrapState(useNuxtApp())
  const apiFetch = useApiClient()
  const {
    data,
    error,
    status,
    refresh,
    clear
  } = useAsyncData<ResolvedSessionActor>(
    'session-actor',
    async (_nuxtApp, { signal }) => {
      const requestVersion = ++bootstrapState.version
      bootstrapState.ready.value = false
      let resolvedActor: ResolvedSessionActor

      try {
        const response = await apiFetch<SessionActorResponse>('/api/session', {
          signal
        })

        resolvedActor = response.data.actor
      } catch (error) {
        if (!isUnauthorizedError(error)) {
          throw error
        }

        resolvedActor = buildAnonymousSessionActor()
      }

      if (bootstrapState.version === requestVersion) {
        bootstrapState.ready.value = true
      }

      return resolvedActor
    },
    {
      deep: false,
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

  const { syncAuthorization } = useAuthorizationCache()
  watch([actor, capabilities], ([nextActor, nextCapabilities]) => {
    syncAuthorization(nextActor, nextCapabilities)
  }, {
    immediate: true
  })

  const bootstrap = computed<SessionActorBootstrap>(() => ({
    actor: actor.value,
    capabilities: capabilities.value
  }))
  const isReady = computed(() => bootstrapState.ready.value)

  bootstrapState.refresh ??= refresh
  bootstrapState.clear ??= clear

  function refreshBootstrap() {
    bootstrapState.ready.value = false

    if (bootstrapState.refreshPromise) {
      return bootstrapState.refreshPromise
    }

    const currentRefresh = Promise.resolve()
      .then(() => bootstrapState.refresh!())
      .then(() => undefined)
      .finally(() => {
        if (bootstrapState.refreshPromise === currentRefresh) {
          bootstrapState.refreshPromise = null
        }
      })

    bootstrapState.refreshPromise = currentRefresh
    return currentRefresh
  }

  async function ensureLoaded(signal?: AbortSignal) {
    if (signal) {
      throwIfAborted(signal)
    }

    if (!bootstrapState.ready.value) {
      await waitForAbortable(refreshBootstrap(), signal)
    }

    if (signal) {
      throwIfAborted(signal)
    }

    if (error.value) {
      throw error.value
    }
  }

  function clearBootstrap() {
    bootstrapState.version += 1
    bootstrapState.ready.value = false
    bootstrapState.refreshPromise = null
    bootstrapState.clear?.()
  }

  return {
    actor,
    bootstrap,
    capabilities,
    error,
    ensureLoaded,
    isReady,
    status,
    refresh: refreshBootstrap,
    clear: clearBootstrap
  }
}
