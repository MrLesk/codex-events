import { describe, expect, test } from 'vitest'

import {
  isHackathonCreditLink,
  normalizeHackathonCreditApiError
} from '../../../../app/utils/hackathon-credits'

describe('hackathon credit helpers', () => {
  test('identifies http and https credit values as links', () => {
    expect(isHackathonCreditLink('https://redeem.example/token')).toBe(true)
    expect(isHackathonCreditLink('http://redeem.example/token')).toBe(true)
    expect(isHackathonCreditLink('CODE-123')).toBe(false)
    expect(isHackathonCreditLink('ftp://redeem.example/token')).toBe(false)
  })

  test('normalizes structured and unstructured API errors', () => {
    expect(normalizeHackathonCreditApiError({
      data: {
        error: {
          code: 'hackathon_credit_sold_out',
          message: 'No credits remain for this offer.'
        }
      }
    })).toEqual({
      code: 'hackathon_credit_sold_out',
      message: 'No credits remain for this offer.'
    })

    expect(normalizeHackathonCreditApiError(new Error('Request failed'))).toEqual({
      code: 'request_failed',
      message: 'Request failed'
    })
  })
})
