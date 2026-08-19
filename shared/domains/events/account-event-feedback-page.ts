import { z } from 'zod'

import { eventFeedbackQuestionIds } from './feedback'

const ratingDistributionSchema = z.object({
  1: z.number().int().nonnegative(),
  2: z.number().int().nonnegative(),
  3: z.number().int().nonnegative(),
  4: z.number().int().nonnegative(),
  5: z.number().int().nonnegative()
})

const feedbackSummarySchema = z.object({
  responseCount: z.number().int().nonnegative(),
  questionSummaries: z.array(z.object({
    id: z.enum(eventFeedbackQuestionIds),
    label: z.string(),
    prompt: z.string(),
    averageRating: z.number().nullable(),
    responseCount: z.number().int().nonnegative(),
    ratedResponseCount: z.number().int().nonnegative(),
    notApplicableCount: z.number().int().nonnegative(),
    ratingCounts: ratingDistributionSchema
  })),
  comments: z.array(z.object({
    id: z.string(),
    comment: z.string(),
    createdAt: z.string()
  }))
})

export const accountEventFeedbackPageSchema = z.object({
  summary: feedbackSummarySchema
})

export type AccountEventFeedbackSummary = z.infer<typeof feedbackSummarySchema>
export type AccountEventFeedbackPage = z.infer<typeof accountEventFeedbackPageSchema>
