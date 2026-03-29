import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const useAsyncData = vi.hoisted(() => vi.fn())

function createComputed<T>(getter: () => T) {
  return {
    get value() {
      return getter()
    }
  }
}

describe('useCurrentPlatformDocuments', () => {
  beforeEach(() => {
    vi.resetModules()
    useAsyncData.mockReset()
    vi.stubGlobal('useAsyncData', useAsyncData as typeof useAsyncData)
    vi.stubGlobal('computed', createComputed as typeof computed)
    vi.stubGlobal('$fetch', vi.fn())
    vi.stubGlobal('useFetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('derives current platform document helpers from async data state', async () => {
    const response = {
      data: {
        privacy_policy: {
          id: 'privacy',
          documentType: 'privacy_policy' as const,
          version: 3,
          title: 'Privacy Policy',
          content: 'privacy',
          publishedAt: '2026-03-28T00:00:00.000Z',
          createdAt: '2026-03-28T00:00:00.000Z'
        },
        platform_terms: {
          id: 'terms',
          documentType: 'platform_terms' as const,
          version: 5,
          title: 'Platform Terms',
          content: 'terms',
          publishedAt: '2026-03-28T00:00:00.000Z',
          createdAt: '2026-03-28T00:00:00.000Z'
        }
      }
    }
    const request = {
      data: { value: response },
      status: { value: 'success' },
      error: { value: null },
      refresh: vi.fn(),
      clear: vi.fn()
    }

    useAsyncData.mockReturnValue(request)

    const { useCurrentPlatformDocuments } = await import('../../../../app/composables/useCurrentPlatformDocuments')
    const result = useCurrentPlatformDocuments()

    expect(useAsyncData).toHaveBeenCalledTimes(1)
    expect(result.documents.value).toEqual(response.data)
    expect(result.privacyPolicyDocument.value).toEqual(response.data.privacy_policy)
    expect(result.platformTermsDocument.value).toEqual(response.data.platform_terms)
    expect(result.status.value).toBe('success')
  })
})
