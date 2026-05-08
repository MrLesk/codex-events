export const eventFeedbackRatingValues = [1, 2, 3, 4, 5] as const

export type EventFeedbackRatingValue = (typeof eventFeedbackRatingValues)[number]
export const eventFeedbackNotApplicableValue = 'not_applicable' as const
export const eventFeedbackNotApplicableLabel = 'Not applicable'
export type EventFeedbackSelectionValue = EventFeedbackRatingValue | typeof eventFeedbackNotApplicableValue
export type EventFeedbackStoredRatingValue = EventFeedbackRatingValue | null

export const eventFeedbackQuestionIds = [
  'communicationBeforeRating',
  'organizationRating',
  'venueRating',
  'foodRating',
  'technicalSetupRating',
  'platformRating',
  'staffRating',
  'participantsCommunityRating',
  'communicationDuringRating',
  'rulesFairnessRating',
  'judgesRating',
  'schedulePacingRating',
  'safetyAccessibilityInclusionRating',
  'outcomesRating',
  'overallExperienceRating'
] as const

export type EventFeedbackQuestionId = (typeof eventFeedbackQuestionIds)[number]

export interface EventFeedbackQuestionDefinition {
  id: EventFeedbackQuestionId
  label: string
  prompt: string
}

export type EventFeedbackRatingDistribution = Record<EventFeedbackRatingValue, number>

export interface EventFeedbackQuestionSummary extends EventFeedbackQuestionDefinition {
  averageRating: number | null
  responseCount: number
  ratedResponseCount: number
  notApplicableCount: number
  ratingCounts: EventFeedbackRatingDistribution
}

export interface EventFeedbackCommentEntry {
  id: string
  comment: string
  createdAt: string
}

export interface EventFeedbackSummary {
  responseCount: number
  questionSummaries: EventFeedbackQuestionSummary[]
  comments: EventFeedbackCommentEntry[]
}

export const eventFeedbackQuestions: EventFeedbackQuestionDefinition[] = [
  {
    id: 'communicationBeforeRating',
    label: 'Communication Before The Event',
    prompt: 'How clear was the information you received before the event?'
  },
  {
    id: 'organizationRating',
    label: 'Organization',
    prompt: 'How well organized did the event feel?'
  },
  {
    id: 'venueRating',
    label: 'Venue',
    prompt: 'How was the venue?'
  },
  {
    id: 'foodRating',
    label: 'Food',
    prompt: 'How was the food?'
  },
  {
    id: 'technicalSetupRating',
    label: 'Technical Setup',
    prompt: 'How well did Wi-Fi, power, and the workspace setup support your work?'
  },
  {
    id: 'platformRating',
    label: 'Event Platform',
    prompt: 'How well did codex-events.com work during the event?'
  },
  {
    id: 'staffRating',
    label: 'Staff Support',
    prompt: 'How helpful was the staff during the event?'
  },
  {
    id: 'participantsCommunityRating',
    label: 'Team Formation And Community',
    prompt: 'How easy was it to find a team and collaborate with other participants?'
  },
  {
    id: 'communicationDuringRating',
    label: 'Communication During The Event',
    prompt: 'How clear was the communication during the event?'
  },
  {
    id: 'rulesFairnessRating',
    label: 'Event Rules',
    prompt: 'How clear and fair were the event rules?'
  },
  {
    id: 'judgesRating',
    label: 'Judging Process',
    prompt: 'How fair did the judging process feel?'
  },
  {
    id: 'schedulePacingRating',
    label: 'Schedule And Pacing',
    prompt: 'How well did the schedule and pacing work?'
  },
  {
    id: 'safetyAccessibilityInclusionRating',
    label: 'Safety And Inclusion',
    prompt: 'Did you feel welcome, safe, and able to participate fully?'
  },
  {
    id: 'outcomesRating',
    label: 'Outcomes',
    prompt: 'How valuable was the event for your goals?'
  },
  {
    id: 'overallExperienceRating',
    label: 'Overall Experience',
    prompt: 'Overall, how would you rate your experience?'
  }
]
