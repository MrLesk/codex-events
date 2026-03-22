import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex
} from 'drizzle-orm/sqlite-core'

const createId = () => crypto.randomUUID()
const currentTimestamp = sql`CURRENT_TIMESTAMP`

const idColumn = () => text('id').primaryKey().$defaultFn(createId)
const createdAtColumn = () => text('created_at').notNull().default(currentTimestamp)
const updatedAtColumn = () => text('updated_at').notNull().default(currentTimestamp)

export const hackathonStates = [
  'draft',
  'registration_open',
  'submission_open',
  'judging_preparation',
  'judge_review',
  'shortlist',
  'winners_announced',
  'completed'
] as const

export const hackathonRoleTypes = ['hackathon_admin', 'judge'] as const
export const platformDocumentTypes = ['privacy_policy', 'platform_terms'] as const
export const hackathonTermsDocumentTypes = ['application_terms', 'winner_terms'] as const
export const userApplicationStatuses = ['submitted', 'approved', 'rejected'] as const
export const teamMemberRoles = ['member', 'admin'] as const
export const teamJoinRequestStatuses = ['pending', 'approved', 'rejected', 'canceled'] as const
export const submissionStatuses = ['draft', 'submitted', 'withdrawn', 'locked', 'disqualified'] as const
export const judgeAssignmentStatuses = ['assigned', 'judge_started', 'judge_completed', 'skipped'] as const
export const ineligibilityStatuses = ['eligible', 'ineligible'] as const
export const prizeRewardTypes = ['api_credits', 'subscription', 'physical', 'other'] as const
export const prizeAwardScopes = ['team', 'member'] as const
export const prizeRedemptionStatuses = ['pending', 'redeemed', 'failed'] as const

