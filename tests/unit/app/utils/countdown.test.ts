import { describe, expect, test } from 'vitest'

import {
  formatCountdownAccessibleLabel,
  formatCountdownCompactLabel,
  getCountdownSegments,
  resolveCountdownState
} from '../../../../app/utils/countdown'

describe('countdown utilities', () => {
  test('resolves upcoming countdown state from an absolute target time', () => {
    const state = resolveCountdownState('2026-04-14T18:19:35Z', {
      now: new Date('2026-04-12T15:15:30Z')
    })

    expect(state).toMatchObject({
      isTargetValid: true,
      phase: 'counting_down',
      remainingSeconds: ((2 * 86_400) + (3 * 3_600) + (4 * 60) + 5)
    })

    expect(state.segments).toEqual([
      expect.objectContaining({
        key: 'days',
        value: 2,
        displayValue: '02'
      }),
      expect.objectContaining({
        key: 'hours',
        value: 3,
        displayValue: '03'
      }),
      expect.objectContaining({
        key: 'minutes',
        value: 4,
        displayValue: '04'
      }),
      expect.objectContaining({
        key: 'seconds',
        value: 5,
        displayValue: '05'
      })
    ])
  })

  test('uses the requested post-target phase once the scheduled time has passed', () => {
    expect(resolveCountdownState('2026-04-12T15:15:00Z', {
      now: new Date('2026-04-12T15:15:01Z'),
      postTargetState: 'waiting'
    })).toMatchObject({
      isTargetValid: true,
      phase: 'waiting',
      remainingMs: 0,
      remainingSeconds: 0
    })

    expect(resolveCountdownState('2026-04-12T15:15:00Z', {
      now: new Date('2026-04-12T15:15:01Z'),
      postTargetState: 'expired'
    })).toMatchObject({
      isTargetValid: true,
      phase: 'expired',
      remainingMs: 0,
      remainingSeconds: 0
    })
  })

  test('formats a compact countdown label with the most relevant non-zero units', () => {
    const segments = getCountdownSegments(((2 * 86_400) + (3 * 3_600) + (4 * 60) + 5) * 1_000)

    expect(formatCountdownCompactLabel(segments)).toBe('2d 3h 4m 5s')
    expect(formatCountdownCompactLabel(segments, {
      includeSeconds: false
    })).toBe('2d 3h 4m')
    expect(formatCountdownCompactLabel(segments, {
      maxUnits: 2
    })).toBe('2d 3h')
  })

  test('formats accessible countdown labels and less-than-a-minute states', () => {
    const underOneMinuteSegments = getCountdownSegments(42_000)

    expect(formatCountdownCompactLabel(underOneMinuteSegments, {
      includeSeconds: false
    })).toBe('<1m')
    expect(formatCountdownAccessibleLabel(underOneMinuteSegments)).toBe('42 seconds')
    expect(formatCountdownAccessibleLabel(underOneMinuteSegments, {
      includeSeconds: false
    })).toBe('less than 1 minute')
  })

  test('treats invalid target values as unavailable countdowns', () => {
    expect(resolveCountdownState('not-a-date', {
      now: new Date('2026-04-12T15:15:30Z')
    })).toMatchObject({
      isTargetValid: false,
      phase: 'expired',
      remainingMs: 0,
      remainingSeconds: 0
    })
  })
})
