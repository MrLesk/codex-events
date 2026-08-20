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
import {
  accountEventSettingsEventSchema,
  type AccountEventSettingsEvent
} from './account-event-settings-page'

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

export interface AccountEventEntryEvent {
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

export interface AccountEventEntryTabVisibility {
  availableTabs: AccountEventEntryTab[]
  showPrizeConfiguration: boolean
  showAgendaConfigurationInDetails: boolean
  hasPublishedPrizes: boolean
  hasPublishedStaff: boolean
  hasCreditInventory: boolean
  hasEligibleTalkProposalApplicant: boolean
  hasGallery: boolean
}

export interface AccountEventEntryPage {
  event: AccountEventEntryEvent
  adminSettingsEvent: AccountEventSettingsEvent | null
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

const eventTypeSchema = z.enum(['hackathon', 'meetup', 'build'])
const eventStateSchema = z.enum([
  'draft',
  'registration_open',
  'submission_open',
  'judging_preparation',
  'blind_review',
  'shortlist',
  'pitch',
  'pitch_review',
  'final_deliberation',
  'winners_announced',
  'completed'
])
const applicationStatusSchema = z.enum(['submitted', 'approved', 'rejected', 'withdrawn'])
const lumaSyncStatusSchema = z.enum([
  'not_synced',
  'approve_synced',
  'reject_synced',
  'approve_failed',
  'reject_failed'
]).nullable()

const eventAgendaItemSchema = z.object({
  id: z.string(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  title: z.string(),
  details: z.string().nullable(),
  displayOrder: z.number().int(),
  builderBlockType: z.string().optional(),
  builderFocusCost: z.number().optional(),
  builderEnergyDelta: z.number().optional()
})

const eventTrackResourceSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  displayOrder: z.number().int()
})

const eventTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortDescription: z.string(),
  fullDescription: z.string(),
  staffInstructions: z.string().optional(),
  resources: z.array(eventTrackResourceSchema),
  displayOrder: z.number().int()
})

const overviewEventSummarySchema = z.object({
  id: z.string(),
  eventType: eventTypeSchema,
  name: z.string(),
  slug: z.string(),
  city: z.string(),
  country: z.string(),
  state: eventStateSchema,
  startsAt: z.string(),
  registrationOpensAt: z.string(),
  registrationClosesAt: z.string(),
  submissionClosesAt: z.string().nullable(),
  maxTeamMembers: z.number().int()
})

const overviewApplicationSummarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: applicationStatusSchema,
  lumaSyncStatus: lumaSyncStatusSchema,
  submittedAt: z.string(),
  withdrawnAt: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  checkedInAt: z.string().nullable(),
  isCheckedIn: z.boolean(),
  certificateHiddenAt: z.string().nullable(),
  certificateRevokedAt: z.string().nullable(),
  selectedTrackId: z.string().nullable(),
  updatedAt: z.string()
})

const overviewTeamSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  membershipRole: z.enum(['member', 'admin']),
  joinedAt: z.string(),
  leftAt: z.string().nullable(),
  isActiveMembership: z.boolean(),
  activeMemberCount: z.number().int()
})

const overviewSubmissionSummarySchema = z.object({
  id: z.string(),
  teamId: z.string(),
  trackId: z.string().nullable(),
  status: z.enum(['draft', 'submitted', 'withdrawn', 'locked', 'disqualified']),
  projectName: z.string().nullable(),
  summary: z.string().nullable(),
  repositoryUrl: z.string().nullable(),
  demoUrl: z.string().nullable(),
  isPubliclyVisible: z.boolean(),
  submittedAt: z.string().nullable(),
  lockedAt: z.string().nullable(),
  withdrawnAt: z.string().nullable(),
  disqualifiedAt: z.string().nullable(),
  disqualificationReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
})

const overviewOutcomeSchema = z.object({
  isShortlisted: z.boolean(),
  isWinner: z.boolean(),
  finalRank: z.number().int().nullable(),
  rankedTeamCount: z.number().int(),
  prizes: z.array(z.object({
    id: z.string(),
    name: z.string()
  }))
})

const participationSchema = z.object({
  event: overviewEventSummarySchema,
  isPast: z.boolean(),
  lastActivityAt: z.string(),
  application: overviewApplicationSummarySchema.nullable(),
  activeTeam: overviewTeamSummarySchema.nullable(),
  latestTeam: overviewTeamSummarySchema.nullable(),
  latestSubmission: overviewSubmissionSummarySchema.nullable(),
  outcome: overviewOutcomeSchema.nullable()
})

