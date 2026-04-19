export const hackathonFeedbackRatingValues = [1, 2, 3, 4, 5] as const

export type HackathonFeedbackRatingValue = (typeof hackathonFeedbackRatingValues)[number]

export const hackathonFeedbackQuestionIds = [
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

export type HackathonFeedbackQuestionId = (typeof hackathonFeedbackQuestionIds)[number]

export interface HackathonFeedbackQuestionDefinition {
  id: HackathonFeedbackQuestionId
  label: string
  prompt: string
}

export type HackathonFeedbackRatingDistribution = Record<HackathonFeedbackRatingValue, number>

export interface HackathonFeedbackQuestionSummary extends HackathonFeedbackQuestionDefinition {
  averageRating: number | null
  responseCount: number
  ratingCounts: HackathonFeedbackRatingDistribution
}

export interface HackathonFeedbackCommentEntry {
  id: string
  comment: string
  createdAt: string
}

export interface HackathonFeedbackSummary {
  responseCount: number
  questionSummaries: HackathonFeedbackQuestionSummary[]
  comments: HackathonFeedbackCommentEntry[]
}

export const hackathonFeedbackQuestions: HackathonFeedbackQuestionDefinition[] = [
  {
    id: 'communicationBeforeRating',
    label: 'Communication Before The Hackathon',
    prompt: 'How clear was the information you received before the hackathon?'
  },
  {
    id: 'organizationRating',
    label: 'Organization',
    prompt: 'How well organized did the hackathon feel?'
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
    label: 'Hackathon Platform',
    prompt: 'How well did codex-hackathons.com work during the hackathon?'
  },
  {
    id: 'staffRating',
    label: 'Staff Support',
    prompt: 'How helpful was the staff during the hackathon?'
  },
  {
    id: 'participantsCommunityRating',
    label: 'Team Formation And Community',
    prompt: 'How easy was it to find a team and collaborate with other participants?'
  },
  {
    id: 'communicationDuringRating',
    label: 'Communication During The Hackathon',
    prompt: 'How clear was the communication during the hackathon?'
  },
  {
    id: 'rulesFairnessRating',
    label: 'Hackathon Rules',
    prompt: 'How clear and fair were the hackathon rules?'
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
    prompt: 'How valuable was the hackathon for your goals?'
  },
  {
    id: 'overallExperienceRating',
    label: 'Overall Experience',
    prompt: 'Overall, how would you rate your experience?'
  }
]
