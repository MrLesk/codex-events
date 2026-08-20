import { z } from 'zod'

export const talkProposalQuestionTypes = [
  'short_text',
  'long_text',
  'single_choice',
  'acknowledgement'
] as const

export const talkProposalQuestionTypeSchema = z.enum(talkProposalQuestionTypes)

export const talkProposalQuestionDefinitionSchema = z.object({
  id: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
  type: talkProposalQuestionTypeSchema,
  prompt: z.string().trim().min(1).max(500),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1).max(200)).max(20).default([])
}).superRefine((question, context) => {
  if (question.type === 'single_choice') {
    if (question.options.length < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Single-choice questions need at least two choices.'
      })
    }

    if (new Set(question.options).size !== question.options.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Question choices must be unique.'
      })
    }
  } else if (question.options.length > 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['options'],
      message: 'Only single-choice questions can define choices.'
    })
  }

  if (question.type === 'acknowledgement' && !question.required) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['required'],
      message: 'Acknowledgments must be required.'
    })
  }
})

export const talkProposalQuestionsSchema = z.array(talkProposalQuestionDefinitionSchema)
  .max(20)
  .superRefine((questions, context) => {
    const ids = new Set<string>()
    for (const [index, question] of questions.entries()) {
      if (ids.has(question.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'id'],
          message: 'Question IDs must be unique.'
        })
      }
      ids.add(question.id)
    }
  })

export const talkProposalAnswerSchema = z.object({
  questionId: z.string().trim().min(1).max(64),
  value: z.union([z.string().trim().max(8000), z.boolean()])
})

export const talkProposalAnswersSchema = z.array(talkProposalAnswerSchema)
  .max(20)
  .superRefine((answers, context) => {
    const ids = new Set<string>()
    for (const [index, answer] of answers.entries()) {
      if (ids.has(answer.questionId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'questionId'],
          message: 'Each question can have only one answer.'
        })
      }
      ids.add(answer.questionId)
    }
  })

export type TalkProposalQuestionType = z.infer<typeof talkProposalQuestionTypeSchema>
export type TalkProposalQuestionDefinition = z.infer<typeof talkProposalQuestionDefinitionSchema>
export type TalkProposalAnswer = z.infer<typeof talkProposalAnswerSchema>

export interface TalkProposalAnswerIssue {
  questionId: string
  message: string
}

export function parseTalkProposalQuestionsJson(value: string) {
  return talkProposalQuestionsSchema.parse(JSON.parse(value))
}

export function parseTalkProposalAnswersJson(value: string) {
  return talkProposalAnswersSchema.parse(JSON.parse(value))
}

export function getTalkProposalAnswerIssues(
  questions: TalkProposalQuestionDefinition[],
  answers: TalkProposalAnswer[],
  requireComplete: boolean
) {
  const questionsById = new Map(questions.map(question => [question.id, question]))
  const answersById = new Map(answers.map(answer => [answer.questionId, answer]))
  const issues: TalkProposalAnswerIssue[] = []

  for (const answer of answers) {
    const question = questionsById.get(answer.questionId)
    if (!question) {
      issues.push({ questionId: answer.questionId, message: 'This question is not part of the Call for talks.' })
      continue
    }

    if (question.type === 'acknowledgement') {
      if (typeof answer.value !== 'boolean') {
        issues.push({ questionId: question.id, message: 'This acknowledgment must be checked or unchecked.' })
      }
      continue
    }

    if (typeof answer.value !== 'string') {
      issues.push({ questionId: question.id, message: 'This answer must be text.' })
      continue
    }

    if (question.type === 'short_text' && answer.value.length > 500) {
      issues.push({ questionId: question.id, message: 'This answer must be 500 characters or fewer.' })
    }

    if (question.type === 'single_choice' && answer.value !== '' && !question.options.includes(answer.value)) {
      issues.push({ questionId: question.id, message: 'Choose one of the available options.' })
    }
  }

  if (requireComplete) {
    for (const question of questions) {
      if (!question.required) continue
      const answer = answersById.get(question.id)
      const complete = question.type === 'acknowledgement'
        ? answer?.value === true
        : typeof answer?.value === 'string' && answer.value.length > 0
      if (!complete) {
        issues.push({ questionId: question.id, message: question.type === 'acknowledgement'
          ? 'Confirm this acknowledgment before submitting.'
          : 'Answer this required question before submitting.' })
      }
    }
  }

  return issues
}
