import type { EventState } from '~/domains/events/states'

export interface TermsReference {
  id: string
  documentType: 'application_terms' | 'winner_terms'
  version: number
  title: string
  publishedAt: string
}

export interface TermsDocument extends TermsReference {
  eventId: string
  content: string
  createdAt: string
}

export interface EventAgendaItem {
  id: string
  startsAt: string
  endsAt: string | null
  title: string
  details: string | null
  displayOrder: number
}

export interface EventTrack {
  id: string
  eventId: string
  name: string
  description: string
  displayOrder: number
  createdAt: string
}

export type EventType = 'hackathon' | 'meetup' | 'build'

export interface EventRecord {
  id: string
  eventType: EventType
  name: string
  slug: string
  description: string
  agendaItems: EventAgendaItem[]
  tracks?: EventTrack[]
  backgroundImageUrl: string | null
  bannerImageUrl: string | null
  discordServerUrl?: string | null
  lumaEventUrl: string | null
  lumaEventApiId: string | null
  city: string
  country: string
  address: string
  registrationOpensAt: string
  registrationClosesAt: string
  submissionOpensAt: string
  submissionClosesAt: string
  state: EventState
  maxTeamMembers: number
  participantsLimit?: number | null
  autoApproveApplications: boolean
  blindReviewCount: number
  pitchReviewEnabled: boolean
  blindScoreWeightPercent: number
  pitchScoreWeightPercent: number
  shortlistFinalistCount: number
  pitchPresentationSubmissionIds: string[]
  activePitchPresentationSubmissionId: string | null
  pitchPresentationsCompletedAt: string | null
  inPersonEvent: boolean
  applicationXProfileVisible: boolean
  applicationLinkedinProfileVisible: boolean
  applicationGithubProfileVisible: boolean
  applicationChatgptEmailVisible: boolean
  applicationOpenaiOrgIdVisible: boolean
  applicationLumaEmailVisible: boolean
  applicationWhyThisEventVisible: boolean
  applicationProofOfExecutionVisible: boolean
  applicationTeamIntentVisible: boolean
  requireXProfile: boolean
  requireLinkedinProfile: boolean
  requireGithubProfile: boolean
  requireChatgptEmail: boolean
  requireOpenaiOrgId: boolean
  requireLumaEmail: boolean
  requireWhyThisEvent: boolean
  requireProofOfExecution: boolean
  requireTeamIntent: boolean
  requireSubmissionSummary: boolean
  requireSubmissionRepositoryUrl: boolean
  requireSubmissionDemoUrl: boolean
  currentApplicationTermsDocumentId: string | null
  currentWinnerTermsDocumentId: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
  currentTerms?: {
    applicationTerms: TermsReference | null
    winnerTerms: TermsReference | null
  }
}
