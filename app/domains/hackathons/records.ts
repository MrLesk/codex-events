import type { HackathonState } from '~/domains/hackathons/states'

export interface TermsReference {
  id: string
  documentType: 'application_terms' | 'winner_terms'
  version: number
  title: string
  publishedAt: string
}

export interface TermsDocument extends TermsReference {
  hackathonId: string
  content: string
  createdAt: string
}

export interface HackathonAgendaItem {
  id: string
  startsAt: string
  endsAt: string | null
  title: string
  details: string | null
  displayOrder: number
}

export interface HackathonTrack {
  id: string
  hackathonId: string
  name: string
  description: string
  displayOrder: number
  createdAt: string
}

export interface HackathonRecord {
  id: string
  name: string
  slug: string
  description: string
  agendaItems: HackathonAgendaItem[]
  tracks?: HackathonTrack[]
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
  state: HackathonState
  maxTeamMembers: number
  participantsLimit?: number | null
  blindReviewCount: number
  pitchReviewEnabled: boolean
  blindScoreWeightPercent: number
  pitchScoreWeightPercent: number
  shortlistFinalistCount: number
  pitchPresentationSubmissionIds: string[]
  activePitchPresentationSubmissionId: string | null
  pitchPresentationsCompletedAt: string | null
  inPersonEvent: boolean
  requireXProfile: boolean
  requireLinkedinProfile: boolean
  requireGithubProfile: boolean
  requireChatgptEmail: boolean
  requireOpenaiOrgId: boolean
  requireLumaEmail: boolean
  requireWhyThisHackathon: boolean
  requireProofOfExecution: boolean
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
