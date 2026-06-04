import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const useApiResponse = vi.hoisted(() => vi.fn())

function createComputed<T>(getter: () => T) {
  return {
    get value() {
      return getter()
    }
  }
}

describe('usePlatformSettings', () => {
  beforeEach(() => {
    vi.resetModules()
    useApiResponse.mockReset()
    vi.stubGlobal('useApiResponse', useApiResponse)
    vi.stubGlobal('computed', createComputed as typeof computed)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('derives the current platform settings from async data state', async () => {
    const settings = {
      id: 'default',
      defaultEventBackgroundImageUrl: 'https://example.com/default-background.png',
      createdAt: '2026-06-04T12:00:00.000Z',
      updatedAt: '2026-06-04T12:00:00.000Z'
    }
    const request = {
      data: { value: settings },
      status: { value: 'success' },
      error: { value: null },
      refresh: vi.fn(),
      clear: vi.fn()
    }

    useApiResponse.mockReturnValue(request)

    const { usePlatformSettings } = await import('../../../../app/composables/usePlatformSettings')
    const result = usePlatformSettings()

    expect(useApiResponse).toHaveBeenCalledTimes(1)
    expect(useApiResponse).toHaveBeenCalledWith('current-platform-settings', '/api/platform-settings/current', {
      default: expect.any(Function)
    })
    expect(result.settings.value).toEqual(settings)
    expect(result.status.value).toBe('success')
  })
})
