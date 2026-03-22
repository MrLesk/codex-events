import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import { assertCurrentPlatformDocument } from '../../../../server/utils/platform-documents'

describe('platform document utilities', () => {
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
