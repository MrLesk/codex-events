import { describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../../../../server/http/api-error'
import {
  assertCurrentPlatformDocument,
  getCurrentPlatformDocuments,
  hasAcceptedCurrentPlatformDocuments
} from '../../../../../server/domains/platform/documents'

describe('platform document utilities', () => {
  test('loads current platform documents with one bounded query per fixed document type', async () => {
    const findFirst = vi.fn()
      .mockResolvedValueOnce({
        id: 'privacy_v2',
        documentType: 'privacy_policy',
        version: 2,
        title: 'Privacy Policy v2',
        content: 'Current privacy',
        publishedAt: '2026-03-02T00:00:00.000Z',
        createdAt: '2026-03-02T00:00:00.000Z'
      })
      .mockResolvedValueOnce({
        id: 'terms_v1',
        documentType: 'platform_terms',
        version: 1,
        title: 'Platform Terms v1',
        content: 'Terms',
        publishedAt: '2026-03-02T00:00:00.000Z',
        createdAt: '2026-03-02T00:00:00.000Z'
      })
    const database = {
      query: {
        platformDocuments: {
          findFirst,
          findMany: vi.fn()
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
    expect(findFirst).toHaveBeenCalledTimes(2)
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

  test('treats missing required current documents as not accepted', async () => {
    const select = vi.fn(() => {
      const query = {} as {
        from: ReturnType<typeof vi.fn>
        where: ReturnType<typeof vi.fn>
        get: ReturnType<typeof vi.fn>
      }
      query.from = vi.fn(() => query)
      query.where = vi.fn(() => query)
      query.get = vi.fn(async () => ({ total: 0 }))
      return query
    })
    const database = {
      select,
      query: {
        platformDocuments: {
          findFirst: vi.fn()
            .mockResolvedValueOnce({
              id: 'privacy_v1',
              documentType: 'privacy_policy',
              version: 1,
              title: 'Privacy Policy v1',
              content: 'Privacy',
              publishedAt: '2026-03-01T00:00:00.000Z',
              createdAt: '2026-03-01T00:00:00.000Z'
            })
            .mockResolvedValueOnce(undefined),
          findMany: vi.fn()
        },
        userPlatformDocumentAcceptances: {
          findMany: vi.fn()
        }
      }
    } as never

    await expect(hasAcceptedCurrentPlatformDocuments(database, 'user_1')).resolves.toBe(false)
    expect(select).toHaveBeenCalled()
  })
})
