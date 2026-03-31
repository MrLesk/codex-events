import { describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertCurrentPlatformDocument,
  getCurrentPlatformDocuments
} from '../../../../server/utils/platform-documents'

describe('platform document utilities', () => {
  test('loads current platform documents with a single query', async () => {
    const findFirst = vi.fn()
    const findMany = vi.fn(async () => [
      {
        id: 'privacy_v2',
        documentType: 'privacy_policy',
        version: 2,
        title: 'Privacy Policy v2',
        content: 'Current privacy',
        publishedAt: '2026-03-02T00:00:00.000Z',
        createdAt: '2026-03-02T00:00:00.000Z'
      },
      {
        id: 'terms_v1',
        documentType: 'platform_terms',
        version: 1,
        title: 'Platform Terms v1',
        content: 'Terms',
        publishedAt: '2026-03-02T00:00:00.000Z',
        createdAt: '2026-03-02T00:00:00.000Z'
      },
      {
        id: 'privacy_v1',
        documentType: 'privacy_policy',
        version: 1,
        title: 'Privacy Policy v1',
        content: 'Old privacy',
        publishedAt: '2026-03-01T00:00:00.000Z',
        createdAt: '2026-03-01T00:00:00.000Z'
      }
    ])
    const database = {
      query: {
        platformDocuments: {
          findFirst,
          findMany
        }
      }
    } as never

    await expect(getCurrentPlatformDocuments(database)).resolves.toMatchObject({
      privacy_policy: {
        id: 'privacy_v2',
        version: 2
      },
      platform_terms: {
        id: 'terms_v1',
        version: 1
      }
    })
    expect(findMany).toHaveBeenCalledTimes(1)
    expect(findFirst).not.toHaveBeenCalled()
  })

  test('rejects outdated platform-document acceptance references', () => {
    expect(() => assertCurrentPlatformDocument(
      {
        id: 'privacy_v1',
        documentType: 'privacy_policy',
        version: 1,
        title: 'Privacy Policy v1',
        content: 'Old privacy',
        publishedAt: '2026-03-01T00:00:00.000Z',
        createdAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'privacy_v2',
        documentType: 'privacy_policy',
        version: 2,
        title: 'Privacy Policy v2',
        content: 'Current privacy',
        publishedAt: '2026-03-02T00:00:00.000Z',
        createdAt: '2026-03-02T00:00:00.000Z'
      }
    )).toThrowError(ApiError)
  })
})
