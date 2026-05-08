import { describe, expect, test } from 'vitest'

import {
  buildAccountEventJudgingTabHref,
  normalizeJudgeAssignmentIdQueryValue
} from '../../../../../app/domains/judging/query'

describe('judging query helpers', () => {
  test('normalizes the assignment query to a trimmed string value', () => {
    expect(normalizeJudgeAssignmentIdQueryValue(' assignment_123 ')).toBe('assignment_123')
    expect(normalizeJudgeAssignmentIdQueryValue(['assignment_456', 'ignored'])).toBe('assignment_456')
    expect(normalizeJudgeAssignmentIdQueryValue('')).toBeNull()
    expect(normalizeJudgeAssignmentIdQueryValue(null)).toBeNull()
  })

  test('builds account judging tab hrefs with an optional assignment id', () => {
    expect(buildAccountEventJudgingTabHref('codex-vienna-2026-04-18')).toBe(
      '/account/events/codex-vienna-2026-04-18?tab=judging'
    )

    expect(buildAccountEventJudgingTabHref('codex-vienna-2026-04-18', 'assignment_123')).toBe(
      '/account/events/codex-vienna-2026-04-18?tab=judging&assignment=assignment_123'
    )
  })
})
