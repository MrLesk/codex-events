import { describe, expect, test } from 'vitest'

import { protectedApiCachePolicyViolations } from '../../bdd/support/account-event-workspace-topology'

describe('account workspace cache instrumentation', () => {
  test('rejects HIT and Age evidence for protected API responses', () => {
    const violations = protectedApiCachePolicyViolations([
      {
        path: '/api/session',
        cacheStatus: 'HIT',
        age: null
      },
      {
        path: '/api/account/overview',
        cacheStatus: 'MISS',
        age: '12'
      },
      {
        path: '/api/events/event-1/operations',
        cacheStatus: 'BYPASS',
        age: null
      }
    ])

    expect(violations.map(record => record.path)).toEqual([
      '/api/session',
      '/api/account/overview'
    ])
  })

  test('does not reject valid public/versioned edge cache evidence', () => {
    const violations = protectedApiCachePolicyViolations([
      {
        path: '/api/public/events/codex-spring',
        cacheStatus: 'HIT',
        age: '30'
      },
      {
        path: '/api/public/events/codex-spring/images/background',
        cacheStatus: 'MISS',
        age: null
      }
    ])

    expect(violations).toEqual([])
  })
})
