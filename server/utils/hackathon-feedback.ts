import { z } from 'zod'

import type {
  HackathonFeedbackQuestionId,
  HackathonFeedbackSummary
} from '../../shared/hackathon-feedback'

import { desc, eq } from 'drizzle-orm'

import {
  hackathonFeedbackQuestionIds,
  hackathonFeedbackQuestions,
  hackathonFeedbackRatingValues
} from '../../shared/hackathon-feedback'
import type { HackathonAuthorization } from '../auth/authorization'
import type { AppDatabase } from '../database/client'
import type { hackathonStates } from '../database/schema'
import { hackathonFeedback } from '../database/schema'
import { ApiError } from './api-error'
import { assertAllowedState } from './lifecycle-guard'

export const hackathonFeedbackCommentMaxLength = 4000

const hackathonFeedbackRatingFieldSchema = z.coerce.number().int().min(1).max(5)

const hackathonFeedbackRatingShape = Object.fromEntries(
  hackathonFeedbackQuestionIds.map(questionId => [questionId, hackathonFeedbackRatingFieldSchema])
) as Record<HackathonFeedbackQuestionId, typeof hackathonFeedbackRatingFieldSchema>

export const createHackathonFeedbackBodySchema = z.object({
  ...hackathonFeedbackRatingShape,
  comment: z.string().trim().max(hackathonFeedbackCommentMaxLength).optional().default('')
})

export type HackathonFeedbackSubmissionInput = z.infer<typeof createHackathonFeedbackBodySchema>
export type HackathonFeedbackRecord = typeof hackathonFeedback.$inferSelect

export function assertHackathonFeedbackAvailable(hackathon: {
  id: string
  state: (typeof hackathonStates)[number]
}) {
  assertAllowedState(hackathon.state, ['completed'], {
    code: 'hackathon_feedback_unavailable',
    message: 'Hackathon feedback is only available after the hackathon is completed.',
    details: {
      hackathonId: hackathon.id
    }
  })
}

export function normalizeHackathonFeedbackComment(value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? ''
  return normalizedValue.length > 0 ? normalizedValue : null
}

export function buildHackathonFeedbackInsertValues(
  hackathonId: string,
  input: HackathonFeedbackSubmissionInput
): typeof hackathonFeedback.$inferInsert {
  return {
    hackathonId,
    ...input,
    comment: normalizeHackathonFeedbackComment(input.comment)
  }
}

export async function createHackathonFeedback(
  database: AppDatabase,
  hackathonId: string,
  input: HackathonFeedbackSubmissionInput
) {
  const values = buildHackathonFeedbackInsertValues(hackathonId, input)

  await database.insert(hackathonFeedback).values(values)
}

export function assertHackathonFeedbackResultsAccess(authorization: HackathonAuthorization) {
  if (authorization.canViewParticipantsAndTeams || authorization.canReviewThroughAssignment) {
    return
  }

  throw new ApiError({
    statusCode: 403,
    code: 'hackathon_feedback_results_access_denied',
    message: 'This operation requires judge, staff, or hackathon admin access.',
    details: {
      hackathonId: authorization.hackathonId
    }
  })
}

export async function getHackathonFeedbackSummary(
  database: AppDatabase,
  hackathonId: string
): Promise<HackathonFeedbackSummary> {
  const rows = await database.query.hackathonFeedback.findMany({
    where: eq(hackathonFeedback.hackathonId, hackathonId),
    orderBy: [desc(hackathonFeedback.createdAt), desc(hackathonFeedback.id)]
  })

  return {
    responseCount: rows.length,
    questionSummaries: hackathonFeedbackQuestions.map((question) => {
      const ratingCounts = Object.fromEntries(
        hackathonFeedbackRatingValues.map(rating => [rating, 0])
      ) as Record<(typeof hackathonFeedbackRatingValues)[number], number>
      let ratingTotal = 0

      for (const row of rows) {
        const rating = row[question.id]
        ratingCounts[rating as (typeof hackathonFeedbackRatingValues)[number]] += 1
        ratingTotal += rating
      }

      return {
        ...question,
        averageRating: rows.length > 0 ? Number((ratingTotal / rows.length).toFixed(2)) : null,
        responseCount: rows.length,
        ratingCounts
      }
    }),
    comments: rows
      .filter((row): row is HackathonFeedbackRecord & { comment: string } => Boolean(row.comment))
      .map(row => ({
        id: row.id,
        comment: row.comment,
        createdAt: row.createdAt
      }))
  }
}
