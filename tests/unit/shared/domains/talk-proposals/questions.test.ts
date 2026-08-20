import { describe, expect, it } from 'vitest'

import {
  getTalkProposalAnswerIssues,
  talkProposalAnswersSchema,
  talkProposalQuestionsSchema
} from '../../../../../shared/domains/talk-proposals/questions'

const referenceQuestions = [
  { id: 'phone', type: 'short_text', prompt: 'Phone number', required: true, options: [] },
  {
    id: 'format',
    type: 'single_choice',
    prompt: 'How ready is the live demo?',
    required: true,
    options: ['Fully working', 'Mostly working with backup']
  },
  {
    id: 'rules',
    type: 'acknowledgement',
    prompt: 'I understand the format.',
    required: true,
    options: []
  }
] as const

describe('Talk proposal questions', () => {
  it('parses supported ordered question definitions', () => {
    expect(talkProposalQuestionsSchema.parse(referenceQuestions)).toEqual(referenceQuestions)
  })

  it('requires unique IDs and valid single-choice options', () => {
    expect(talkProposalQuestionsSchema.safeParse([
      { ...referenceQuestions[0] },
      { ...referenceQuestions[0] }
    ]).success).toBe(false)
    expect(talkProposalQuestionsSchema.safeParse([
      { id: 'format', type: 'single_choice', prompt: 'Format', required: false, options: ['Same', 'Same'] }
    ]).success).toBe(false)
  })

  it('requires acknowledgments to be configured as required', () => {
    expect(talkProposalQuestionsSchema.safeParse([
      { id: 'rules', type: 'acknowledgement', prompt: 'Confirm', required: false, options: [] }
    ]).success).toBe(false)
  })

  it('accepts incomplete drafts but enforces required answers on submission', () => {
    const questions = talkProposalQuestionsSchema.parse(referenceQuestions)
    const draftAnswers = talkProposalAnswersSchema.parse([
      { questionId: 'phone', value: '' },
      { questionId: 'format', value: '' },
      { questionId: 'rules', value: false }
    ])

    expect(getTalkProposalAnswerIssues(questions, draftAnswers, false)).toEqual([])
    expect(getTalkProposalAnswerIssues(questions, draftAnswers, true).map(issue => issue.questionId)).toEqual([
      'phone',
      'format',
      'rules'
    ])
  })

  it('rejects unknown questions, invalid choices, and mismatched answer types', () => {
    const questions = talkProposalQuestionsSchema.parse(referenceQuestions)
    const answers = talkProposalAnswersSchema.parse([
      { questionId: 'unknown', value: 'value' },
      { questionId: 'phone', value: false },
      { questionId: 'format', value: 'Recorded only' },
      { questionId: 'rules', value: 'yes' }
    ])

    expect(getTalkProposalAnswerIssues(questions, answers, false).map(issue => issue.questionId)).toEqual([
      'unknown',
      'phone',
      'format',
      'rules'
    ])
  })
})
