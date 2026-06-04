import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../../server/http/api-error'
import {
  eventFeedbackQuestionIds,
  getEventFeedbackQuestions
} from '../../../../../shared/domains/events/feedback'
import {
  assertEventFeedbackAvailable,
  buildEventFeedbackInsertValues,
  createEventFeedbackBodySchema,
  normalizeEventFeedbackComment
} from '../../../../../server/domains/events/feedback'

describe('event feedback utilities', () => {
  const validPayload = {
    foodRating: 5,
    staffRating: 4,
    organizationRating: 4,
    platformRating: null,
    judgesRating: 4,
    venueRating: 5,
    participantsCommunityRating: 5,
    communicationBeforeRating: 4,
    communicationDuringRating: 4,
    rulesFairnessRating: 5,
    overallExperienceRating: 5,
    schedulePacingRating: 4,
    technicalSetupRating: 3,
    safetyAccessibilityInclusionRating: 5,
    outcomesRating: 4,
    comment: '  Great event.  '
  }

  test('accepts the canonical feedback payload shape', () => {
    expect(createEventFeedbackBodySchema.parse(validPayload)).toEqual({
      ...validPayload,
      comment: 'Great event.'
    })
  })

  test('selects participant-facing feedback questions by event type', () => {
    expect(getEventFeedbackQuestions('hackathon').map(question => question.id)).toEqual(eventFeedbackQuestionIds)
    expect(getEventFeedbackQuestions('hackathon').find(question => question.id === 'judgesRating')).toMatchObject({
      label: 'Judging Process'
    })
    expect(getEventFeedbackQuestions('meetup').find(question => question.id === 'judgesRating')).toMatchObject({
      label: 'Talks And Sessions'
    })
    expect(getEventFeedbackQuestions('build').find(question => question.id === 'judgesRating')).toMatchObject({
      label: 'Mentor And Expert Support'
    })
  })

  test('rejects ratings outside the shared 1 to 5 scale when a question is rated', () => {
    expect(() => createEventFeedbackBodySchema.parse({
      ...validPayload,
      platformRating: 6
    })).toThrow()
  })

  test('preserves explicit not-applicable values as null for persistence', () => {
    expect(buildEventFeedbackInsertValues('event_1', {
      ...validPayload,
      comment: 'Still useful.'
    }).platformRating).toBeNull()
  })

  test('normalizes blank feedback comments to null for persistence', () => {
    expect(normalizeEventFeedbackComment('   ')).toBeNull()
    expect(buildEventFeedbackInsertValues('event_1', {
      ...validPayload,
      comment: '   '
    }).comment).toBeNull()
  })

  test('allows feedback only after the event is completed', () => {
    expect(() => assertEventFeedbackAvailable({
      id: 'event_1',
      state: 'winners_announced'
    })).toThrow(ApiError)

    expect(() => assertEventFeedbackAvailable({
      id: 'event_1',
      state: 'completed'
    })).not.toThrow()
  })
})
