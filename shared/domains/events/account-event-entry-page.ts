import { z } from 'zod'

import type {
  AccountOverviewApplicationStatus,
  AccountOverviewEventState,
  AccountOverviewEventType,
  AccountOverviewLumaSyncStatus,
  AccountOverviewOutcomeSummary,
  AccountOverviewRecord,
  AccountOverviewSubmissionStatus,
  AccountOverviewTeamSummary
} from '#shared/domains/account/account-overview-page'

export const accountEventEntryPagePath = '/api/account/events/:slug/entry' as const

export type AccountEventEntryEventType = AccountOverviewEventType
export type AccountEventEntryEventState = AccountOverviewEventState
export type AccountEventEntryParticipation = AccountOverviewRecord
export type AccountEventEntryOutcome = AccountOverviewOutcomeSummary

export interface AccountEventEntryAgendaItem {
  id: string
  startsAt: string
  endsAt: string | null
  title: string
  details: string | null
  displayOrder: number
}

export interface AccountEventEntryTrackResource {
  id?: string
  title: string
  url: string
  description: string | null
  displayOrder: number
}

export interface AccountEventEntryTrack {
  id: string
  name: string
  shortDescription: string
  fullDescription: string
  staffInstructions?: string
  resources: AccountEventEntryTrackResource[]
  displayOrder: number
}

export interface AccountEventEntryEvent extends Record<string, unknown> {
  id: string
  eventType: AccountEventEntryEventType
  creationFlow: 'classic' | 'builder'
  name: string
  slug: string
  description: string
  agendaItems: AccountEventEntryAgendaItem[]
  tracks: AccountEventEntryTrack[]
  backgroundImageUrl: string | null
  backgroundImageRevision: number
  displayBackgroundImageUrl: string | null
  displayBackgroundImageRevision: number | null
  bannerImageUrl: string | null
  bannerImageRevision: number
  publicContentRevision: number
  lumaEventUrl: string | null
  city: string
  country: string
  address: string
  discordServerUrl: string | null
  slidesUrl: string | null
  registrationOpensAt: string
  registrationClosesAt: string
  submissionOpensAt: string | null
  submissionClosesAt: string | null
  state: AccountEventEntryEventState
  maxTeamMembers: number
  participantsLimit: number | null
  autoApproveApplications: boolean
  talkProposalsEnabled: boolean
  talkProposalOpensAt: string | null
  talkProposalClosesAt: string | null
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
  applicationAiKnowledgeVisible: boolean
  requireXProfile: boolean
  requireLinkedinProfile: boolean
  requireGithubProfile: boolean
  requireChatgptEmail: boolean
  requireOpenaiOrgId: boolean
  requireLumaEmail: boolean
  requireWhyThisEvent: boolean
  requireProofOfExecution: boolean
  requireTeamIntent: boolean
  requireAiKnowledge: boolean
  requireSubmissionSummary: boolean
  requireSubmissionRepositoryUrl: boolean
  requireSubmissionDemoUrl: boolean
  currentApplicationTermsDocumentId: string | null
  currentWinnerTermsDocumentId: string | null
  createdByUserId: string
  createdAt: string
  updatedAt: string
  simplifiedClaimingEnabled: boolean
  hasGallery: boolean
}

export interface AccountEventEntryAccess {
  id: string
  eventId: string
  applicationStatus: AccountOverviewApplicationStatus | null
  team: Pick<AccountOverviewTeamSummary, 'id' | 'name' | 'slug' | 'membershipRole'> | null
  submissionStatus: AccountOverviewSubmissionStatus | null
  roles: Array<'event_admin' | 'judge' | 'staff'>
}

export interface AccountEventEntryParticipantCreditOffer {
  id: string
  eventId: string
  name: string
  description: string
  displayOrder: number
  createdAt: string
  updatedAt: string
  availableCount: number
  totalCount: number
  claimedCode: {
    id: string
    value: string
    claimedAt: string | null
  } | null
}