export const users = sqliteTable(
  'users',
  {
    id: idColumn(),
    auth0Subject: text('auth0_subject').notNull(),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    isPlatformAdmin: integer('is_platform_admin', { mode: 'boolean' }).notNull().default(false),
    xProfileUrl: text('x_profile_url'),
    linkedinProfileUrl: text('linkedin_profile_url'),
    githubProfileUrl: text('github_profile_url'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
    deletedAt: text('deleted_at')
  },
  table => [
    uniqueIndex('users_auth0_subject_active_idx')
      .on(table.auth0Subject)
      .where(sql`${table.deletedAt} is null`),
    uniqueIndex('users_email_active_idx')
      .on(table.email)
      .where(sql`${table.deletedAt} is null`)
  ]
)

export const hackathons = sqliteTable(
  'hackathons',
  {
    id: idColumn(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull(),
    backgroundImageUrl: text('background_image_url'),
    bannerImageUrl: text('banner_image_url'),
    city: text('city').notNull(),
    address: text('address').notNull(),
    registrationOpensAt: text('registration_opens_at').notNull(),
    registrationClosesAt: text('registration_closes_at').notNull(),
    submissionOpensAt: text('submission_opens_at').notNull(),
    submissionClosesAt: text('submission_closes_at').notNull(),
    state: text('state', { enum: hackathonStates }).notNull().default('draft'),
    maxTeamMembers: integer('max_team_members').notNull(),
    requireXProfile: integer('require_x_profile', { mode: 'boolean' }).notNull().default(false),
    requireLinkedinProfile: integer('require_linkedin_profile', { mode: 'boolean' }).notNull().default(false),
    requireGithubProfile: integer('require_github_profile', { mode: 'boolean' }).notNull().default(false),
    currentApplicationTermsDocumentId: text('current_application_terms_document_id'),
    currentWinnerTermsDocumentId: text('current_winner_terms_document_id'),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn()
  },
  table => [
    uniqueIndex('hackathons_slug_idx').on(table.slug),
    check('hackathons_max_team_members_check', sql`${table.maxTeamMembers} >= 1`),
    check(
      'hackathons_schedule_order_check',
      sql`${table.registrationOpensAt} < ${table.registrationClosesAt}
        and ${table.registrationClosesAt} <= ${table.submissionOpensAt}
        and ${table.submissionOpensAt} < ${table.submissionClosesAt}`
    )
  ]
)

export const hackathonRoleAssignments = sqliteTable(
  'hackathon_role_assignments',
  {
    id: idColumn(),
    hackathonId: text('hackathon_id')
      .notNull()
      .references(() => hackathons.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role', { enum: hackathonRoleTypes }).notNull(),
    isInJudgePool: integer('is_in_judge_pool', { mode: 'boolean' }).notNull().default(false),
    createdAt: createdAtColumn()
  },
  table => [
    uniqueIndex('hackathon_role_assignments_hackathon_user_idx').on(table.hackathonId, table.userId),
    check(
      'hackathon_role_assignments_judge_pool_check',
      sql`(${table.role} != 'judge') or (${table.isInJudgePool} = 1)`
    )
  ]
)

export const platformDocuments = sqliteTable(
  'platform_documents',
  {
    id: idColumn(),
    documentType: text('document_type', { enum: platformDocumentTypes }).notNull(),
    version: integer('version').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    publishedAt: text('published_at').notNull(),
    createdAt: createdAtColumn()
  },
  table => [
    uniqueIndex('platform_documents_type_version_idx').on(table.documentType, table.version)
  ]
)

export const userPlatformDocumentAcceptances = sqliteTable(
  'user_platform_document_acceptances',
  {
    id: idColumn(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    platformDocumentId: text('platform_document_id')
      .notNull()
      .references(() => platformDocuments.id),
    acceptedAt: text('accepted_at').notNull().default(currentTimestamp)
  },
  table => [
    uniqueIndex('user_platform_document_acceptances_user_document_idx').on(table.userId, table.platformDocumentId)
  ]
)

export const hackathonTermsDocuments = sqliteTable(
  'hackathon_terms_documents',
  {
    id: idColumn(),
    hackathonId: text('hackathon_id')
      .notNull()
      .references(() => hackathons.id),
    documentType: text('document_type', { enum: hackathonTermsDocumentTypes }).notNull(),
    version: integer('version').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    publishedAt: text('published_at').notNull(),
    createdAt: createdAtColumn()
  },
  table => [
    uniqueIndex('hackathon_terms_documents_hackathon_type_version_idx').on(
      table.hackathonId,
      table.documentType,
      table.version
    )
  ]
)

export const userApplications = sqliteTable(
  'user_applications',
  {
    id: idColumn(),
    hackathonId: text('hackathon_id')
      .notNull()
      .references(() => hackathons.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    status: text('status', { enum: userApplicationStatuses }).notNull().default('submitted'),
    submittedAt: text('submitted_at').notNull().default(currentTimestamp),
    reviewedAt: text('reviewed_at'),
    reviewedByUserId: text('reviewed_by_user_id').references(() => users.id),
    applicationTermsDocumentId: text('application_terms_document_id')
      .notNull()
      .references(() => hackathonTermsDocuments.id),
    applicationTermsAcceptedAt: text('application_terms_accepted_at').notNull(),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn()
  },
  table => [
    uniqueIndex('user_applications_hackathon_user_idx').on(table.hackathonId, table.userId)
  ]
)

export const teams = sqliteTable(
  'teams',
  {
    id: idColumn(),
    hackathonId: text('hackathon_id')
      .notNull()
      .references(() => hackathons.id),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    isOpenToJoinRequests: integer('is_open_to_join_requests', { mode: 'boolean' }).notNull().default(true),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.id),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn()
  },
  table => [
    uniqueIndex('teams_hackathon_slug_idx').on(table.hackathonId, table.slug),
    index('teams_hackathon_idx').on(table.hackathonId)
  ]
)

export const teamMembers = sqliteTable(
  'team_members',
  {
    id: idColumn(),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role', { enum: teamMemberRoles }).notNull().default('member'),
    joinedAt: text('joined_at').notNull().default(currentTimestamp),
    leftAt: text('left_at'),
    createdAt: createdAtColumn()
  },
  table => [
    uniqueIndex('team_members_team_user_active_idx')
      .on(table.teamId, table.userId)
      .where(sql`${table.leftAt} is null`),
    index('team_members_user_idx').on(table.userId)
  ]
)

export const teamJoinRequests = sqliteTable(
  'team_join_requests',
  {
    id: idColumn(),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    status: text('status', { enum: teamJoinRequestStatuses }).notNull().default('pending'),
    requestedAt: text('requested_at').notNull().default(currentTimestamp),
    reviewedAt: text('reviewed_at'),
    reviewedByUserId: text('reviewed_by_user_id').references(() => users.id),
    createdAt: createdAtColumn()
  },
  table => [
    uniqueIndex('team_join_requests_pending_team_user_idx')
      .on(table.teamId, table.userId)
      .where(sql`${table.status} = 'pending'`)
  ]
)

export const submissions = sqliteTable(
  'submissions',
  {
    id: idColumn(),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id),
    status: text('status', { enum: submissionStatuses }).notNull().default('draft'),
    projectName: text('project_name'),
    summary: text('summary'),
    repositoryUrl: text('repository_url'),
    demoUrl: text('demo_url'),
    submittedAt: text('submitted_at'),
    lockedAt: text('locked_at'),
    withdrawnAt: text('withdrawn_at'),
    disqualifiedAt: text('disqualified_at'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn()
  },
  table => [
    uniqueIndex('submissions_active_team_idx')
      .on(table.teamId)
      .where(sql`${table.status} in ('draft', 'submitted', 'locked')`)
  ]
)

export const evaluationCriteria = sqliteTable(
  'evaluation_criteria',
  {
    id: idColumn(),
    hackathonId: text('hackathon_id')
      .notNull()
      .references(() => hackathons.id),
    name: text('name').notNull(),
    description: text('description').notNull(),
    weight: integer('weight').notNull(),
    displayOrder: integer('display_order').notNull(),
    createdAt: createdAtColumn()
  },
  table => [
    uniqueIndex('evaluation_criteria_hackathon_display_order_idx').on(table.hackathonId, table.displayOrder),
    check('evaluation_criteria_weight_non_negative_check', sql`${table.weight} >= 0`)
  ]
)

export const judgeAssignments = sqliteTable(
  'judge_assignments',
  {
    id: idColumn(),
    hackathonId: text('hackathon_id')
      .notNull()
      .references(() => hackathons.id),
    submissionId: text('submission_id')
      .notNull()
      .references(() => submissions.id),
    judgeUserId: text('judge_user_id')
      .notNull()
      .references(() => users.id),
    status: text('status', { enum: judgeAssignmentStatuses }).notNull().default('assigned'),
    assignedAt: text('assigned_at').notNull().default(currentTimestamp),
    startedAt: text('started_at'),
    completedAt: text('completed_at'),
    skippedAt: text('skipped_at'),
    skippedByUserId: text('skipped_by_user_id').references(() => users.id),
    skipReason: text('skip_reason'),
    ineligibilityStatus: text('ineligibility_status', { enum: ineligibilityStatuses }).notNull().default('eligible'),
    ineligibilityReason: text('ineligibility_reason'),
    ineligibilityMarkedAt: text('ineligibility_marked_at'),
    ineligibilityMarkedByUserId: text('ineligibility_marked_by_user_id').references(() => users.id),
    createdAt: createdAtColumn()
  },
  table => [
    uniqueIndex('judge_assignments_active_submission_idx')
      .on(table.submissionId)
      .where(sql`${table.status} in ('assigned', 'judge_started')`),
    index('judge_assignments_judge_idx').on(table.judgeUserId)
  ]
)

export const judgeCriterionScores = sqliteTable(
  'judge_criterion_scores',
  {
    id: idColumn(),
    judgeAssignmentId: text('judge_assignment_id')
      .notNull()
      .references(() => judgeAssignments.id),
    evaluationCriterionId: text('evaluation_criterion_id')
      .notNull()
      .references(() => evaluationCriteria.id),
    score: integer('score').notNull(),
    comment: text('comment'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn()
  },
  table => [
    uniqueIndex('judge_criterion_scores_assignment_criterion_idx').on(
      table.judgeAssignmentId,
      table.evaluationCriterionId
    )
  ]
)

export const prizes = sqliteTable(
  'prizes',
  {
    id: idColumn(),
    hackathonId: text('hackathon_id')
      .notNull()
      .references(() => hackathons.id),
    name: text('name').notNull(),
    description: text('description').notNull(),
    rewardType: text('reward_type', { enum: prizeRewardTypes }).notNull(),
    rewardValue: text('reward_value').notNull(),
    rewardCurrency: text('reward_currency'),
    awardScope: text('award_scope', { enum: prizeAwardScopes }).notNull(),
    rankStart: integer('rank_start').notNull(),
    rankEnd: integer('rank_end').notNull(),
    createdAt: createdAtColumn()
  },
  table => [
    check('prizes_rank_order_check', sql`${table.rankStart} <= ${table.rankEnd}`)
  ]
)

export const prizeEligibilitySnapshots = sqliteTable(
  'prize_eligibility_snapshots',
  {
    id: idColumn(),
    hackathonId: text('hackathon_id')
      .notNull()
      .references(() => hackathons.id),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    snapshotAt: text('snapshot_at').notNull(),
    createdAt: createdAtColumn()
  },
  table => [
    uniqueIndex('prize_eligibility_snapshots_hackathon_team_user_idx').on(
      table.hackathonId,
      table.teamId,
      table.userId
    )
  ]
)

export const prizeRedemptions = sqliteTable(
  'prize_redemptions',
  {
    id: idColumn(),
    prizeId: text('prize_id')
      .notNull()
      .references(() => prizes.id),
    userId: text('user_id').references(() => users.id),
    teamId: text('team_id').references(() => teams.id),
    status: text('status', { enum: prizeRedemptionStatuses }).notNull().default('pending'),
    legalName: text('legal_name'),
    winnerTermsDocumentId: text('winner_terms_document_id').references(() => hackathonTermsDocuments.id),
    winnerTermsAcceptedAt: text('winner_terms_accepted_at'),
    redeemedAt: text('redeemed_at'),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn()
  }
)

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: idColumn(),
    actorUserId: text('actor_user_id').references(() => users.id),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),
    metadata: text('metadata', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'`),
    createdAt: createdAtColumn()
  },
  table => [
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    index('audit_logs_actor_idx').on(table.actorUserId)
  ]
)

export const schema = {
  users,
  hackathons,
  hackathonRoleAssignments,
  platformDocuments,
  userPlatformDocumentAcceptances,
  hackathonTermsDocuments,
  userApplications,
  teams,
  teamMembers,
  teamJoinRequests,
  submissions,
  evaluationCriteria,
  judgeAssignments,
  judgeCriterionScores,
  prizes,
  prizeEligibilitySnapshots,
  prizeRedemptions,
  auditLogs
}

export type Schema = typeof schema
