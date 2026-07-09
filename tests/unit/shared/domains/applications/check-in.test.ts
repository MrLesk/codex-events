import { describe, expect, test } from 'vitest'

import {
  isApplicationEffectivelyCheckedIn,
  resolveApplicationAttendanceSource
} from '../../../../../shared/domains/applications/check-in'

describe('application check-in helpers', () => {
  test('uses the Luma check-in when no override exists', () => {
    expect(isApplicationEffectivelyCheckedIn({ checkedInAt: '2026-06-20T08:05:00.000Z', checkInOverrideStatus: null })).toBe(true)
    expect(isApplicationEffectivelyCheckedIn({ checkedInAt: null, checkInOverrideStatus: null })).toBe(false)
  })

  test('the admin override wins over the Luma check-in in both directions', () => {
    expect(isApplicationEffectivelyCheckedIn({ checkedInAt: null, checkInOverrideStatus: 'joined' })).toBe(true)
    expect(isApplicationEffectivelyCheckedIn({ checkedInAt: '2026-06-20T08:05:00.000Z', checkInOverrideStatus: 'not_joined' })).toBe(false)
  })

  test('resolves the attendance source', () => {
    expect(resolveApplicationAttendanceSource({ checkedInAt: null, checkInOverrideStatus: 'joined' })).toBe('manual')
    expect(resolveApplicationAttendanceSource({ checkedInAt: '2026-06-20T08:05:00.000Z', checkInOverrideStatus: null })).toBe('luma')
    expect(resolveApplicationAttendanceSource({
      checkedInAt: '2026-06-20T08:05:00.000Z',
      checkInSource: 'simplified_claim',
      checkInOverrideStatus: null
    })).toBe('simplified_claim')
    expect(resolveApplicationAttendanceSource({ checkedInAt: null, checkInOverrideStatus: null })).toBeNull()
  })
})
