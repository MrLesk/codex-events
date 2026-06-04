import { z } from 'zod'

import type {
  EventFeedbackEventType,
  EventFeedbackQuestionId,
  EventFeedbackSummary
} from '#shared/domains/events/feedback'

import { desc, eq } from 'drizzle-orm'

import {
  eventFeedbackQuestionIds,
  getEventFeedbackQuestions,
  eventFeedbackRatingValues
} from '#shared/domains/events/feedback'
import type { EventAuthorization } from '#server/auth/authorization'
import type { AppDatabase } from '#server/database/client'
import type { eventStates } from '#server/database/schema'
import { eventFeedback } from '#server/database/schema'
import { ApiError } from '#server/http/api-error'
import { assertAllowedState } from '#server/domains/lifecycle-guard'

export const eventFeedbackCommentMaxLength = 4000

const eventFeedbackRatingFieldSchema = z.union([
  z.null(),
  z.coerce.number().int().min(1).max(5)
])

const eventFeedbackRatingShape = Object.fromEntries(
  eventFeedbackQuestionIds.map(questionId => [questionId, eventFeedbackRatingFieldSchema])
) as Record<EventFeedbackQuestionId, typeof eventFeedbackRatingFieldSchema>

export const createEventFeedbackBodySchema = z.object({
  ...eventFeedbackRatingShape,
  comment: z.string().trim().max(eventFeedbackCommentMaxLength).optional().default('')
})

export type EventFeedbackSubmissionInput = z.infer<typeof createEventFeedbackBodySchema>
export type EventFeedbackRecord = typeof eventFeedback.$inferSelect

export function assertEventFeedbackAvailable(event: {
  id: string
  state: (typeof eventStates)[number]
}) {
  assertAllowedState(event.state, ['completed'], {
    code: 'event_feedback_unavailable',
    message: 'Event feedback is only available after the event is completed.',
    details: {
      eventId: event.id
    }
  })
}

export function normalizeEventFeedbackComment(value: string | null | undefined) {
  const normalizedValue = value?.trim() ?? ''
  return normalizedValue.length > 0 ? normalizedValue : null
}

export function buildEventFeedbackInsertValues(
  eventId: string,
  input: EventFeedbackSubmissionInput
): typeof eventFeedback.$inferInsert {
  return {
    eventId,
    ...input,
    comment: normalizeEventFeedbackComment(input.comment)
  }
}

export async function createEventFeedback(
  database: AppDatabase,
  eventId: string,
  input: EventFeedbackSubmissionInput
) {
  const values = buildEventFeedbackInsertValues(eventId, input)

  await database.insert(eventFeedback).values(values)
}

export function assertEventFeedbackResultsAccess(authorization: EventAuthorization) {
  if (authorization.canViewParticipantsAndTeams || authorization.canReviewThroughAssignment) {
    return
  }

  throw new ApiError({
    statusCode: 403,
    code: 'event_feedback_results_access_denied',
    message: 'This operation requires judge, staff, or event admin access.',
    details: {
      eventId: authorization.eventId
    }
  })
}

export async function getEventFeedbackSummary(
  database: AppDatabase,
  eventId: string,
  eventType: EventFeedbackEventType
): Promise<EventFeedbackSummary> {
  const rows = await database.query.eventFeedback.findMany({
    where: eq(eventFeedback.eventId, eventId),
    orderBy: [desc(eventFeedback.createdAt), desc(eventFeedback.id)]
  })
  const feedbackQuestions = getEventFeedbackQuestions(eventType)

  return {
    responseCount: rows.length,
    questionSummaries: feedbackQuestions.map((question) => {
      const ratingCounts = Object.fromEntries(
        eventFeedbackRatingValues.map(rating => [rating, 0])
      ) as Record<(typeof eventFeedbackRatingValues)[number], number>
      let ratingTotal = 0
      let ratedResponseCount = 0
      let notApplicableCount = 0

      for (const row of rows) {
        const rating = row[question.id]

        if (rating === null) {
          notApplicableCount += 1
          continue
        }

        ratingCounts[rating as (typeof eventFeedbackRatingValues)[number]] += 1
        ratingTotal += rating
        ratedResponseCount += 1
      }

      return {
        ...question,
        averageRating: ratedResponseCount > 0 ? Number((ratingTotal / ratedResponseCount).toFixed(2)) : null,
        responseCount: rows.length,
        ratedResponseCount,
        notApplicableCount,
        ratingCounts
      }
    }),
    comments: rows
      .filter((row): row is EventFeedbackRecord & { comment: string } => Boolean(row.comment))
      .map(row => ({
        id: row.id,
        comment: row.comment,
        createdAt: row.createdAt
      }))
  }
}
