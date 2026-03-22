import { mkdirSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { readMigrationSql } from '../../support/backend/migrations.ts'
import { resolvePlatformFixtureTarget, type ProvisionedStablePersona } from './personas.ts'

const fixtureTimestamp = '2026-03-22T12:00:00.000Z'
export const fixtureHackathonId = 'hackathon_e2e_fixture'
export const fixtureJudgingHackathonId = 'hackathon_e2e_judging_fixture'
export const fixtureOutcomesHackathonId = 'hackathon_e2e_outcomes_fixture'
export const fixtureApplicationTermsId = 'hackathon_terms_application_fixture'
export const fixtureWinnerTermsId = 'hackathon_terms_winner_fixture'
export const fixtureJudgingApplicationTermsId = 'hackathon_terms_application_judging_fixture'
export const fixtureOutcomesWinnerTermsId = 'hackathon_terms_winner_outcomes_fixture'
export const fixturePrivacyDocumentId = 'platform_document_privacy_fixture'
export const fixtureTermsDocumentId = 'platform_document_terms_fixture'
export const fixtureJudgingAssignmentId = 'judge_assignment_e2e_fixture'
export const fixtureJudgingStartedAssignmentId = 'judge_assignment_e2e_started_fixture'
export const fixtureJudgingCriterionOneId = 'evaluation_criterion_e2e_judging_novelty'
export const fixtureJudgingCriterionTwoId = 'evaluation_criterion_e2e_judging_execution'
export const fixtureOutcomesSubmissionOneId = 'submission_outcomes_fixture_one'
export const fixtureOutcomesSubmissionTwoId = 'submission_outcomes_fixture_two'
export const fixtureOutcomesTeamRedemptionPrizeId = 'prize_outcomes_fixture_team_rank_1'
export const fixtureOutcomesMemberRedemptionPrizeId = 'prize_outcomes_fixture_member_top_2'

export const platformFixtureIds = {
  hackathonId: fixtureHackathonId,
  judgingHackathonId: fixtureJudgingHackathonId,
  outcomesHackathonId: fixtureOutcomesHackathonId,
  applicationTermsDocumentId: fixtureApplicationTermsId,
  judgingApplicationTermsDocumentId: fixtureJudgingApplicationTermsId,
  winnerTermsDocumentId: fixtureWinnerTermsId,
  outcomesWinnerTermsDocumentId: fixtureOutcomesWinnerTermsId,
  privacyDocumentId: fixturePrivacyDocumentId,
  platformTermsDocumentId: fixtureTermsDocumentId,
  judgingAssignmentId: fixtureJudgingAssignmentId,
  judgingStartedAssignmentId: fixtureJudgingStartedAssignmentId,
  judgingCriterionOneId: fixtureJudgingCriterionOneId,
  judgingCriterionTwoId: fixtureJudgingCriterionTwoId,
  outcomesSubmissionOneId: fixtureOutcomesSubmissionOneId,
  outcomesSubmissionTwoId: fixtureOutcomesSubmissionTwoId,
  outcomesTeamRedemptionPrizeId: fixtureOutcomesTeamRedemptionPrizeId,
  outcomesMemberRedemptionPrizeId: fixtureOutcomesMemberRedemptionPrizeId
} as const

const personaUserIds: Record<ProvisionedStablePersona['key'], string> = {
  platform_admin: 'user_platform_admin',
  hackathon_admin: 'user_hackathon_admin',
  judge: 'user_judge',
  regular_user: 'user_regular_user'
}

const syntheticUserIds = {
  backupJudge: 'user_backup_judge',
  judgingParticipantTwo: 'user_judging_participant_two'
} as const

function sqlLiteral(value: string | null) {
  if (value === null) {
    return 'null'
  }

  return `'${value.replaceAll('\'', '\'\'')}'`
}

function userTuple(persona: ProvisionedStablePersona) {
  return `(${[
    sqlLiteral(personaUserIds[persona.key]),
    sqlLiteral(persona.auth0Subject),
    sqlLiteral(persona.email),
    sqlLiteral(persona.displayName),
    persona.key === 'platform_admin' ? '1' : '0',
    'null',
    'null',
    'null',
    sqlLiteral(fixtureTimestamp),
    sqlLiteral(fixtureTimestamp),
    'null'
  ].join(', ')})`
}

function buildFixtureSql(personas: ProvisionedStablePersona[]) {
  const platformAdminId = personaUserIds.platform_admin
  const hackathonAdminId = personaUserIds.hackathon_admin
  const judgeId = personaUserIds.judge
  const regularUserId = personaUserIds.regular_user
  const backupJudgeId = syntheticUserIds.backupJudge
  const judgingParticipantTwoId = syntheticUserIds.judgingParticipantTwo
  const extraUserTuples = [
    `(${[
      sqlLiteral(backupJudgeId),
      sqlLiteral('auth0|backup_judge'),
      sqlLiteral('backup-judge@example.com'),
      sqlLiteral('Backup Judge'),
      '0',
      'null',
      'null',
      'null',
      sqlLiteral(fixtureTimestamp),
      sqlLiteral(fixtureTimestamp),
      'null'
    ].join(', ')})`,
    `(${[
      sqlLiteral(judgingParticipantTwoId),
      sqlLiteral('auth0|judging_participant_two'),
      sqlLiteral('judging-participant-two@example.com'),
      sqlLiteral('Judging Participant Two'),
      '0',
      'null',
      'null',
      'null',
      sqlLiteral(fixtureTimestamp),
      sqlLiteral(fixtureTimestamp),
      'null'
    ].join(', ')})`
  ]

  return [
    'pragma foreign_keys = on',
    'begin',
    'delete from audit_logs',
    'delete from prize_redemptions',
    'delete from prize_eligibility_snapshots',
    'delete from prizes',
    'delete from judge_criterion_scores',
    'delete from judge_assignments',
    'delete from evaluation_criteria',
    'delete from submissions',
    'delete from team_join_requests',
    'delete from team_members',
    'delete from teams',
    'delete from user_applications',
    'delete from user_platform_document_acceptances',
    'delete from hackathon_terms_documents',
    'delete from platform_documents',
    'delete from hackathon_role_assignments',
    'delete from hackathons',
    'delete from users',
    `insert into users (
      id, auth0_subject, email, display_name, is_platform_admin,
      x_profile_url, linkedin_profile_url, github_profile_url,
      created_at, updated_at, deleted_at
    ) values ${[...personas.map(userTuple), ...extraUserTuples].join(', ')}`,
    `insert into platform_documents (
      id, document_type, version, title, content, published_at, created_at
    ) values
      (${sqlLiteral(fixturePrivacyDocumentId)}, 'privacy_policy', 1, 'Privacy Policy', 'E2E privacy policy', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureTermsDocumentId)}, 'platform_terms', 1, 'Platform Terms', 'E2E platform terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into hackathons (
      id, name, slug, description, background_image_url, banner_image_url, city, address,
      registration_opens_at, registration_closes_at, submission_opens_at, submission_closes_at,
      state, max_team_members, require_x_profile, require_linkedin_profile, require_github_profile,
      current_application_terms_document_id, current_winner_terms_document_id, created_by_user_id,
      created_at, updated_at
    ) values (
      ${sqlLiteral(fixtureHackathonId)},
      'E2E Fixture Hackathon',
      'e2e-fixture-hackathon',
      'Fixture hackathon for authenticated end-to-end coverage.',
      null,
      null,
      'Vienna',
      'Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-23T12:00:00.000Z',
      '2026-03-23T12:00:00.000Z',
      '2026-03-25T12:00:00.000Z',
      'registration_open',
      5,
      0,
      0,
      0,
      null,
      null,
      ${sqlLiteral(platformAdminId)},
      ${sqlLiteral(fixtureTimestamp)},
      ${sqlLiteral(fixtureTimestamp)}
    ),
    (
      ${sqlLiteral(fixtureJudgingHackathonId)},
      'E2E Judging Fixture Hackathon',
      'e2e-judging-fixture-hackathon',
      'Fixture hackathon for judging end-to-end coverage.',
      null,
      null,
      'Vienna',
      'Judging Fixture Address',
      '2026-03-10T12:00:00.000Z',
      '2026-03-12T12:00:00.000Z',
      '2026-03-12T12:00:00.000Z',
      '2026-03-14T12:00:00.000Z',
      'judge_review',
      5,
      0,
      0,
      0,
      null,
      null,
      ${sqlLiteral(platformAdminId)},
      ${sqlLiteral(fixtureTimestamp)},
      ${sqlLiteral(fixtureTimestamp)}
    ),
    (
      ${sqlLiteral(fixtureOutcomesHackathonId)},
      'E2E Outcomes Fixture Hackathon',
      'e2e-outcomes-fixture-hackathon',
      'Fixture hackathon for shortlist, winners, prize redemption, and audit coverage.',
      null,
      null,
      'Vienna',
      'Outcomes Fixture Address',
      '2026-03-08T12:00:00.000Z',
      '2026-03-10T12:00:00.000Z',
      '2026-03-10T12:00:00.000Z',
      '2026-03-12T12:00:00.000Z',
      'shortlist',
      5,
      0,
      0,
      0,
      null,
      null,
      ${sqlLiteral(platformAdminId)},
      ${sqlLiteral(fixtureTimestamp)},
      ${sqlLiteral(fixtureTimestamp)}
    )`,
    `insert into hackathon_terms_documents (
      id, hackathon_id, document_type, version, title, content, published_at, created_at
    ) values
      (${sqlLiteral(fixtureApplicationTermsId)}, ${sqlLiteral(fixtureHackathonId)}, 'application_terms', 1, 'Application Terms', 'E2E application terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureWinnerTermsId)}, ${sqlLiteral(fixtureHackathonId)}, 'winner_terms', 1, 'Winner Terms', 'E2E winner terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureJudgingApplicationTermsId)}, ${sqlLiteral(fixtureJudgingHackathonId)}, 'application_terms', 1, 'Judging Application Terms', 'E2E judging application terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureOutcomesWinnerTermsId)}, ${sqlLiteral(fixtureOutcomesHackathonId)}, 'winner_terms', 1, 'Outcomes Winner Terms', 'E2E outcomes winner terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into hackathon_role_assignments (
      id, hackathon_id, user_id, role, is_in_judge_pool, created_at
    ) values
      ('role_hackathon_admin_fixture', ${sqlLiteral(fixtureHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_judge_fixture', ${sqlLiteral(fixtureHackathonId)}, ${sqlLiteral(judgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_hackathon_admin_judging_fixture', ${sqlLiteral(fixtureJudgingHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_judge_judging_fixture', ${sqlLiteral(fixtureJudgingHackathonId)}, ${sqlLiteral(judgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_backup_judge_judging_fixture', ${sqlLiteral(fixtureJudgingHackathonId)}, ${sqlLiteral(backupJudgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_hackathon_admin_outcomes_fixture', ${sqlLiteral(fixtureOutcomesHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_judge_outcomes_fixture', ${sqlLiteral(fixtureOutcomesHackathonId)}, ${sqlLiteral(judgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into user_applications (
      id, hackathon_id, user_id, status, submitted_at, reviewed_at, reviewed_by_user_id,
      application_terms_document_id, application_terms_accepted_at, created_at, updated_at
    ) values
      ('application_platform_admin_fixture', ${sqlLiteral(fixtureHackathonId)}, ${sqlLiteral(platformAdminId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_judge_fixture', ${sqlLiteral(fixtureHackathonId)}, ${sqlLiteral(judgeId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_judging_fixture', ${sqlLiteral(fixtureJudgingHackathonId)}, ${sqlLiteral(regularUserId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureJudgingApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_participant_two_judging_fixture', ${sqlLiteral(fixtureJudgingHackathonId)}, ${sqlLiteral(judgingParticipantTwoId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureJudgingApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_outcomes_fixture', ${sqlLiteral(fixtureOutcomesHackathonId)}, ${sqlLiteral(regularUserId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_judge_outcomes_fixture', ${sqlLiteral(fixtureOutcomesHackathonId)}, ${sqlLiteral(judgeId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into teams (
      id, hackathon_id, name, slug, is_open_to_join_requests, created_by_user_id, created_at, updated_at
    ) values
      ('team_judging_fixture_one', ${sqlLiteral(fixtureJudgingHackathonId)}, 'Fixture Judging Team One', 'fixture-judging-team-one', 0, ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_judging_fixture_two', ${sqlLiteral(fixtureJudgingHackathonId)}, 'Fixture Judging Team Two', 'fixture-judging-team-two', 0, ${sqlLiteral(judgingParticipantTwoId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_outcomes_fixture_one', ${sqlLiteral(fixtureOutcomesHackathonId)}, 'Fixture Outcomes Team One', 'fixture-outcomes-team-one', 0, ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_outcomes_fixture_two', ${sqlLiteral(fixtureOutcomesHackathonId)}, 'Fixture Outcomes Team Two', 'fixture-outcomes-team-two', 0, ${sqlLiteral(judgeId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into team_members (
      id, team_id, user_id, role, joined_at, left_at, created_at
    ) values
      ('membership_judging_fixture_one', 'team_judging_fixture_one', ${sqlLiteral(regularUserId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_judging_fixture_two', 'team_judging_fixture_two', ${sqlLiteral(judgingParticipantTwoId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_outcomes_fixture_one', 'team_outcomes_fixture_one', ${sqlLiteral(regularUserId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_outcomes_fixture_two', 'team_outcomes_fixture_two', ${sqlLiteral(judgeId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into submissions (
      id, team_id, status, project_name, summary, repository_url, demo_url, submitted_at, locked_at, withdrawn_at, disqualified_at, created_at, updated_at
    ) values
      ('submission_judging_fixture_one', 'team_judging_fixture_one', 'locked', 'Fixture Project One', 'Blind fixture summary one', 'https://example.com/judging-fixture-one', 'https://example.com/judging-fixture-one-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('submission_judging_fixture_two', 'team_judging_fixture_two', 'locked', 'Fixture Project Two', 'Blind fixture summary two', 'https://example.com/judging-fixture-two', 'https://example.com/judging-fixture-two-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureOutcomesSubmissionOneId)}, 'team_outcomes_fixture_one', 'locked', 'Fixture Outcomes Project One', 'Outcomes summary one', 'https://example.com/outcomes-fixture-one', 'https://example.com/outcomes-fixture-one-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureOutcomesSubmissionTwoId)}, 'team_outcomes_fixture_two', 'locked', 'Fixture Outcomes Project Two', 'Outcomes summary two', 'https://example.com/outcomes-fixture-two', 'https://example.com/outcomes-fixture-two-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into evaluation_criteria (
      id, hackathon_id, name, description, weight, display_order, created_at
    ) values
      (${sqlLiteral(fixtureJudgingCriterionOneId)}, ${sqlLiteral(fixtureJudgingHackathonId)}, 'Novelty', 'Judging fixture novelty criterion', 50, 1, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureJudgingCriterionTwoId)}, ${sqlLiteral(fixtureJudgingHackathonId)}, 'Execution', 'Judging fixture execution criterion', 50, 2, ${sqlLiteral(fixtureTimestamp)}),
      ('evaluation_criterion_outcomes_fixture_novelty', ${sqlLiteral(fixtureOutcomesHackathonId)}, 'Novelty', 'Outcomes fixture novelty criterion', 50, 1, ${sqlLiteral(fixtureTimestamp)}),
      ('evaluation_criterion_outcomes_fixture_execution', ${sqlLiteral(fixtureOutcomesHackathonId)}, 'Execution', 'Outcomes fixture execution criterion', 50, 2, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into judge_assignments (
      id, hackathon_id, submission_id, judge_user_id, status, assigned_at, started_at, completed_at, skipped_at, skipped_by_user_id, skip_reason, ineligibility_status, ineligibility_reason, ineligibility_marked_at, ineligibility_marked_by_user_id, created_at
    ) values
      (${sqlLiteral(fixtureJudgingAssignmentId)}, ${sqlLiteral(fixtureJudgingHackathonId)}, 'submission_judging_fixture_one', ${sqlLiteral(judgeId)}, 'assigned', ${sqlLiteral(fixtureTimestamp)}, null, null, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureJudgingStartedAssignmentId)}, ${sqlLiteral(fixtureJudgingHackathonId)}, 'submission_judging_fixture_two', ${sqlLiteral(judgeId)}, 'judge_started', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_assignment_outcomes_fixture_one', ${sqlLiteral(fixtureOutcomesHackathonId)}, ${sqlLiteral(fixtureOutcomesSubmissionOneId)}, ${sqlLiteral(judgeId)}, 'judge_completed', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_assignment_outcomes_fixture_two', ${sqlLiteral(fixtureOutcomesHackathonId)}, ${sqlLiteral(fixtureOutcomesSubmissionTwoId)}, ${sqlLiteral(judgeId)}, 'judge_completed', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into judge_criterion_scores (
      id, judge_assignment_id, evaluation_criterion_id, score, comment, created_at, updated_at
    ) values
      ('judge_score_outcomes_fixture_one_novelty', 'judge_assignment_outcomes_fixture_one', 'evaluation_criterion_outcomes_fixture_novelty', 9, 'Strong novelty', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_score_outcomes_fixture_one_execution', 'judge_assignment_outcomes_fixture_one', 'evaluation_criterion_outcomes_fixture_execution', 8, 'Strong execution', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_score_outcomes_fixture_two_novelty', 'judge_assignment_outcomes_fixture_two', 'evaluation_criterion_outcomes_fixture_novelty', 7, 'Good novelty', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_score_outcomes_fixture_two_execution', 'judge_assignment_outcomes_fixture_two', 'evaluation_criterion_outcomes_fixture_execution', 6, 'Good execution', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into prize_eligibility_snapshots (
      id, hackathon_id, team_id, user_id, snapshot_at, created_at
    ) values
      ('prize_snapshot_outcomes_fixture_team_one', ${sqlLiteral(fixtureOutcomesHackathonId)}, 'team_outcomes_fixture_one', ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('prize_snapshot_outcomes_fixture_team_two', ${sqlLiteral(fixtureOutcomesHackathonId)}, 'team_outcomes_fixture_two', ${sqlLiteral(judgeId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into prizes (
      id, hackathon_id, name, description, reward_type, reward_value, reward_currency, award_scope, rank_start, rank_end, created_at
    ) values
      (${sqlLiteral(fixtureOutcomesTeamRedemptionPrizeId)}, ${sqlLiteral(fixtureOutcomesHackathonId)}, 'Outcomes Grand Prize', 'Team prize for rank 1', 'api_credits', '1000', 'USD', 'team', 1, 1, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureOutcomesMemberRedemptionPrizeId)}, ${sqlLiteral(fixtureOutcomesHackathonId)}, 'Outcomes Top Two Membership', 'Member prize for top two teams', 'subscription', 'pro', null, 'member', 1, 2, ${sqlLiteral(fixtureTimestamp)})`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureApplicationTermsId)},
          current_winner_terms_document_id = ${sqlLiteral(fixtureWinnerTermsId)}
      where id = ${sqlLiteral(fixtureHackathonId)}`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureJudgingApplicationTermsId)}
      where id = ${sqlLiteral(fixtureJudgingHackathonId)}`,
    `update hackathons
      set current_winner_terms_document_id = ${sqlLiteral(fixtureOutcomesWinnerTermsId)}
      where id = ${sqlLiteral(fixtureOutcomesHackathonId)}`,
    'commit'
  ].join(';\n')
}

