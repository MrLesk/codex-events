export const eventFeedbackRatingValues = [1, 2, 3, 4, 5] as const

export type EventFeedbackRatingValue = (typeof eventFeedbackRatingValues)[number]
export const eventFeedbackNotApplicableValue = 'not_applicable' as const
export const eventFeedbackNotApplicableLabel = 'Not applicable'
export type EventFeedbackSelectionValue = EventFeedbackRatingValue | typeof eventFeedbackNotApplicableValue
export type EventFeedbackStoredRatingValue = EventFeedbackRatingValue | null
export type EventFeedbackEventType = 'hackathon' | 'meetup' | 'build'

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

export const eventFeedbackQuestionsByEventType = {
  hackathon: [
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
      label: 'Events Platform',
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
  ],
  meetup: [
    {
      id: 'communicationBeforeRating',
      label: 'Communication Before The Meetup',
      prompt: 'How clear was the information you received before the meetup?'
    },
    {
      id: 'organizationRating',
      label: 'Organization',
      prompt: 'How well organized did the meetup feel?'
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
      label: 'Room And AV Setup',
      prompt: 'How well did audio, screens, seating, and room setup support the meetup?'
    },
    {
      id: 'platformRating',
      label: 'Events Platform',
      prompt: 'How well did codex-events.com work before or during the meetup?'
    },
    {
      id: 'staffRating',
      label: 'Staff Support',
      prompt: 'How helpful was the staff during the meetup?'
    },
    {
      id: 'participantsCommunityRating',
      label: 'Networking And Community',
      prompt: 'How easy was it to meet people and have useful conversations?'
    },
    {
      id: 'communicationDuringRating',
      label: 'Communication During The Meetup',
      prompt: 'How clear was the communication during the meetup?'
    },
    {
      id: 'rulesFairnessRating',
      label: 'Event Expectations',
      prompt: 'How clear were the schedule, participation expectations, and onsite guidance?'
    },
    {
      id: 'judgesRating',
      label: 'Talks And Sessions',
      prompt: 'How useful were the talks, demos, discussions, or sessions you attended?'
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
      label: 'Value For Your Goals',
      prompt: 'How valuable was the meetup for what you hoped to learn or connect with?'
    },
    {
      id: 'overallExperienceRating',
      label: 'Overall Experience',
      prompt: 'Overall, how would you rate your meetup experience?'
    }
  ],
  build: [
    {
      id: 'communicationBeforeRating',
      label: 'Communication Before The Build Event',
      prompt: 'How clear was the information you received before the build event?'
    },
    {
      id: 'organizationRating',
      label: 'Organization',
      prompt: 'How well organized did the build event feel?'
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
      prompt: 'How well did Wi-Fi, power, and the workspace setup support building?'
    },
    {
      id: 'platformRating',
      label: 'Events Platform',
      prompt: 'How well did codex-events.com work during the build event?'
    },
    {
      id: 'staffRating',
      label: 'Staff Support',
      prompt: 'How helpful was the staff while you were building?'
    },
    {
      id: 'participantsCommunityRating',
      label: 'Builder Community',
      prompt: 'How easy was it to meet, collaborate with, or learn from other builders?'
    },
    {
      id: 'communicationDuringRating',
      label: 'Communication During The Build Event',
      prompt: 'How clear was the communication during the build event?'
    },
    {
      id: 'rulesFairnessRating',
      label: 'Participation Guidance',
      prompt: 'How clear were the expectations and requirements for participating?'
    },
    {
      id: 'judgesRating',
      label: 'Mentor And Expert Support',
      prompt: 'How useful was any mentor, expert, or review support you received?'
    },
    {
      id: 'schedulePacingRating',
      label: 'Schedule And Pacing',
      prompt: 'How well did the schedule and pacing support building?'
    },
    {
      id: 'safetyAccessibilityInclusionRating',
      label: 'Safety And Inclusion',
      prompt: 'Did you feel welcome, safe, and able to participate fully?'
    },
    {
      id: 'outcomesRating',
      label: 'Progress Toward Your Goals',
      prompt: 'How valuable was the event for making progress on what you wanted to build?'
    },
    {
      id: 'overallExperienceRating',
      label: 'Overall Experience',
      prompt: 'Overall, how would you rate your build event experience?'
    }
  ]
} as const satisfies Record<EventFeedbackEventType, readonly EventFeedbackQuestionDefinition[]>

export const eventFeedbackQuestions = eventFeedbackQuestionsByEventType.hackathon

export function getEventFeedbackQuestions(eventType: EventFeedbackEventType) {
  return eventFeedbackQuestionsByEventType[eventType]
}
