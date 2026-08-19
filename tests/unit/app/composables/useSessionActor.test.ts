import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { computed, nextTick, ref, watch } from 'vue'

const useApiData = vi.hoisted(() => vi.fn())
const syncAuthorization = vi.hoisted(() => vi.fn())
const bootstrapFetch = vi.hoisted(() => vi.fn())

vi.mock('../../../../app/composables/useAuthorizationCache', () => ({
  useAuthorizationCache: () => ({
    syncAuthorization
  })
}))

describe('useSessionActor', () => {
  const actor = {
    kind: 'platform_user' as const,
    isAuthenticated: true as const,
    hasPlatformAccount: true as const,
    hasAcceptedCurrentPlatformDocuments: true,
    sessionUser: {
      sub: 'auth0|event-admin',
      email: 'event-admin@example.com'
    },
    platformUser: {
      id: 'event-admin',
      email: 'event-admin@example.com',
      displayName: 'Event Admin',
      firstName: 'Event',
      familyName: 'Admin',
      isPlatformAdmin: false,
      isEventOrganizer: true
    },
    isPlatformAdmin: false,
    isEventOrganizer: true,
    eventRoles: [{
      eventId: 'event-1',
      role: 'event_admin' as const,
      isInJudgePool: true,
      isStaff: true,
      staffTrackId: null,
      createdAt: '2026-08-19T00:00:00.000Z'
    }]
  }

  beforeEach(() => {
    vi.resetModules()
    useApiData.mockReset()
    syncAuthorization.mockReset()
    bootstrapFetch.mockReset()

    const data = ref<typeof actor | null>(null)
    const error = ref<Error | null>(null)
    const status = ref<string>('pending')
    bootstrapFetch.mockImplementation(async () => ({
      data: {
        actor
      }
    }))
    let bootstrapHandler: ((context: { apiFetch: typeof bootstrapFetch, signal: AbortSignal }) => Promise<typeof actor>) | null = null
    let pendingBootstrap: Promise<void> | null = null
    const refresh = vi.fn(async () => {
      if (status.value === 'success') {
        return
      }

      pendingBootstrap ??= (async () => {
        data.value = await bootstrapHandler!({
          apiFetch: bootstrapFetch,
          signal: new AbortController().signal
        })
        status.value = 'success'
      })()

      await pendingBootstrap
      pendingBootstrap = null
    })

    useApiData.mockImplementation((_key, handler) => {
      bootstrapHandler ??= handler

      return {
        data,
        error,
        status,
        refresh,
        clear: vi.fn()
      }
    })

    vi.stubGlobal('computed', computed)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('useApiData', useApiData)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('shares the keyed deferred bootstrap contract across consumers', async () => {
    const { useSessionActor } = await import('../../../../app/composables/useSessionActor')

    const first = useSessionActor()
    const second = useSessionActor()
    const calls = useApiData.mock.calls

    expect(calls).toHaveLength(2)
    expect(calls.map(([key]) => key)).toEqual([
      'session-actor',
      'session-actor'
    ])
    expect(calls[0]?.[2]).toMatchObject({
      dedupe: 'defer',
      lazy: false
    })
    expect(calls[0]?.[2]).not.toHaveProperty('watch')
    expect(first.refresh).toBe(second.refresh)

    await Promise.all([first.ensureLoaded(), second.ensureLoaded()])

    expect(first.actor.value).toEqual(actor)
    expect(bootstrapFetch).toHaveBeenCalledTimes(1)
    expect(first.capabilities.value).toEqual({
      canAccessAdminDashboard: true,
      canAccessJudgeDashboard: true,
      canAccessPlatformSettings: false,
      canAccessStaffDashboard: true,
      canCreateEvent: true
    })
  })

  test('synchronizes authorization changes through the shared cache boundary', async () => {
    const { useSessionActor } = await import('../../../../app/composables/useSessionActor')
    const session = useSessionActor()

    await session.ensureLoaded()
    expect(syncAuthorization).toHaveBeenCalled()

    const changedActor = {
      ...actor,
      hasAcceptedCurrentPlatformDocuments: false
    }
    const sessionRequest = useApiData.mock.results[0]?.value as { data: typeof session.actor }
    sessionRequest.data.value = changedActor
    await nextTick()

    expect(syncAuthorization).toHaveBeenCalledWith(
      changedActor,
      expect.objectContaining({
        canAccessAdminDashboard: true
      })
    )
  })

  test('keeps the actor bootstrap independent from query-only navigation state', async () => {
    const { useSessionActor } = await import('../../../../app/composables/useSessionActor')
    const session = useSessionActor()

    await session.ensureLoaded()

    expect(useApiData.mock.calls[0]?.[2]).not.toHaveProperty('watch')
    expect(session.refresh).toHaveBeenCalledTimes(1)
  })

  test('loads the shared session endpoint when a static shell has no SSR Auth0 state', async () => {
    const apiFetch = vi.fn(async () => ({
      data: {
        actor
      }
    }))
    const { useSessionActor } = await import('../../../../app/composables/useSessionActor')
    const session = useSessionActor()
    const [, handler, options] = useApiData.mock.calls[0] as [
      string,
      (context: { apiFetch: typeof apiFetch, signal: AbortSignal }) => Promise<typeof actor>,
      { server: boolean }
    ]

    await expect(handler({
      apiFetch,
      signal: new AbortController().signal
    })).resolves.toEqual(actor)

    expect(options.server).toBe(false)
    expect(apiFetch).toHaveBeenCalledWith('/api/session', {
      signal: expect.any(AbortSignal)
    })
    expect(session.actor.value).toEqual({
      kind: 'anonymous',
      isAuthenticated: false,
      hasPlatformAccount: false,
      hasAcceptedCurrentPlatformDocuments: false,
      sessionUser: null,
      platformUser: null,
      isPlatformAdmin: false,
      isEventOrganizer: false,
      eventRoles: []
    })
  })
})
