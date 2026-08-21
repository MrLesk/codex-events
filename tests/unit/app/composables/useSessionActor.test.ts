import { beforeEach, describe, expect, test, vi } from 'vitest'

const useAccountBootstrap = vi.hoisted(() => vi.fn())

vi.mock('../../../../app/composables/useAccountBootstrap', () => ({
  useAccountBootstrap
}))

describe('useSessionActor', () => {
  beforeEach(() => {
    vi.resetModules()
    useAccountBootstrap.mockReset()
  })

  test('exposes the shared account bootstrap as the session actor contract', async () => {
    const bootstrap = {
      actor: { value: { kind: 'anonymous' } },
      capabilities: { value: {} },
      ensureLoaded: vi.fn(),
      isReady: { value: false },
      status: { value: 'pending' }
    }
    useAccountBootstrap.mockReturnValue(bootstrap)

    const { useSessionActor } = await import('../../../../app/composables/useSessionActor')

    expect(useSessionActor()).toBe(bootstrap)
    expect(useAccountBootstrap).toHaveBeenCalledOnce()
  })
})
