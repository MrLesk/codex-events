import { describe, expect, test } from 'vitest'

import {
  isTalkProposalWindowOpen,
  talkProposalFormSchema,
  talkProposalStatusLabels
} from '../../../../app/domains/talk-proposals'

describe('talk proposal workspace contracts', () => {
  test('accepts participant content with an optional HTTP(S) demo or slides URL', () => {
    expect(talkProposalFormSchema.safeParse({
      title: 'Building reliable agents',
      abstract: 'A practical field guide.',
      demoOrSlidesUrl: 'https://example.com/slides'
    }).success).toBe(true)
    expect(talkProposalFormSchema.safeParse({
      title: 'Building reliable agents',
      abstract: 'A practical field guide.',
      demoOrSlidesUrl: 'file:///tmp/slides.pdf'
    }).success).toBe(false)
  })

  test('identifies upcoming, open, and closed Call for talks windows', () => {
    expect(isTalkProposalWindowOpen('2026-03-20T12:00:00Z', '2026-03-21T12:00:00Z', Date.parse('2026-03-20T13:00:00Z'))).toBe(true)
    expect(isTalkProposalWindowOpen('2026-03-20T12:00:00Z', '2026-03-21T12:00:00Z', Date.parse('2026-03-19T13:00:00Z'))).toBe(false)
    expect(isTalkProposalWindowOpen('2026-03-20T12:00:00Z', '2026-03-21T12:00:00Z', Date.parse('2026-03-22T13:00:00Z'))).toBe(false)
  })

  test('uses participant-facing status labels', () => {
    expect(talkProposalStatusLabels).toEqual({
      draft: 'Draft',
      submitted: 'Submitted',
      withdrawn: 'Withdrawn',
      accepted: 'Accepted',
      rejected: 'Not accepted'
    })
  })
})
