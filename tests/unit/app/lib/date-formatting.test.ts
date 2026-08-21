import { describe, expect, test } from 'vitest'

import { formatLocalTime, formatTimestamp } from '../../../../app/lib/date-formatting'

describe('date formatting utilities', () => {
  test('formats timestamps with the shared Intl date-time formatter', () => {
    const value = '2026-04-03T20:09:00.930Z'

    expect(formatTimestamp(value)).toBe(new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(value)))
  })

  test('formats local datetime values with an explicit AM/PM marker', () => {
    expect(formatLocalTime('2026-05-09T23:00')).toBe('11:00 PM')
    expect(formatLocalTime('2026-05-09T00:05')).toBe('12:05 AM')
  })

  test('returns the provided fallback when the timestamp is missing', () => {
    expect(formatTimestamp(null, 'Unavailable')).toBe('Unavailable')
  })

  test('returns the provided fallback when the timestamp is invalid', () => {
    expect(formatTimestamp('not-a-date', 'Unavailable')).toBe('Unavailable')
    expect(formatLocalTime('not-a-date', 'Unavailable')).toBe('Unavailable')
  })
})