export function buildPlatformFixtureResetSql(personas: ProvisionedStablePersona[]) {
  return buildFixtureSql(personas)
}

export async function resetPlatformFixtures(
  personas: ProvisionedStablePersona[],
  environment: NodeJS.ProcessEnv = process.env
) {
  const fixtureTarget = resolvePlatformFixtureTarget(environment)
  const fixtureSql = buildFixtureSql(personas)

  if (fixtureTarget.localSqlitePath) {
    mkdirSync(dirname(fixtureTarget.localSqlitePath), { recursive: true })
    rmSync(fixtureTarget.localSqlitePath, { force: true })

    const sqlite = new DatabaseSync(fixtureTarget.localSqlitePath)

    try {
      sqlite.exec(readMigrationSql())
      sqlite.exec(fixtureSql)
    } finally {
      sqlite.close()
    }

    return {
      hackathonId: fixtureHackathonId,
      userIds: personaUserIds
    }
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${fixtureTarget.cloudflareAccountId}/d1/database/${fixtureTarget.cloudflareD1DatabaseId}/query`,
    {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${fixtureTarget.cloudflareApiToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sql: fixtureSql
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Cloudflare D1 fixture reset failed with status ${response.status}.`)
  }

  const payload = await response.json() as { success?: boolean, errors?: Array<{ message?: string }> }

  if (payload.success === false) {
    const errorMessage = payload.errors?.map(error => error.message).filter(Boolean).join('; ') || 'Unknown Cloudflare D1 error.'
    throw new Error(`Cloudflare D1 fixture reset failed: ${errorMessage}`)
  }

  return {
    hackathonId: fixtureHackathonId,
    userIds: personaUserIds
  }
}
