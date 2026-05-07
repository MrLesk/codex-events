import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const useApiResponse = vi.hoisted(() => vi.fn())

function createComputed<T>(getter: () => T) {
  return {
    get value() {
      return getter()
    }
  }
}

describe('usePlatformLegalSettings', () => {
  beforeEach(() => {
    vi.resetModules()
    useApiResponse.mockReset()
    vi.stubGlobal('useApiResponse', useApiResponse)
    vi.stubGlobal('computed', createComputed as typeof computed)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('derives the current platform legal settings from async data state', async () => {
    const settings = {
      id: 'default',
      operatorName: 'Example Operator',
      operatorAddress: '1 Example Street',
      supportEmail: 'support@example.com',
      privacyEmail: 'privacy@example.com',
      legalContactLanguages: 'English',
      businessPurpose: 'Running hackathons.',
      editorialLine: 'Hackathon information.',
      imprintContent: 'Example imprint.',
      createdAt: '2026-05-06T12:00:00.000Z',
      updatedAt: '2026-05-06T12:00:00.000Z'
    }
    const request = {
      data: { value: settings },
      status: { value: 'success' },
      error: { value: null },
      refresh: vi.fn(),
      clear: vi.fn()
    }

    useApiResponse.mockReturnValue(request)

    const { usePlatformLegalSettings } = await import('../../../../app/composables/usePlatformLegalSettings')
    const result = usePlatformLegalSettings()

    expect(useApiResponse).toHaveBeenCalledTimes(1)
    expect(useApiResponse).toHaveBeenCalledWith('current-platform-legal-settings', '/api/platform-legal-settings/current', {
      default: expect.any(Function)
    })
    expect(result.settings.value).toEqual(settings)
    expect(result.status.value).toBe('success')
  })
})
