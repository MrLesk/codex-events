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
      },
      {
        path: '/api/admin/events/event-1',
        cacheStatus: 'HIT',
        age: null
      },
      {
        path: '/api/platform-settings/current',
        cacheStatus: 'MISS',
        age: '3'
      },
      {
        path: '/api/prize-redemptions/me',
        cacheStatus: 'HIT',
        age: '7'
      },
      {
        path: '/api/_nuxt_icon/lucide.json',
        cacheStatus: 'HIT',
        age: '1356'
      },
      {
        path: '/api/_nuxt_other/lucide.json',
        cacheStatus: 'HIT',
        age: null
      }
    ])

    expect(violations.map(record => record.path)).toEqual([
      '/api/session',
      '/api/account/overview',
      '/api/admin/events/event-1',
      '/api/platform-settings/current',
      '/api/prize-redemptions/me',
      '/api/_nuxt_other/lucide.json'
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
