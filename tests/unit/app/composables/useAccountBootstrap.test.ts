import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { nextTick, ref } from 'vue'

const useAsyncData = vi.hoisted(() => vi.fn())
const useApiClient = vi.hoisted(() => vi.fn())
const syncAuthorization = vi.hoisted(() => vi.fn())
const bootstrapFetch = vi.hoisted(() => vi.fn())

vi.mock('../../../../app/composables/useApiClient', () => ({
  useApiClient
}))

vi.mock('../../../../app/composables/useAuthorizationCache', () => ({
  useAuthorizationCache: () => ({
    syncAuthorization
  })
}))

describe('useAccountBootstrap', () => {
  let currentNuxtApp: object

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
    useAsyncData.mockReset()
    useApiClient.mockReset()
    syncAuthorization.mockReset()
    bootstrapFetch.mockReset()

    useApiClient.mockReturnValue(bootstrapFetch)
    currentNuxtApp = {}

    const data = ref<typeof actor | null>(null)
    const error = ref<Error | null>(null)
    const status = ref<string>('pending')
    bootstrapFetch.mockImplementation(async () => ({
      data: {
        actor
      }
    }))
    let bootstrapHandler: ((nuxtApp: unknown, context: { signal: AbortSignal }) => Promise<typeof actor>) | null = null
    let pendingBootstrap: Promise<void> | null = null
    const refresh = vi.fn(async () => {
      if (status.value === 'success') {
        return
      }

      pendingBootstrap ??= (async () => {
        data.value = await bootstrapHandler!({}, {
          signal: new AbortController().signal
        })
        status.value = 'success'
      })()

      await pendingBootstrap
      pendingBootstrap = null
    })

    useAsyncData.mockImplementation((_key, handler) => {
      bootstrapHandler ??= handler

      return {
        data,
        error,
        status,
        refresh,
        clear: vi.fn()
      }
    })

    vi.stubGlobal('useNuxtApp', () => currentNuxtApp)
    vi.stubGlobal('useAsyncData', useAsyncData)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('shares the keyed deferred bootstrap contract across consumers', async () => {
    const { useAccountBootstrap } = await import('../../../../app/composables/useAccountBootstrap')

    const first = useAccountBootstrap()
    const second = useAccountBootstrap()

    expect(useAsyncData.mock.calls).toHaveLength(2)
    expect(useAsyncData.mock.calls.map(([key]) => key)).toEqual([
      'session-actor',
      'session-actor'
    ])
    expect(useAsyncData.mock.calls[0]?.[2]).toMatchObject({
      dedupe: 'defer',
      lazy: false,
      server: false
    })
    await Promise.all([first.ensureLoaded(), second.ensureLoaded()])

    expect(first.actor.value).toEqual(actor)
    expect(bootstrapFetch).toHaveBeenCalledTimes(1)
    expect((useAsyncData.mock.results[0]?.value as { refresh: ReturnType<typeof vi.fn> }).refresh).toHaveBeenCalledTimes(1)
    expect(first.isReady.value).toBe(true)
    expect(second.isReady.value).toBe(true)
    expect(first.capabilities.value).toEqual({
      canAccessAdminDashboard: true,
      canAccessJudgeDashboard: true,
      canAccessPlatformSettings: false,
      canAccessStaffDashboard: true,
      canCreateEvent: true
    })
  })

  test('synchronizes authorization changes through the shared cache boundary', async () => {
    const { useAccountBootstrap } = await import('../../../../app/composables/useAccountBootstrap')
    const session = useAccountBootstrap()

    await session.ensureLoaded()
    expect(syncAuthorization).toHaveBeenCalled()

    const changedActor = {
      ...actor,
      hasAcceptedCurrentPlatformDocuments: false
    }
    const sessionRequest = useAsyncData.mock.results[0]?.value as { data: typeof session.actor }
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
    const { useAccountBootstrap } = await import('../../../../app/composables/useAccountBootstrap')
    const session = useAccountBootstrap()

    await session.ensureLoaded()

    expect(useAsyncData.mock.calls[0]?.[2]).not.toHaveProperty('watch')
    expect((useAsyncData.mock.results[0]?.value as { refresh: ReturnType<typeof vi.fn> }).refresh).toHaveBeenCalledTimes(1)
  })

  test('marks readiness only after the session response and clears it with the bootstrap', async () => {
    const { useAccountBootstrap } = await import('../../../../app/composables/useAccountBootstrap')
    const session = useAccountBootstrap()

    expect(session.isReady.value).toBe(false)
    await session.ensureLoaded()
    expect(session.isReady.value).toBe(true)

    session.clear()
    expect(session.isReady.value).toBe(false)
  })

  test('does not use serialized readiness for a fresh Nuxt app instance', async () => {
    const serializedReadiness = vi.fn(() => ref(true))
    vi.stubGlobal('useState', serializedReadiness)

    const { useAccountBootstrap } = await import('../../../../app/composables/useAccountBootstrap')
    const first = useAccountBootstrap()
    await first.ensureLoaded()
    expect(first.isReady.value).toBe(true)

    currentNuxtApp = {}
    const fresh = useAccountBootstrap()

    expect(fresh.isReady.value).toBe(false)
    expect(serializedReadiness).not.toHaveBeenCalled()
  })

  test('joins one refresh while an aborted consumer stops waiting', async () => {
    let releaseFetch!: () => void
    bootstrapFetch.mockImplementation(() => new Promise((resolve) => {
      releaseFetch = () => resolve({ data: { actor } })
    }))

    const { useAccountBootstrap } = await import('../../../../app/composables/useAccountBootstrap')
    const first = useAccountBootstrap()
    const second = useAccountBootstrap()
    const controller = new AbortController()
    const aborted = first.ensureLoaded(controller.signal)
    const shared = second.ensureLoaded()

    await Promise.resolve()
    controller.abort()

    await expect(aborted).rejects.toMatchObject({ name: 'AbortError' })
    expect(bootstrapFetch).toHaveBeenCalledTimes(1)

    releaseFetch()
    await expect(shared).resolves.toBeUndefined()
    expect(first.isReady.value).toBe(true)
  })

  test('loads the shared session endpoint when a static shell has no SSR Auth0 state', async () => {
    const apiFetch = vi.fn(async () => ({
      data: {
        actor
      }
    }))
    useApiClient.mockReturnValue(apiFetch)
    const { useAccountBootstrap } = await import('../../../../app/composables/useAccountBootstrap')
    const session = useAccountBootstrap()
    const [, handler, options] = useAsyncData.mock.calls[0] as [
      string,
      (nuxtApp: unknown, context: { signal: AbortSignal }) => Promise<typeof actor>,
      { server: boolean }
    ]

    await expect(handler({}, {
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
