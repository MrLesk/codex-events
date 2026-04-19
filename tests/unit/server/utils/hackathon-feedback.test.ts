import { describe, expect, test } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertHackathonFeedbackAvailable,
  buildHackathonFeedbackInsertValues,
  createHackathonFeedbackBodySchema,
  normalizeHackathonFeedbackComment
} from '../../../../server/utils/hackathon-feedback'

describe('hackathon feedback utilities', () => {
  const validPayload = {
    foodRating: 5,
    staffRating: 4,
    organizationRating: 4,
    platformRating: 3,
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
    expect(createHackathonFeedbackBodySchema.parse(validPayload)).toEqual({
      ...validPayload,
      comment: 'Great event.'
    })
  })

  test('rejects ratings outside the shared 1 to 5 scale', () => {
    expect(() => createHackathonFeedbackBodySchema.parse({
      ...validPayload,
      platformRating: 6
    })).toThrow()
  })

  test('normalizes blank feedback comments to null for persistence', () => {
    expect(normalizeHackathonFeedbackComment('   ')).toBeNull()
    expect(buildHackathonFeedbackInsertValues('hackathon_1', {
      ...validPayload,
      comment: '   '
    }).comment).toBeNull()
  })

  test('allows feedback only after the hackathon is completed', () => {
    expect(() => assertHackathonFeedbackAvailable({
      id: 'hackathon_1',
      state: 'winners_announced'
    })).toThrow(ApiError)

    expect(() => assertHackathonFeedbackAvailable({
      id: 'hackathon_1',
      state: 'completed'
    })).not.toThrow()
  })
})