const accountEventEntryEventSchema = z.object({
  id: z.string(),
  eventType: eventTypeSchema,
  creationFlow: z.enum(['classic', 'builder']),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  agendaItems: z.array(eventAgendaItemSchema),
  tracks: z.array(eventTrackSchema),
  backgroundImageUrl: z.string().nullable(),
  backgroundImageRevision: z.number().int(),
  displayBackgroundImageUrl: z.string().nullable(),
  displayBackgroundImageRevision: z.number().int().nullable(),
  bannerImageUrl: z.string().nullable(),
  bannerImageRevision: z.number().int(),
  publicContentRevision: z.number().int(),
  lumaEventUrl: z.string().nullable(),
  city: z.string(),
  country: z.string(),
  address: z.string(),
  discordServerUrl: z.string().nullable(),
  slidesUrl: z.string().nullable(),
  registrationOpensAt: z.string(),
  registrationClosesAt: z.string(),
  submissionOpensAt: z.string().nullable(),
  submissionClosesAt: z.string().nullable(),
  state: eventStateSchema,
  maxTeamMembers: z.number().int(),
  participantsLimit: z.number().int().nullable(),
  autoApproveApplications: z.boolean(),
  talkProposalsEnabled: z.boolean(),
  talkProposalOpensAt: z.string().nullable(),
  talkProposalClosesAt: z.string().nullable(),
  blindReviewCount: z.number().int(),
  pitchReviewEnabled: z.boolean(),
  blindScoreWeightPercent: z.number().int(),
  pitchScoreWeightPercent: z.number().int(),
  shortlistFinalistCount: z.number().int(),
  pitchPresentationSubmissionIds: z.array(z.string()),
  activePitchPresentationSubmissionId: z.string().nullable(),
  pitchPresentationsCompletedAt: z.string().nullable(),
  inPersonEvent: z.boolean(),
  applicationXProfileVisible: z.boolean(),
  applicationLinkedinProfileVisible: z.boolean(),
  applicationGithubProfileVisible: z.boolean(),
  applicationChatgptEmailVisible: z.boolean(),
  applicationOpenaiOrgIdVisible: z.boolean(),
  applicationLumaEmailVisible: z.boolean(),
  applicationWhyThisEventVisible: z.boolean(),
  applicationProofOfExecutionVisible: z.boolean(),
  applicationTeamIntentVisible: z.boolean(),
  applicationAiKnowledgeVisible: z.boolean(),
  requireXProfile: z.boolean(),
  requireLinkedinProfile: z.boolean(),
  requireGithubProfile: z.boolean(),
  requireChatgptEmail: z.boolean(),
  requireOpenaiOrgId: z.boolean(),
  requireLumaEmail: z.boolean(),
  requireWhyThisEvent: z.boolean(),
  requireProofOfExecution: z.boolean(),
  requireTeamIntent: z.boolean(),
  requireAiKnowledge: z.boolean(),
  requireSubmissionSummary: z.boolean(),
  requireSubmissionRepositoryUrl: z.boolean(),
  requireSubmissionDemoUrl: z.boolean(),
  currentApplicationTermsDocumentId: z.string().nullable(),
  currentWinnerTermsDocumentId: z.string().nullable(),
  createdByUserId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  simplifiedClaimingEnabled: z.boolean(),
  hasGallery: z.boolean()
})

const accessSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  applicationStatus: applicationStatusSchema.nullable(),
  team: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    membershipRole: z.enum(['member', 'admin'])
  }).nullable(),
  submissionStatus: z.enum(['draft', 'submitted', 'withdrawn', 'locked', 'disqualified']).nullable(),
  roles: z.array(z.enum(['event_admin', 'judge', 'staff']))
})

const participantCreditOfferSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  description: z.string(),
  displayOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  availableCount: z.number().int(),
  totalCount: z.number().int(),
  claimedCode: z.object({
    id: z.string(),
    value: z.string(),
    claimedAt: z.string().nullable()
  }).nullable()
})

const adminCreditOfferSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  description: z.string(),
  displayOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  availableCount: z.number().int(),
  claimedCount: z.number().int(),
  totalCount: z.number().int(),
  codes: z.array(z.object({
    id: z.string(),
    value: z.string(),
    claimedAt: z.string().nullable(),
    createdAt: z.string(),
    claimedByUser: z.object({
      id: z.string(),
      email: z.string(),
      displayName: z.string()
    }).nullable()
  }))
})

const talkProposalSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  userId: z.string(),
  status: z.enum(['draft', 'submitted', 'withdrawn', 'accepted', 'rejected']),
  title: z.string(),
  abstract: z.string(),
  demoOrSlidesUrl: z.string().nullable(),
  decisionMessage: z.string().nullable(),
  reviewedByUserId: z.string().nullable(),
  submittedAt: z.string().nullable(),
  withdrawnAt: z.string().nullable(),
  revisedAt: z.string().nullable(),
  decidedAt: z.string().nullable(),
  decisionEmailQueuedAt: z.string().nullable(),
  decisionEmailLastAttemptedAt: z.string().nullable(),
  decisionEmailSentAt: z.string().nullable(),
  decisionEmailFailedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
})

const talkProposalReviewSchema = z.object({
  proposal: talkProposalSchema,
  owner: z.object({
    id: z.string(),
    displayName: z.string(),
    firstName: z.string(),
    familyName: z.string(),
    email: z.string()
  }),
  applicationStatus: applicationStatusSchema.nullable()
})

const participantRankSchema = z.object({
  basis: z.enum(['final', 'blind_review']),
  rank: z.number().int(),
  rankedTeamCount: z.number().int(),
  totalTeamCount: z.number().int()
})

const tabVisibilitySchema = z.object({
  availableTabs: z.array(z.enum(accountEventEntryTabs)),
  showPrizeConfiguration: z.boolean(),
  showAgendaConfigurationInDetails: z.boolean(),
  hasPublishedPrizes: z.boolean(),
  hasPublishedStaff: z.boolean(),
  hasCreditInventory: z.boolean(),
  hasEligibleTalkProposalApplicant: z.boolean(),
  hasGallery: z.boolean()
})

export const accountEventEntryPageSchema = z.object({
  event: accountEventEntryEventSchema,
  adminSettingsEvent: accountEventSettingsEventSchema.nullable(),
  access: accessSchema.nullable(),
  participation: participationSchema.nullable(),
  participantCredits: z.array(participantCreditOfferSchema),
  adminCredits: z.array(adminCreditOfferSchema),
  talkProposal: talkProposalSchema.nullable(),
  talkProposalReviews: z.array(talkProposalReviewSchema),
  talkProposalReviewTotal: z.number().int().nonnegative(),
  participantRank: participantRankSchema.nullable(),
  tabVisibility: tabVisibilitySchema,
  applicationStatus: applicationStatusSchema.nullable(),
  lumaSyncStatus: lumaSyncStatusSchema
})
