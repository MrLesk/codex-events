import { describe, expect, test } from 'vitest'

import { apiData, apiList } from '../../../../server/http/api-response'

describe('api response helpers', () => {
  test('wraps single-resource responses in a top-level data object', () => {
    expect(apiData({ ok: true })).toEqual({
      data: { ok: true }
    })
  })

  test('wraps list responses with data and meta objects', () => {
    expect(apiList([{ id: '1' }], { page: 1, pageSize: 20, total: 1 })).toEqual({
      data: [{ id: '1' }],
      meta: { page: 1, pageSize: 20, total: 1 }
    })
  })
})