export interface AccountEventEntryAdminCreditOffer {
  id: string
  eventId: string
  name: string
  description: string
  displayOrder: number
  createdAt: string
  updatedAt: string
  availableCount: number
  claimedCount: number
  totalCount: number
  codes: Array<{
    id: string
    value: string
    claimedAt: string | null
    createdAt: string
    claimedByUser: {
      id: string
      email: string
      displayName: string
    } | null
  }>
}

export type AccountEventEntryTalkProposalStatus = 'draft' | 'submitted' | 'withdrawn' | 'accepted' | 'rejected'

export interface AccountEventEntryTalkProposal {
  id: string
  eventId: string
  userId: string
  status: AccountEventEntryTalkProposalStatus
  title: string
  abstract: string
  demoOrSlidesUrl: string | null
  decisionMessage: string | null
  reviewedByUserId: string | null
  submittedAt: string | null
  withdrawnAt: string | null
  revisedAt: string | null
  decidedAt: string | null
  decisionEmailQueuedAt: string | null
  decisionEmailLastAttemptedAt: string | null
  decisionEmailSentAt: string | null
  decisionEmailFailedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AccountEventEntryTalkProposalReview {
  proposal: AccountEventEntryTalkProposal
  owner: {
    id: string
    displayName: string
    firstName: string
    familyName: string
    email: string
  }
  applicationStatus: AccountOverviewApplicationStatus | null
}

export interface AccountEventEntryRankSummary {
  basis: 'final' | 'blind_review'
  rank: number
  rankedTeamCount: number
  totalTeamCount: number
}

export const accountEventEntryTabs = [
  'overview',
  'credits',
  'prizes',
  'details',
  'call-for-talks',
  'gallery',
  'feedback',
  'judges',
  'staff',
  'workspace',
  'teams',
  'participants',
  'certificates',
  'submissions',
  'judging',
  'operations',
  'settings'
] as const

export type AccountEventEntryTab = (typeof accountEventEntryTabs)[number]

export interface AccountEventEntryTabVisibility extends Record<string, unknown> {
  availableTabs: AccountEventEntryTab[]
  showPrizeConfiguration: boolean
  showAgendaConfigurationInDetails: boolean
  hasPublishedPrizes: boolean
  hasPublishedStaff: boolean
  hasCreditInventory: boolean
  hasEligibleTalkProposalApplicant: boolean
  hasGallery: boolean
}

export interface AccountEventEntryPage extends Record<string, unknown> {
  event: AccountEventEntryEvent
  access: AccountEventEntryAccess | null
  participation: AccountEventEntryParticipation | null
  participantCredits: AccountEventEntryParticipantCreditOffer[]
  adminCredits: AccountEventEntryAdminCreditOffer[]
  talkProposal: AccountEventEntryTalkProposal | null
  talkProposalReviews: AccountEventEntryTalkProposalReview[]
  talkProposalReviewTotal: number
  participantRank: AccountEventEntryRankSummary | null
  tabVisibility: AccountEventEntryTabVisibility
  applicationStatus: AccountOverviewApplicationStatus | null
  lumaSyncStatus: AccountOverviewLumaSyncStatus
}

export const accountEventEntryPageSchema = z.object({
  event: z.object({
    id: z.string(),
    eventType: z.enum(['hackathon', 'meetup', 'build']),
    state: z.string()
  }).passthrough(),
  access: z.unknown().nullable(),
  participation: z.unknown().nullable(),
  participantCredits: z.array(z.unknown()),
  adminCredits: z.array(z.unknown()),
  talkProposal: z.unknown().nullable(),
  talkProposalReviews: z.array(z.unknown()),
  talkProposalReviewTotal: z.number(),
  participantRank: z.unknown().nullable(),
  tabVisibility: z.object({
    availableTabs: z.array(z.string()),
    showPrizeConfiguration: z.boolean(),
    showAgendaConfigurationInDetails: z.boolean(),
    hasPublishedPrizes: z.boolean(),
    hasPublishedStaff: z.boolean(),
    hasCreditInventory: z.boolean(),
    hasEligibleTalkProposalApplicant: z.boolean(),
    hasGallery: z.boolean()
  }).passthrough(),
  applicationStatus: z.string().nullable(),
  lumaSyncStatus: z.string().nullable()
}).passthrough()
