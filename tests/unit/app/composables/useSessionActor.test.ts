import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { computed, ref } from 'vue'

const useApiData = vi.hoisted(() => vi.fn())

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

    const data = ref<typeof actor | null>(null)
    const error = ref<Error | null>(null)
    const status = ref<string>('pending')
    const refresh = vi.fn(async () => {
      data.value = actor
      status.value = 'success'
    })

    useApiData.mockReturnValue({
      data,
      error,
      status,
      refresh,
      clear: vi.fn()
    })

    vi.stubGlobal('computed', computed)
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
    expect(first.capabilities.value).toEqual({
      canAccessAdminDashboard: true,
      canAccessJudgeDashboard: true,
      canAccessPlatformSettings: false,
      canAccessStaffDashboard: true,
      canCreateEvent: true
    })
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
