import { z } from 'zod'

const eventSchema = z.object({
  id: z.string(),
  eventType: z.enum(['hackathon', 'meetup', 'build']),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  state: z.enum([
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
  ]),
  agendaItems: z.array(z.unknown()),
  tracks: z.array(z.unknown()).optional(),
  registrationOpensAt: z.string(),
  registrationClosesAt: z.string(),
  submissionOpensAt: z.string().nullable(),
  submissionClosesAt: z.string().nullable(),
  maxTeamMembers: z.number().int(),
  participantsLimit: z.number().int().nullable().optional(),
  autoApproveApplications: z.boolean(),
  simplifiedClaimingEnabled: z.boolean().optional(),
  blindReviewCount: z.number().int(),
  pitchReviewEnabled: z.boolean(),
  blindScoreWeightPercent: z.number().int(),
  pitchScoreWeightPercent: z.number().int(),
  shortlistFinalistCount: z.number().int(),
  pitchPresentationSubmissionIds: z.array(z.string()),
  activePitchPresentationSubmissionId: z.string().nullable(),
  pitchPresentationsCompletedAt: z.string().nullable(),
  currentTerms: z.object({
    applicationTerms: z.object({
      id: z.string(),
      documentType: z.enum(['application_terms', 'winner_terms']),
      version: z.number().int(),
      title: z.string(),
      publishedAt: z.string()
    }).nullable(),
    winnerTerms: z.object({
      id: z.string(),
      documentType: z.enum(['application_terms', 'winner_terms']),
      version: z.number().int(),
      title: z.string(),
      publishedAt: z.string()
    }).nullable()
  }).optional()
}).passthrough()

const roleAssignmentSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  userId: z.string(),
  role: z.enum(['event_admin', 'judge', 'staff']),
  isInJudgePool: z.boolean(),
  isStaff: z.boolean(),
  staffTrackId: z.string().nullable(),
  createdAt: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    displayName: z.string(),
    isPlatformAdmin: z.boolean(),
    isEventOrganizer: z.boolean().optional()
  }).optional()
}).passthrough()

const assignmentSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  submissionId: z.string(),
  judgeUserId: z.string(),
  reviewStage: z.enum(['blind_review', 'pitch_review']),
  status: z.enum(['assigned', 'judge_started', 'judge_completed', 'skipped']),
  assignedAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  skippedAt: z.string().nullable(),
  skippedByUserId: z.string().nullable(),
  skipReason: z.string().nullable(),
  ineligibilityStatus: z.enum(['eligible', 'ineligible']),
  ineligibilityReason: z.string().nullable(),
  ineligibilityMarkedAt: z.string().nullable(),
  ineligibilityMarkedByUserId: z.string().nullable(),
  createdAt: z.string()
}).passthrough()

const applicationSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  userId: z.string(),
  status: z.enum(['submitted', 'approved', 'rejected', 'withdrawn']),
  selectedTrackId: z.string().nullable(),
  submittedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
}).passthrough()

const teamSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  bio: z.string().nullable(),
  slug: z.string(),
  isOpenToJoinRequests: z.boolean(),
  activeMemberCount: z.number().int().optional(),
  members: z.array(z.unknown()).optional(),
  createdByUserId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
}).passthrough()

const submissionSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  trackId: z.string().nullable(),
  status: z.enum(['draft', 'submitted', 'withdrawn', 'locked', 'disqualified']),
  projectName: z.string().nullable(),
  summary: z.string().nullable(),
  submittedAt: z.string().nullable(),
  lockedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
}).passthrough()

const judgingSummarySchema = z.object({
  totalAssignmentCount: z.number().int().nonnegative(),
  activeAssignmentCount: z.number().int().nonnegative(),
  completedPitchAssignmentCount: z.number().int().nonnegative()
})

const submissionSummarySchema = z.object({
  totalTeams: z.number().int().nonnegative(),
  noSubmissionTeamCount: z.number().int().nonnegative(),
  submittedOrLaterTeamCount: z.number().int().nonnegative(),
  statusCounts: z.object({
    none: z.number().int().nonnegative(),
    draft: z.number().int().nonnegative(),
    submitted: z.number().int().nonnegative(),
    locked: z.number().int().nonnegative(),
    withdrawn: z.number().int().nonnegative(),
    disqualified: z.number().int().nonnegative()
  })
})

const submissionMonitorSchema = z.object({
  teamDetails: z.array(teamSchema),
  teamSubmissions: z.array(submissionSchema.nullable())
})

const leaderboardEntrySchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  submissionId: z.string(),
  projectName: z.string().nullable(),
  summary: z.string().nullable(),
  submissionStatus: z.enum(['draft', 'submitted', 'withdrawn', 'locked', 'disqualified']),
  reviewStatus: z.enum(['assigned', 'judge_started', 'judge_completed', 'skipped']).nullable(),
  ineligibilityStatus: z.enum(['eligible', 'ineligible']).nullable(),
  scoreTotal: z.number().nullable(),
  rank: z.number().int().nullable()
}).passthrough()

const shortlistEntrySchema = z.object({
  submissionId: z.string(),
  projectName: z.string().nullable(),
  summary: z.string().nullable(),
  submissionStatus: z.enum(['draft', 'submitted', 'withdrawn', 'locked', 'disqualified']),
  reviewStatus: z.enum(['assigned', 'judge_started', 'judge_completed', 'skipped']).nullable(),
  ineligibilityStatus: z.enum(['eligible', 'ineligible']).nullable(),
  scoreTotal: z.number().nullable(),
  rank: z.number().int().nullable(),
  isPitchFinalist: z.boolean(),
  pitchFinalistRank: z.number().int().nullable()
}).passthrough()

const finalDeliberationEntrySchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  submissionId: z.string(),
  projectName: z.string().nullable(),
  summary: z.string().nullable(),
  repositoryUrl: z.string().nullable(),
  demoUrl: z.string().nullable(),
  submissionStatus: z.enum(['draft', 'submitted', 'withdrawn', 'locked', 'disqualified']),
  reviewStatus: z.enum(['assigned', 'judge_started', 'judge_completed', 'skipped']).nullable(),
  ineligibilityStatus: z.enum(['eligible', 'ineligible']).nullable(),
  scoreTotal: z.number().nullable(),
  scoreRank: z.number().int().nullable(),
  finalRank: z.number().int().nullable()
}).passthrough()

const winnerSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  submissionId: z.string(),
  projectName: z.string().nullable(),
  summary: z.string().nullable(),
  repositoryUrl: z.string().nullable(),
  demoUrl: z.string().nullable(),
  finalRank: z.number().int()
}).passthrough()

const prizeRedemptionSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'redeemed']),
  userId: z.string().nullable(),
  teamId: z.string().nullable(),
  legalName: z.string().nullable(),
  redeemedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
}).passthrough()

const rankingEntrySchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  submissionId: z.string(),
  projectName: z.string().nullable(),
  summary: z.string().nullable(),
  repositoryUrl: z.string().nullable(),
  demoUrl: z.string().nullable(),
  teamMembers: z.array(z.unknown())
}).passthrough()

export const accountEventOperationsPageSchema = z.object({
  event: eventSchema,
  roles: z.object({
    assignments: z.array(roleAssignmentSchema)
  }),
  assignments: z.object({
    data: z.array(assignmentSchema),
    total: z.number().int().nonnegative()
  }),
  judgingSummary: judgingSummarySchema,
  leaderboard: z.array(leaderboardEntrySchema),
  teams: z.object({
    data: z.array(teamSchema),
    total: z.number().int().nonnegative()
  }),
  prizes: z.array(z.object({ id: z.string() }).passthrough()),
  applications: z.array(applicationSchema),
  submissionSummary: submissionSummarySchema,
  submissionMonitor: submissionMonitorSchema,
  shortlist: z.object({
    entries: z.array(shortlistEntrySchema),
    hasSavedShortlistSelection: z.boolean()
  }),
  finalDeliberation: z.object({
    entries: z.array(finalDeliberationEntrySchema),
    finalRankingSubmissionIds: z.array(z.string())
  }),
  winners: z.array(winnerSchema),
  prizeRedemptions: z.object({
    redemptions: z.array(prizeRedemptionSchema),
    finalRankingEntries: z.array(rankingEntrySchema),
    blindRankingEntries: z.array(rankingEntrySchema.extend({ blindRank: z.number().int() }).passthrough())
  })
})

export type AccountEventOperationsPage = z.infer<typeof accountEventOperationsPageSchema>
export type AccountEventOperationsEvent = AccountEventOperationsPage['event']
export type AccountEventOperationsRoleAssignment = AccountEventOperationsPage['roles']['assignments'][number]
export type AccountEventOperationsAssignment = AccountEventOperationsPage['assignments']['data'][number]
export type AccountEventOperationsApplication = AccountEventOperationsPage['applications'][number]
export type AccountEventOperationsTeam = AccountEventOperationsPage['teams']['data'][number]
export type AccountEventOperationsSubmission = AccountEventOperationsPage['submissionMonitor']['teamSubmissions'][number]
