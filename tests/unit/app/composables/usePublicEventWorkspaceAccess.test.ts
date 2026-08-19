import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { computed, ref } from 'vue'

const useApiData = vi.hoisted(() => vi.fn())
const useSessionActor = vi.hoisted(() => vi.fn())

vi.mock('../../../../app/composables/useSessionActor', () => ({
  useSessionActor
}))

describe('usePublicEventWorkspaceAccess', () => {
  const actor = ref({
    kind: 'platform_user' as const,
    hasAcceptedCurrentPlatformDocuments: true,
    platformUser: {
      id: 'platform-admin'
    }
  })

  beforeEach(() => {
    vi.resetModules()
    useApiData.mockReset()
    useSessionActor.mockReset()
    useSessionActor.mockReturnValue({ actor })
    useApiData.mockReturnValue({
      data: ref(true)
    })
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('toValue', (value: unknown) =>
      typeof value === 'function'
        ? (value as () => unknown)()
        : value
    )
    vi.stubGlobal('useApiData', useApiData)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('keeps account access client-only while sharing the session actor', async () => {
    const { usePublicEventWorkspaceAccess } = await import('../../../../app/composables/usePublicEventWorkspaceAccess')
    const access = usePublicEventWorkspaceAccess('e2e-fixture-event')
    const [, handler, options] = useApiData.mock.calls[0] as [
      () => string,
      (context: { apiFetch: typeof vi.fn, signal: AbortSignal }) => Promise<boolean>,
      { server: boolean }
    ]
    const apiFetch = vi.fn(async () => ({
      data: {
        current: [{ slug: 'e2e-fixture-event' }],
        past: []
      }
    }))

    expect(options.server).toBe(false)
    expect((access.hasEventWorkspaceAccess as { value: boolean }).value).toBe(true)
    await expect(handler({
      apiFetch,
      signal: new AbortController().signal
    })).resolves.toBe(true)
    expect(apiFetch).toHaveBeenCalledWith('/api/account/events', {
      signal: expect.any(AbortSignal)
    })
  })
})
