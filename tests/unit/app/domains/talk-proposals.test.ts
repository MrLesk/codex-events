import { describe, expect, test } from 'vitest'

import {
  createTalkProposalAnswers,
  isTalkProposalWindowOpen,
  talkProposalFormSchema,
  talkProposalStatusLabels,
  validateTalkProposalSubmission
} from '../../../../app/domains/talk-proposals'

describe('talk proposal workspace contracts', () => {
  test('accepts participant content with an optional HTTP(S) demo or slides URL', () => {
    expect(talkProposalFormSchema.safeParse({
      title: 'Building reliable agents',
      abstract: 'A practical field guide.',
      demoOrSlidesUrl: 'https://example.com/slides',
      questionSetRevision: 0,
      answers: []
    }).success).toBe(true)
    expect(talkProposalFormSchema.safeParse({
      title: 'Building reliable agents',
      abstract: 'A practical field guide.',
      demoOrSlidesUrl: 'file:///tmp/slides.pdf',
      questionSetRevision: 0,
      answers: []
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

  test('initializes configured answers while preserving values for unchanged questions', () => {
    expect(createTalkProposalAnswers([
      { id: 'audience', type: 'short_text', prompt: 'Who is this for?', required: true, options: [] },
      { id: 'recording', type: 'acknowledgement', prompt: 'I agree to recording.', required: true, options: [] }
    ], [
      { questionId: 'audience', value: 'Agent builders' },
      { questionId: 'removed', value: 'Old answer' }
    ])).toEqual([
      { questionId: 'audience', value: 'Agent builders' },
      { questionId: 'recording', value: false }
    ])
  })

  test('validates standard and configured proposal fields as one submission', () => {
    const questions = [
      { id: 'format', type: 'single_choice' as const, prompt: 'Choose a format', required: true, options: ['Talk', 'Demo'] },
      { id: 'recording', type: 'acknowledgement' as const, prompt: 'I agree to recording.', required: true, options: [] }
    ]

    const missing = validateTalkProposalSubmission({
      title: '',
      abstract: '',
      demoOrSlidesUrl: '',
      questionSetRevision: 2,
      answers: createTalkProposalAnswers(questions)
    }, questions)

    expect(missing).toMatchObject({
      isValid: false,
      missingRequiredItemCount: 4,
      invalidFieldCount: 0
    })
    expect(missing.errors.questions).toEqual({
      format: 'Answer this required question before submitting.',
      recording: 'Confirm this acknowledgment before submitting.'
    })

    expect(validateTalkProposalSubmission({
      title: 'Reliable agent demos',
      abstract: 'How to build a demo that survives a live audience.',
      demoOrSlidesUrl: 'https://example.com/slides',
      questionSetRevision: 2,
      answers: [
        { questionId: 'format', value: 'Demo' },
        { questionId: 'recording', value: true }
      ]
    }, questions)).toMatchObject({
      isValid: true,
      missingRequiredItemCount: 0,
      invalidFieldCount: 0
    })
  })
})
