import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import type { ProvisionedStablePersona } from './personas.ts'

import { resolveLocalBddD1StateRoot } from './local-d1-state.ts'

const localWranglerConfigPath = resolve(process.cwd(), 'wrangler.jsonc')

function resolveLocalPlatformPersistPath(environment: NodeJS.ProcessEnv) {
  return resolve(resolveLocalBddD1StateRoot(environment), 'v3')
}

const fixtureTimestamp = '2026-03-22T12:00:00.000Z'
export const fixtureHackathonId = 'hackathon_e2e_fixture'
export const fixtureDraftHackathonId = 'hackathon_e2e_draft_fixture'
const fixtureDraftLumaEventUrl = 'https://luma.com/a4i7qtbo'
const fixtureParticipantApplicationHackathonId = 'hackathon_e2e_participant_application_fixture'
const fixtureApiTeamFormationHackathonId = 'hackathon_e2e_api_team_formation_fixture'
const fixtureParticipantProfileRequirementHackathonId = 'hackathon_e2e_participant_profile_requirement_fixture'
const fixtureParticipantApprovedHackathonId = 'hackathon_e2e_participant_approved_fixture'
const fixtureParticipantRejectedHackathonId = 'hackathon_e2e_participant_rejected_fixture'
const fixtureParticipantTeamCreateHackathonId = 'hackathon_e2e_participant_team_create_fixture'
const fixtureParticipantTeamJoinHackathonId = 'hackathon_e2e_participant_team_join_fixture'
const fixtureParticipantTeamSoloHackathonId = 'hackathon_e2e_participant_team_solo_fixture'
const fixtureApiSoloTeamHackathonId = 'hackathon_e2e_api_solo_team_fixture'
const fixtureParticipantSubmissionCreateHackathonId = 'hackathon_e2e_participant_submission_create_fixture'
const fixtureParticipantSubmissionLockedHackathonId = 'hackathon_e2e_participant_submission_locked_fixture'
const fixturePrizeWorkspaceHackathonId = 'hackathon_e2e_prize_workspace_fixture'
export const fixtureOperationsHackathonId = 'hackathon_e2e_operations_fixture'
export const fixtureJudgingHackathonId = 'hackathon_e2e_judging_fixture'
export const fixtureJudgeWorkspaceHackathonId = 'hackathon_e2e_judge_workspace_fixture'
export const fixtureOutcomesHackathonId = 'hackathon_e2e_outcomes_fixture'
const fixtureCompetitionReassignHackathonId = 'hackathon_e2e_competition_reassign_fixture'
const fixtureCompetitionForceSkipHackathonId = 'hackathon_e2e_competition_force_skip_fixture'
const fixtureCompetitionShortlistHackathonId = 'hackathon_e2e_competition_shortlist_fixture'
const fixtureCompetitionCompleteHackathonId = 'hackathon_e2e_competition_complete_fixture'
export const fixturePublicOverflowHackathonId = 'hackathon_e2e_public_overflow_fixture'
export const fixturePublicArchiveHackathonId = 'hackathon_e2e_public_archive_fixture'
export const fixtureApplicationTermsId = 'hackathon_terms_application_fixture'
const fixtureParticipantApplicationTermsId = 'hackathon_terms_application_participant_fixture'
const fixtureApiTeamFormationTermsId = 'hackathon_terms_application_api_team_formation_fixture'
const fixtureParticipantProfileRequirementTermsId = 'hackathon_terms_application_participant_profile_requirement_fixture'
const fixtureParticipantApprovedTermsId = 'hackathon_terms_application_participant_approved_fixture'
const fixtureParticipantRejectedTermsId = 'hackathon_terms_application_participant_rejected_fixture'
const fixtureParticipantTeamCreateTermsId = 'hackathon_terms_application_participant_team_create_fixture'
const fixtureParticipantTeamJoinTermsId = 'hackathon_terms_application_participant_team_join_fixture'
const fixtureParticipantTeamSoloTermsId = 'hackathon_terms_application_participant_team_solo_fixture'
const fixtureApiSoloTeamTermsId = 'hackathon_terms_application_api_solo_team_fixture'
const fixtureParticipantSubmissionCreateTermsId = 'hackathon_terms_application_participant_submission_create_fixture'
const fixtureParticipantSubmissionLockedTermsId = 'hackathon_terms_application_participant_submission_locked_fixture'
const fixturePrizeWorkspaceApplicationTermsId = 'hackathon_terms_application_prize_workspace_fixture'
export const fixtureOperationsApplicationTermsId = 'hackathon_terms_application_operations_fixture'
export const fixtureWinnerTermsId = 'hackathon_terms_winner_fixture'
const fixturePrizeWorkspaceWinnerTermsId = 'hackathon_terms_winner_prize_workspace_fixture'
export const fixtureJudgingApplicationTermsId = 'hackathon_terms_application_judging_fixture'
export const fixtureJudgeWorkspaceApplicationTermsId = 'hackathon_terms_application_judge_workspace_fixture'
export const fixtureOutcomesWinnerTermsId = 'hackathon_terms_winner_outcomes_fixture'
const fixtureCompetitionShortlistWinnerTermsId = 'hackathon_terms_winner_competition_shortlist_fixture'
const fixtureCompetitionCompleteWinnerTermsId = 'hackathon_terms_winner_competition_complete_fixture'
export const fixturePrivacyDocumentId = 'platform_document_privacy_fixture'
export const fixtureTermsDocumentId = 'platform_document_terms_fixture'
export const fixtureJudgingAssignmentId = 'judge_assignment_e2e_fixture'
export const fixtureJudgingStartedAssignmentId = 'judge_assignment_e2e_started_fixture'
export const fixtureJudgeWorkspaceAssignmentId = 'judge_workspace_assignment_e2e_fixture'
export const fixtureJudgeWorkspaceStartedAssignmentId = 'judge_workspace_assignment_e2e_started_fixture'
export const fixtureJudgingCriterionOneId = 'evaluation_criterion_e2e_judging_novelty'
export const fixtureJudgingCriterionTwoId = 'evaluation_criterion_e2e_judging_execution'
export const fixtureJudgeWorkspaceCriterionOneId = 'evaluation_criterion_e2e_workspace_clarity'
export const fixtureJudgeWorkspaceCriterionTwoId = 'evaluation_criterion_e2e_workspace_impact'
export const fixturePublicCriterionOneId = 'evaluation_criterion_e2e_public_impact'
export const fixturePublicCriterionTwoId = 'evaluation_criterion_e2e_public_craft'
export const fixtureOutcomesSubmissionOneId = 'submission_outcomes_fixture_one'
export const fixtureOutcomesSubmissionTwoId = 'submission_outcomes_fixture_two'
const fixtureCompetitionReassignSubmissionId = 'submission_competition_reassign_fixture'
const fixtureCompetitionForceSkipSubmissionId = 'submission_competition_force_skip_fixture'
const fixtureCompetitionShortlistSubmissionOneId = 'submission_competition_shortlist_fixture_one'
const fixtureCompetitionShortlistSubmissionTwoId = 'submission_competition_shortlist_fixture_two'
const fixtureCompetitionCompleteSubmissionOneId = 'submission_competition_complete_fixture_one'
const fixtureCompetitionCompleteSubmissionTwoId = 'submission_competition_complete_fixture_two'
export const fixturePublicPrizeId = 'prize_e2e_public_launch_award'
const fixturePrizeWorkspacePrizeId = 'prize_prize_workspace_fixture_team_rank_1'
export const fixtureOutcomesTeamRedemptionPrizeId = 'prize_outcomes_fixture_team_rank_1'
export const fixtureOutcomesMemberRedemptionPrizeId = 'prize_outcomes_fixture_member_top_2'
const fixtureCompetitionShortlistPrizeId = 'prize_competition_shortlist_rank_1'
const fixtureCompetitionCompletePrizeId = 'prize_competition_complete_rank_1'
const fixturePrizeWorkspaceRedemptionId = 'redemption_prize_workspace_fixture_team'
const fixtureCompetitionCompleteRedemptionId = 'redemption_competition_complete_fixture_team'
const fixtureCompetitionShortlistCriterionOneId = 'evaluation_criterion_competition_shortlist_novelty'
const fixtureCompetitionShortlistCriterionTwoId = 'evaluation_criterion_competition_shortlist_execution'
const fixtureCompetitionCompleteCriterionOneId = 'evaluation_criterion_competition_complete_novelty'
const fixtureCompetitionCompleteCriterionTwoId = 'evaluation_criterion_competition_complete_execution'

export const platformFixtureIds = {
  hackathonId: fixtureHackathonId,
  apiTeamFormationHackathonId: fixtureApiTeamFormationHackathonId,
  apiSoloTeamHackathonId: fixtureApiSoloTeamHackathonId,
  participantApplicationHackathonId: fixtureParticipantApplicationHackathonId,
  participantProfileRequirementHackathonId: fixtureParticipantProfileRequirementHackathonId,
  participantApprovedHackathonId: fixtureParticipantApprovedHackathonId,
  participantRejectedHackathonId: fixtureParticipantRejectedHackathonId,
  draftHackathonId: fixtureDraftHackathonId,
  operationsHackathonId: fixtureOperationsHackathonId,
  judgingHackathonId: fixtureJudgingHackathonId,
  judgeWorkspaceHackathonId: fixtureJudgeWorkspaceHackathonId,
  outcomesHackathonId: fixtureOutcomesHackathonId,
  prizeWorkspaceHackathonId: fixturePrizeWorkspaceHackathonId,
  competitionReassignHackathonId: fixtureCompetitionReassignHackathonId,
  competitionForceSkipHackathonId: fixtureCompetitionForceSkipHackathonId,
  competitionShortlistHackathonId: fixtureCompetitionShortlistHackathonId,
  competitionCompleteHackathonId: fixtureCompetitionCompleteHackathonId,
  publicOverflowHackathonId: fixturePublicOverflowHackathonId,
  publicArchiveHackathonId: fixturePublicArchiveHackathonId,
  applicationTermsDocumentId: fixtureApplicationTermsId,
  apiTeamFormationApplicationTermsDocumentId: fixtureApiTeamFormationTermsId,
  participantApplicationTermsDocumentId: fixtureParticipantApplicationTermsId,
  participantProfileRequirementTermsDocumentId: fixtureParticipantProfileRequirementTermsId,
  operationsApplicationTermsDocumentId: fixtureOperationsApplicationTermsId,
  judgingApplicationTermsDocumentId: fixtureJudgingApplicationTermsId,
  judgeWorkspaceApplicationTermsDocumentId: fixtureJudgeWorkspaceApplicationTermsId,
  prizeWorkspaceApplicationTermsDocumentId: fixturePrizeWorkspaceApplicationTermsId,
  winnerTermsDocumentId: fixtureWinnerTermsId,
  prizeWorkspaceWinnerTermsDocumentId: fixturePrizeWorkspaceWinnerTermsId,
  outcomesWinnerTermsDocumentId: fixtureOutcomesWinnerTermsId,
  privacyDocumentId: fixturePrivacyDocumentId,
  platformTermsDocumentId: fixtureTermsDocumentId,
  judgingAssignmentId: fixtureJudgingAssignmentId,
  judgingStartedAssignmentId: fixtureJudgingStartedAssignmentId,
  judgeWorkspaceAssignmentId: fixtureJudgeWorkspaceAssignmentId,
  judgeWorkspaceStartedAssignmentId: fixtureJudgeWorkspaceStartedAssignmentId,
  publicCriterionOneId: fixturePublicCriterionOneId,
  publicCriterionTwoId: fixturePublicCriterionTwoId,
  judgingCriterionOneId: fixtureJudgingCriterionOneId,
  judgingCriterionTwoId: fixtureJudgingCriterionTwoId,
  judgeWorkspaceCriterionOneId: fixtureJudgeWorkspaceCriterionOneId,
  judgeWorkspaceCriterionTwoId: fixtureJudgeWorkspaceCriterionTwoId,
  publicPrizeId: fixturePublicPrizeId,
  prizeWorkspacePrizeId: fixturePrizeWorkspacePrizeId,
  prizeWorkspaceRedemptionId: fixturePrizeWorkspaceRedemptionId,
  outcomesSubmissionOneId: fixtureOutcomesSubmissionOneId,
  outcomesSubmissionTwoId: fixtureOutcomesSubmissionTwoId,
  competitionReassignSubmissionId: fixtureCompetitionReassignSubmissionId,
  competitionForceSkipSubmissionId: fixtureCompetitionForceSkipSubmissionId,
  competitionShortlistSubmissionOneId: fixtureCompetitionShortlistSubmissionOneId,
  competitionShortlistSubmissionTwoId: fixtureCompetitionShortlistSubmissionTwoId,
  competitionCompleteSubmissionOneId: fixtureCompetitionCompleteSubmissionOneId,
  competitionCompleteSubmissionTwoId: fixtureCompetitionCompleteSubmissionTwoId,
  competitionCompleteRedemptionId: fixtureCompetitionCompleteRedemptionId,
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
      'null',
      'null',
      sqlLiteral(fixtureTimestamp),
      sqlLiteral(fixtureTimestamp),
      'null'
    ].join(', ')})`
  ]

  return [
    'pragma foreign_keys = on',
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
    'delete from user_auth_identities',
    'delete from users',
    `insert into users (
      id, auth0_subject, email, display_name, is_platform_admin,
      x_profile_url, linkedin_profile_url, github_profile_url, chatgpt_email, openai_org_id,
      created_at, updated_at, deleted_at
    ) values ${[...personas.map(userTuple), ...extraUserTuples].join(', ')}`,
    `insert into platform_documents (
      id, document_type, version, title, content, published_at, created_at
    ) values
      (${sqlLiteral(fixturePrivacyDocumentId)}, 'privacy_policy', 1, 'Privacy Policy', 'E2E privacy policy', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureTermsDocumentId)}, 'platform_terms', 1, 'Platform Terms', 'E2E platform terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into user_platform_document_acceptances (
      id, user_id, platform_document_id, accepted_at
    ) values
      ('acceptance_platform_admin_privacy_fixture', ${sqlLiteral(platformAdminId)}, ${sqlLiteral(fixturePrivacyDocumentId)}, ${sqlLiteral(fixtureTimestamp)}),
      ('acceptance_platform_admin_terms_fixture', ${sqlLiteral(platformAdminId)}, ${sqlLiteral(fixtureTermsDocumentId)}, ${sqlLiteral(fixtureTimestamp)}),
      ('acceptance_hackathon_admin_privacy_fixture', ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixturePrivacyDocumentId)}, ${sqlLiteral(fixtureTimestamp)}),
      ('acceptance_hackathon_admin_terms_fixture', ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureTermsDocumentId)}, ${sqlLiteral(fixtureTimestamp)}),
      ('acceptance_judge_privacy_fixture', ${sqlLiteral(judgeId)}, ${sqlLiteral(fixturePrivacyDocumentId)}, ${sqlLiteral(fixtureTimestamp)}),
      ('acceptance_judge_terms_fixture', ${sqlLiteral(judgeId)}, ${sqlLiteral(fixtureTermsDocumentId)}, ${sqlLiteral(fixtureTimestamp)}),
      ('acceptance_regular_user_privacy_fixture', ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixturePrivacyDocumentId)}, ${sqlLiteral(fixtureTimestamp)}),
      ('acceptance_regular_user_terms_fixture', ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTermsDocumentId)}, ${sqlLiteral(fixtureTimestamp)}),
      ('acceptance_backup_judge_privacy_fixture', ${sqlLiteral(backupJudgeId)}, ${sqlLiteral(fixturePrivacyDocumentId)}, ${sqlLiteral(fixtureTimestamp)}),
      ('acceptance_backup_judge_terms_fixture', ${sqlLiteral(backupJudgeId)}, ${sqlLiteral(fixtureTermsDocumentId)}, ${sqlLiteral(fixtureTimestamp)}),
      ('acceptance_judging_participant_two_privacy_fixture', ${sqlLiteral(judgingParticipantTwoId)}, ${sqlLiteral(fixturePrivacyDocumentId)}, ${sqlLiteral(fixtureTimestamp)}),
      ('acceptance_judging_participant_two_terms_fixture', ${sqlLiteral(judgingParticipantTwoId)}, ${sqlLiteral(fixtureTermsDocumentId)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into hackathons (
      id, name, slug, description, background_image_url, banner_image_url, city, country, address,
      registration_opens_at, registration_closes_at, submission_opens_at, submission_closes_at,
      state, max_team_members, require_x_profile, require_linkedin_profile, require_github_profile, require_chatgpt_email, require_openai_org_id, require_luma_profile,
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
      'Austria',
      'Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-30T12:00:00.000Z',
      '2026-03-30T12:00:00.000Z',
      '2026-04-02T12:00:00.000Z',
      'registration_open',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixtureDraftHackathonId)},
      'Draft Managed Hackathon',
      'draft-managed-hackathon',
      'Draft fixture that should stay hidden on the public discovery surface.',
      null,
      null,
      'Vienna',
      'Austria',
      'Draft Fixture Address',
      '2026-03-27T12:00:00.000Z',
      '2026-03-29T12:00:00.000Z',
      '2026-03-29T12:00:00.000Z',
      '2026-03-31T12:00:00.000Z',
      'draft',
      5,
      0,
      0,
      0,
      0,
      0,
      1,
      null,
      null,
      ${sqlLiteral(platformAdminId)},
      ${sqlLiteral(fixtureTimestamp)},
      ${sqlLiteral(fixtureTimestamp)}
    ),
    (
      ${sqlLiteral(fixtureParticipantApplicationHackathonId)},
      'Participant Application Fixture Hackathon',
      'participant-application-fixture-hackathon',
      'Registration-open fixture used for participant application UI coverage.',
      null,
      null,
      'Vienna',
      'Austria',
      'Participant Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-26T12:00:00.000Z',
      'registration_open',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixtureApiTeamFormationHackathonId)},
      'API Team Formation Fixture Hackathon',
      'api-team-formation-fixture-hackathon',
      'Registration-open fixture reserved for authenticated API application and team-formation coverage.',
      null,
      null,
      'Vienna',
      'Austria',
      'API Team Formation Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-26T12:00:00.000Z',
      'registration_open',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixtureParticipantProfileRequirementHackathonId)},
      'Participant Profile Requirement Fixture Hackathon',
      'participant-profile-requirement-fixture-hackathon',
      'Registration-open fixture that requires ChatGPT email completion before applying.',
      null,
      null,
      'Vienna',
      'Austria',
      'Participant Profile Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-26T12:00:00.000Z',
      'registration_open',
      5,
      0,
      0,
      0,
      1,
      0,
      1,
      null,
      null,
      ${sqlLiteral(platformAdminId)},
      ${sqlLiteral(fixtureTimestamp)},
      ${sqlLiteral(fixtureTimestamp)}
    ),
    (
      ${sqlLiteral(fixtureParticipantApprovedHackathonId)},
      'Participant Approved Fixture Hackathon',
      'participant-approved-fixture-hackathon',
      'Registration-open fixture with an approved participant application.',
      null,
      null,
      'Vienna',
      'Austria',
      'Participant Approved Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-26T12:00:00.000Z',
      'registration_open',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixtureParticipantRejectedHackathonId)},
      'Participant Rejected Fixture Hackathon',
      'participant-rejected-fixture-hackathon',
      'Registration-open fixture with a rejected participant application.',
      null,
      null,
      'Vienna',
      'Austria',
      'Participant Rejected Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-26T12:00:00.000Z',
      'registration_open',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixtureParticipantTeamCreateHackathonId)},
      'Participant Team Create Fixture Hackathon',
      'participant-team-create-fixture-hackathon',
      'Registration-open fixture for participant team creation UI coverage.',
      null,
      null,
      'Vienna',
      'Austria',
      'Participant Team Create Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-26T12:00:00.000Z',
      'registration_open',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixtureParticipantTeamJoinHackathonId)},
      'Participant Team Join Fixture Hackathon',
      'participant-team-join-fixture-hackathon',
      'Registration-open fixture for participant team browse, join, and join-request review coverage.',
      null,
      null,
      'Vienna',
      'Austria',
      'Participant Team Join Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-26T12:00:00.000Z',
      'registration_open',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixtureParticipantTeamSoloHackathonId)},
      'Participant Team Solo Fixture Hackathon',
      'participant-team-solo-fixture-hackathon',
      'Registration-open fixture for blocked solo-admin team workspace coverage.',
      null,
      null,
      'Vienna',
      'Austria',
      'Participant Team Solo Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-26T12:00:00.000Z',
      'registration_open',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixtureApiSoloTeamHackathonId)},
      'API Solo Team Fixture Hackathon',
      'api-solo-team-fixture-hackathon',
      'Registration-open fixture reserved for authenticated API solo-team leave protection coverage.',
      null,
      null,
      'Vienna',
      'Austria',
      'API Solo Team Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      '2026-03-26T12:00:00.000Z',
      'registration_open',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixtureParticipantSubmissionCreateHackathonId)},
      'Participant Submission Create Fixture Hackathon',
      'participant-submission-create-fixture-hackathon',
      'Submission-open fixture for participant draft, submit, and withdraw coverage.',
      null,
      null,
      'Vienna',
      'Austria',
      'Participant Submission Create Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-21T12:00:00.000Z',
      '2026-03-21T12:00:00.000Z',
      '2026-03-26T12:00:00.000Z',
      'submission_open',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixtureParticipantSubmissionLockedHackathonId)},
      'Participant Submission Locked Fixture Hackathon',
      'participant-submission-locked-fixture-hackathon',
      'Judge-review fixture for read-only participant submission coverage after locking.',
      null,
      null,
      'Vienna',
      'Austria',
      'Participant Submission Locked Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-21T12:00:00.000Z',
      '2026-03-21T12:00:00.000Z',
      '2026-03-24T12:00:00.000Z',
      'judge_review',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixturePrizeWorkspaceHackathonId)},
      'Prize Workspace Fixture Hackathon',
      'prize-workspace-fixture-hackathon',
      'Winners-announced fixture for the dedicated prize-redemption workspace UI.',
      null,
      null,
      'Vienna',
      'Austria',
      'Prize Workspace Fixture Address',
      '2026-03-08T12:00:00.000Z',
      '2026-03-10T12:00:00.000Z',
      '2026-03-10T12:00:00.000Z',
      '2026-03-12T12:00:00.000Z',
      'winners_announced',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixtureOperationsHackathonId)},
      'Operations Fixture Hackathon',
      'operations-fixture-hackathon',
      'Submission-open admin operations fixture for pagination and intervention coverage.',
      null,
      null,
      'Berlin',
      'Germany',
      'Operations Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-21T12:00:00.000Z',
      '2026-03-21T12:00:00.000Z',
      '2026-03-25T12:00:00.000Z',
      'submission_open',
      5,
      0,
      0,
      0,
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
      'Austria',
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
      ${sqlLiteral(fixtureJudgeWorkspaceHackathonId)},
      'E2E Judge Workspace Fixture Hackathon',
      'e2e-judge-workspace-fixture-hackathon',
      'Fixture hackathon for blind judge workspace UI coverage.',
      null,
      null,
      'Vienna',
      'Austria',
      'Judge Workspace Fixture Address',
      '2026-03-11T12:00:00.000Z',
      '2026-03-13T12:00:00.000Z',
      '2026-03-13T12:00:00.000Z',
      '2026-03-15T12:00:00.000Z',
      'judge_review',
      5,
      0,
      0,
      0,
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
      'Austria',
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
      ${sqlLiteral(fixtureCompetitionReassignHackathonId)},
      'Competition Reassign Fixture Hackathon',
      'competition-reassign-fixture-hackathon',
      'Judging-preparation fixture for admin reassignment coverage in the competition workspace.',
      null,
      null,
      'Vienna',
      'Austria',
      'Competition Reassign Fixture Address',
      '2026-03-08T12:00:00.000Z',
      '2026-03-10T12:00:00.000Z',
      '2026-03-10T12:00:00.000Z',
      '2026-03-12T12:00:00.000Z',
      'judging_preparation',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixtureCompetitionForceSkipHackathonId)},
      'Competition Force Skip Fixture Hackathon',
      'competition-force-skip-fixture-hackathon',
      'Judge-review fixture for admin force-skip coverage in the competition workspace.',
      null,
      null,
      'Vienna',
      'Austria',
      'Competition Force Skip Fixture Address',
      '2026-03-08T12:00:00.000Z',
      '2026-03-10T12:00:00.000Z',
      '2026-03-10T12:00:00.000Z',
      '2026-03-12T12:00:00.000Z',
      'judge_review',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixtureCompetitionShortlistHackathonId)},
      'Competition Shortlist Fixture Hackathon',
      'competition-shortlist-fixture-hackathon',
      'Shortlist fixture for final ranking reorder and winner announcement coverage in the competition workspace.',
      null,
      null,
      'Vienna',
      'Austria',
      'Competition Shortlist Fixture Address',
      '2026-03-08T12:00:00.000Z',
      '2026-03-10T12:00:00.000Z',
      '2026-03-10T12:00:00.000Z',
      '2026-03-12T12:00:00.000Z',
      'shortlist',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixtureCompetitionCompleteHackathonId)},
      'Competition Complete Fixture Hackathon',
      'competition-complete-fixture-hackathon',
      'Winners-announced fixture for completion coverage in the competition workspace.',
      null,
      null,
      'Vienna',
      'Austria',
      'Competition Complete Fixture Address',
      '2026-03-08T12:00:00.000Z',
      '2026-03-10T12:00:00.000Z',
      '2026-03-10T12:00:00.000Z',
      '2026-03-12T12:00:00.000Z',
      'winners_announced',
      5,
      0,
      0,
      0,
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
      ${sqlLiteral(fixturePublicOverflowHackathonId)},
      'Public Overflow Fixture Hackathon',
      'public-overflow-fixture-hackathon',
      'Extra visible fixture to exercise paginated public discovery.',
      null,
      null,
      'Vienna',
      'Austria',
      'Overflow Fixture Address',
      '2026-03-06T12:00:00.000Z',
      '2026-03-08T12:00:00.000Z',
      '2026-03-08T12:00:00.000Z',
      '2026-03-10T12:00:00.000Z',
      'completed',
      4,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      null,
      ${sqlLiteral(platformAdminId)},
      '2026-03-21T12:00:00.000Z',
      '2026-03-21T12:00:00.000Z'
    ),
    (
      ${sqlLiteral(fixturePublicArchiveHackathonId)},
      'Public Archive Fixture Hackathon',
      'public-archive-fixture-hackathon',
      'Older visible fixture that should appear after loading more public hackathons.',
      null,
      null,
      'Vienna',
      'Austria',
      'Archive Fixture Address',
      '2026-03-04T12:00:00.000Z',
      '2026-03-06T12:00:00.000Z',
      '2026-03-06T12:00:00.000Z',
      '2026-03-08T12:00:00.000Z',
      'completed',
      4,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      null,
      ${sqlLiteral(platformAdminId)},
      '2026-03-20T12:00:00.000Z',
      '2026-03-20T12:00:00.000Z'
    )`,
    `insert into hackathon_terms_documents (
      id, hackathon_id, document_type, version, title, content, published_at, created_at
    ) values
      (${sqlLiteral(fixtureApplicationTermsId)}, ${sqlLiteral(fixtureHackathonId)}, 'application_terms', 1, 'Application Terms', 'E2E application terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureParticipantApplicationTermsId)}, ${sqlLiteral(fixtureParticipantApplicationHackathonId)}, 'application_terms', 1, 'Participant Application Terms', 'E2E participant application terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureApiTeamFormationTermsId)}, ${sqlLiteral(fixtureApiTeamFormationHackathonId)}, 'application_terms', 1, 'API Team Formation Terms', 'E2E API team formation terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureParticipantProfileRequirementTermsId)}, ${sqlLiteral(fixtureParticipantProfileRequirementHackathonId)}, 'application_terms', 1, 'Participant Profile Requirement Terms', 'E2E participant profile requirement terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureParticipantApprovedTermsId)}, ${sqlLiteral(fixtureParticipantApprovedHackathonId)}, 'application_terms', 1, 'Participant Approved Terms', 'E2E participant approved terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureParticipantRejectedTermsId)}, ${sqlLiteral(fixtureParticipantRejectedHackathonId)}, 'application_terms', 1, 'Participant Rejected Terms', 'E2E participant rejected terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureParticipantTeamCreateTermsId)}, ${sqlLiteral(fixtureParticipantTeamCreateHackathonId)}, 'application_terms', 1, 'Participant Team Create Terms', 'E2E participant team-create terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureParticipantTeamJoinTermsId)}, ${sqlLiteral(fixtureParticipantTeamJoinHackathonId)}, 'application_terms', 1, 'Participant Team Join Terms', 'E2E participant team-join terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureParticipantTeamSoloTermsId)}, ${sqlLiteral(fixtureParticipantTeamSoloHackathonId)}, 'application_terms', 1, 'Participant Team Solo Terms', 'E2E participant team-solo terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureApiSoloTeamTermsId)}, ${sqlLiteral(fixtureApiSoloTeamHackathonId)}, 'application_terms', 1, 'API Solo Team Terms', 'E2E API solo team terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureParticipantSubmissionCreateTermsId)}, ${sqlLiteral(fixtureParticipantSubmissionCreateHackathonId)}, 'application_terms', 1, 'Participant Submission Create Terms', 'E2E participant submission-create terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureParticipantSubmissionLockedTermsId)}, ${sqlLiteral(fixtureParticipantSubmissionLockedHackathonId)}, 'application_terms', 1, 'Participant Submission Locked Terms', 'E2E participant submission-locked terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixturePrizeWorkspaceApplicationTermsId)}, ${sqlLiteral(fixturePrizeWorkspaceHackathonId)}, 'application_terms', 1, 'Prize Workspace Application Terms', 'E2E prize workspace application terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureOperationsApplicationTermsId)}, ${sqlLiteral(fixtureOperationsHackathonId)}, 'application_terms', 1, 'Operations Application Terms', 'E2E operations application terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureWinnerTermsId)}, ${sqlLiteral(fixtureHackathonId)}, 'winner_terms', 1, 'Winner Terms', 'E2E winner terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixturePrizeWorkspaceWinnerTermsId)}, ${sqlLiteral(fixturePrizeWorkspaceHackathonId)}, 'winner_terms', 1, 'Prize Workspace Winner Terms', 'E2E prize workspace winner terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureJudgingApplicationTermsId)}, ${sqlLiteral(fixtureJudgingHackathonId)}, 'application_terms', 1, 'Judging Application Terms', 'E2E judging application terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureJudgeWorkspaceApplicationTermsId)}, ${sqlLiteral(fixtureJudgeWorkspaceHackathonId)}, 'application_terms', 1, 'Judge Workspace Application Terms', 'E2E judge workspace application terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureOutcomesWinnerTermsId)}, ${sqlLiteral(fixtureOutcomesHackathonId)}, 'winner_terms', 1, 'Outcomes Winner Terms', 'E2E outcomes winner terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionShortlistWinnerTermsId)}, ${sqlLiteral(fixtureCompetitionShortlistHackathonId)}, 'winner_terms', 1, 'Competition Shortlist Winner Terms', 'E2E competition shortlist winner terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionCompleteWinnerTermsId)}, ${sqlLiteral(fixtureCompetitionCompleteHackathonId)}, 'winner_terms', 1, 'Competition Complete Winner Terms', 'E2E competition complete winner terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `update hackathons
      set luma_event_url = ${sqlLiteral(fixtureDraftLumaEventUrl)}
      where id = ${sqlLiteral(fixtureDraftHackathonId)}`,
    `insert into hackathon_role_assignments (
      id, hackathon_id, user_id, role, is_in_judge_pool, created_at
    ) values
      ('role_hackathon_admin_fixture', ${sqlLiteral(fixtureHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_judge_fixture', ${sqlLiteral(fixtureHackathonId)}, ${sqlLiteral(judgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_hackathon_admin_participant_application_fixture', ${sqlLiteral(fixtureParticipantApplicationHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_hackathon_admin_api_team_formation_fixture', ${sqlLiteral(fixtureApiTeamFormationHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_judge_api_team_formation_fixture', ${sqlLiteral(fixtureApiTeamFormationHackathonId)}, ${sqlLiteral(judgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_hackathon_admin_operations_fixture', ${sqlLiteral(fixtureOperationsHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_hackathon_admin_judging_fixture', ${sqlLiteral(fixtureJudgingHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_judge_judging_fixture', ${sqlLiteral(fixtureJudgingHackathonId)}, ${sqlLiteral(judgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_backup_judge_judging_fixture', ${sqlLiteral(fixtureJudgingHackathonId)}, ${sqlLiteral(backupJudgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_hackathon_admin_judge_workspace_fixture', ${sqlLiteral(fixtureJudgeWorkspaceHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_judge_judge_workspace_fixture', ${sqlLiteral(fixtureJudgeWorkspaceHackathonId)}, ${sqlLiteral(judgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_backup_judge_judge_workspace_fixture', ${sqlLiteral(fixtureJudgeWorkspaceHackathonId)}, ${sqlLiteral(backupJudgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_hackathon_admin_outcomes_fixture', ${sqlLiteral(fixtureOutcomesHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_judge_outcomes_fixture', ${sqlLiteral(fixtureOutcomesHackathonId)}, ${sqlLiteral(judgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_hackathon_admin_competition_reassign_fixture', ${sqlLiteral(fixtureCompetitionReassignHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_judge_competition_reassign_fixture', ${sqlLiteral(fixtureCompetitionReassignHackathonId)}, ${sqlLiteral(judgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_backup_judge_competition_reassign_fixture', ${sqlLiteral(fixtureCompetitionReassignHackathonId)}, ${sqlLiteral(backupJudgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_hackathon_admin_competition_force_skip_fixture', ${sqlLiteral(fixtureCompetitionForceSkipHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_judge_competition_force_skip_fixture', ${sqlLiteral(fixtureCompetitionForceSkipHackathonId)}, ${sqlLiteral(judgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_backup_judge_competition_force_skip_fixture', ${sqlLiteral(fixtureCompetitionForceSkipHackathonId)}, ${sqlLiteral(backupJudgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_hackathon_admin_competition_shortlist_fixture', ${sqlLiteral(fixtureCompetitionShortlistHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_judge_competition_shortlist_fixture', ${sqlLiteral(fixtureCompetitionShortlistHackathonId)}, ${sqlLiteral(judgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)}),
      ('role_hackathon_admin_competition_complete_fixture', ${sqlLiteral(fixtureCompetitionCompleteHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_judge_competition_complete_fixture', ${sqlLiteral(fixtureCompetitionCompleteHackathonId)}, ${sqlLiteral(judgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into user_applications (
      id, hackathon_id, user_id, status, submitted_at, reviewed_at, reviewed_by_user_id,
      application_terms_document_id, application_terms_accepted_at, created_at, updated_at
    ) values
      ('application_platform_admin_fixture', ${sqlLiteral(fixtureHackathonId)}, ${sqlLiteral(platformAdminId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_judge_fixture', ${sqlLiteral(fixtureHackathonId)}, ${sqlLiteral(judgeId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_fixture_submitted', ${sqlLiteral(fixtureHackathonId)}, ${sqlLiteral(regularUserId)}, 'submitted', ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_judging_participant_two_fixture_submitted', ${sqlLiteral(fixtureHackathonId)}, ${sqlLiteral(judgingParticipantTwoId)}, 'submitted', ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_judge_participant_application_fixture', ${sqlLiteral(fixtureParticipantApplicationHackathonId)}, ${sqlLiteral(judgeId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureParticipantApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_judge_api_team_formation_fixture', ${sqlLiteral(fixtureApiTeamFormationHackathonId)}, ${sqlLiteral(judgeId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureApiTeamFormationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_participant_approved_fixture', ${sqlLiteral(fixtureParticipantApprovedHackathonId)}, ${sqlLiteral(regularUserId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureParticipantApprovedTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_participant_rejected_fixture', ${sqlLiteral(fixtureParticipantRejectedHackathonId)}, ${sqlLiteral(regularUserId)}, 'rejected', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureParticipantRejectedTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_participant_team_create_fixture', ${sqlLiteral(fixtureParticipantTeamCreateHackathonId)}, ${sqlLiteral(regularUserId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureParticipantTeamCreateTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_participant_team_join_fixture', ${sqlLiteral(fixtureParticipantTeamJoinHackathonId)}, ${sqlLiteral(regularUserId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureParticipantTeamJoinTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_judge_participant_team_join_fixture', ${sqlLiteral(fixtureParticipantTeamJoinHackathonId)}, ${sqlLiteral(judgeId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureParticipantTeamJoinTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_participant_team_solo_fixture', ${sqlLiteral(fixtureParticipantTeamSoloHackathonId)}, ${sqlLiteral(regularUserId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureParticipantTeamSoloTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_platform_admin_api_solo_team_fixture', ${sqlLiteral(fixtureApiSoloTeamHackathonId)}, ${sqlLiteral(platformAdminId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureApiSoloTeamTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_participant_submission_create_fixture', ${sqlLiteral(fixtureParticipantSubmissionCreateHackathonId)}, ${sqlLiteral(regularUserId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureParticipantSubmissionCreateTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_participant_submission_locked_fixture', ${sqlLiteral(fixtureParticipantSubmissionLockedHackathonId)}, ${sqlLiteral(regularUserId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureParticipantSubmissionLockedTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_prize_workspace_fixture', ${sqlLiteral(fixturePrizeWorkspaceHackathonId)}, ${sqlLiteral(regularUserId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixturePrizeWorkspaceApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_operations_fixture', ${sqlLiteral(fixtureOperationsHackathonId)}, ${sqlLiteral(regularUserId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureOperationsApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_judging_participant_two_operations_fixture', ${sqlLiteral(fixtureOperationsHackathonId)}, ${sqlLiteral(judgingParticipantTwoId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureOperationsApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_judge_operations_fixture', ${sqlLiteral(fixtureOperationsHackathonId)}, ${sqlLiteral(judgeId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureOperationsApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_backup_judge_operations_fixture', ${sqlLiteral(fixtureOperationsHackathonId)}, ${sqlLiteral(backupJudgeId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureOperationsApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_judging_fixture', ${sqlLiteral(fixtureJudgingHackathonId)}, ${sqlLiteral(regularUserId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureJudgingApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_participant_two_judging_fixture', ${sqlLiteral(fixtureJudgingHackathonId)}, ${sqlLiteral(judgingParticipantTwoId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureJudgingApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_judge_workspace_fixture', ${sqlLiteral(fixtureJudgeWorkspaceHackathonId)}, ${sqlLiteral(regularUserId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureJudgeWorkspaceApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_participant_two_judge_workspace_fixture', ${sqlLiteral(fixtureJudgeWorkspaceHackathonId)}, ${sqlLiteral(judgingParticipantTwoId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureJudgeWorkspaceApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_regular_user_outcomes_fixture', ${sqlLiteral(fixtureOutcomesHackathonId)}, ${sqlLiteral(regularUserId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('application_judge_outcomes_fixture', ${sqlLiteral(fixtureOutcomesHackathonId)}, ${sqlLiteral(judgeId)}, 'approved', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(hackathonAdminId)}, ${sqlLiteral(fixtureApplicationTermsId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into teams (
      id, hackathon_id, name, slug, is_open_to_join_requests, created_by_user_id, created_at, updated_at
    ) values
      ('team_participant_join_fixture', ${sqlLiteral(fixtureParticipantTeamJoinHackathonId)}, 'Judge Review Team', 'judge-review-team', 1, ${sqlLiteral(judgeId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_participant_solo_fixture', ${sqlLiteral(fixtureParticipantTeamSoloHackathonId)}, 'Solo Admin Team', 'solo-admin-team', 1, ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_participant_submission_create_fixture', ${sqlLiteral(fixtureParticipantSubmissionCreateHackathonId)}, 'Submission Launch Team', 'submission-launch-team', 0, ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_participant_submission_locked_fixture', ${sqlLiteral(fixtureParticipantSubmissionLockedHackathonId)}, 'Locked Review Team', 'locked-review-team', 0, ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_prize_workspace_fixture', ${sqlLiteral(fixturePrizeWorkspaceHackathonId)}, 'Prize Workspace Team', 'prize-workspace-team', 0, ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_operations_fixture_alpha', ${sqlLiteral(fixtureOperationsHackathonId)}, 'Alpha Operations Team', 'alpha-operations-team', 0, ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_operations_fixture_beta', ${sqlLiteral(fixtureOperationsHackathonId)}, 'Beta Operations Team', 'beta-operations-team', 0, ${sqlLiteral(judgingParticipantTwoId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_operations_fixture_gamma', ${sqlLiteral(fixtureOperationsHackathonId)}, 'Gamma Operations Team', 'gamma-operations-team', 0, ${sqlLiteral(judgeId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_operations_fixture_zeta', ${sqlLiteral(fixtureOperationsHackathonId)}, 'Zeta Operations Team', 'zeta-operations-team', 0, ${sqlLiteral(backupJudgeId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_judging_fixture_one', ${sqlLiteral(fixtureJudgingHackathonId)}, 'Fixture Judging Team One', 'fixture-judging-team-one', 0, ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_judging_fixture_two', ${sqlLiteral(fixtureJudgingHackathonId)}, 'Fixture Judging Team Two', 'fixture-judging-team-two', 0, ${sqlLiteral(judgingParticipantTwoId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_judge_workspace_fixture_one', ${sqlLiteral(fixtureJudgeWorkspaceHackathonId)}, 'Fixture Judge Workspace Team One', 'fixture-judge-workspace-team-one', 0, ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_judge_workspace_fixture_two', ${sqlLiteral(fixtureJudgeWorkspaceHackathonId)}, 'Fixture Judge Workspace Team Two', 'fixture-judge-workspace-team-two', 0, ${sqlLiteral(judgingParticipantTwoId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_outcomes_fixture_one', ${sqlLiteral(fixtureOutcomesHackathonId)}, 'Fixture Outcomes Team One', 'fixture-outcomes-team-one', 0, ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_outcomes_fixture_two', ${sqlLiteral(fixtureOutcomesHackathonId)}, 'Fixture Outcomes Team Two', 'fixture-outcomes-team-two', 0, ${sqlLiteral(judgeId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_competition_reassign_fixture', ${sqlLiteral(fixtureCompetitionReassignHackathonId)}, 'Competition Reassign Team', 'competition-reassign-team', 0, ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_competition_force_skip_fixture', ${sqlLiteral(fixtureCompetitionForceSkipHackathonId)}, 'Competition Force Skip Team', 'competition-force-skip-team', 0, ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_competition_shortlist_fixture_one', ${sqlLiteral(fixtureCompetitionShortlistHackathonId)}, 'Competition Shortlist Team One', 'competition-shortlist-team-one', 0, ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_competition_shortlist_fixture_two', ${sqlLiteral(fixtureCompetitionShortlistHackathonId)}, 'Competition Shortlist Team Two', 'competition-shortlist-team-two', 0, ${sqlLiteral(judgingParticipantTwoId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_competition_complete_fixture_one', ${sqlLiteral(fixtureCompetitionCompleteHackathonId)}, 'Competition Complete Team One', 'competition-complete-team-one', 0, ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('team_competition_complete_fixture_two', ${sqlLiteral(fixtureCompetitionCompleteHackathonId)}, 'Competition Complete Team Two', 'competition-complete-team-two', 0, ${sqlLiteral(judgingParticipantTwoId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into team_members (
      id, team_id, user_id, role, joined_at, left_at, created_at
    ) values
      ('membership_participant_join_fixture_admin', 'team_participant_join_fixture', ${sqlLiteral(judgeId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_participant_solo_fixture_admin', 'team_participant_solo_fixture', ${sqlLiteral(regularUserId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_participant_submission_create_fixture_admin', 'team_participant_submission_create_fixture', ${sqlLiteral(regularUserId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_participant_submission_locked_fixture_admin', 'team_participant_submission_locked_fixture', ${sqlLiteral(regularUserId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_prize_workspace_fixture_admin', 'team_prize_workspace_fixture', ${sqlLiteral(regularUserId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_operations_fixture_alpha', 'team_operations_fixture_alpha', ${sqlLiteral(regularUserId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_operations_fixture_beta', 'team_operations_fixture_beta', ${sqlLiteral(judgingParticipantTwoId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_operations_fixture_gamma', 'team_operations_fixture_gamma', ${sqlLiteral(judgeId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_operations_fixture_zeta', 'team_operations_fixture_zeta', ${sqlLiteral(backupJudgeId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_judging_fixture_one', 'team_judging_fixture_one', ${sqlLiteral(regularUserId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_judging_fixture_two', 'team_judging_fixture_two', ${sqlLiteral(judgingParticipantTwoId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_judge_workspace_fixture_one', 'team_judge_workspace_fixture_one', ${sqlLiteral(regularUserId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_judge_workspace_fixture_two', 'team_judge_workspace_fixture_two', ${sqlLiteral(judgingParticipantTwoId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_outcomes_fixture_one', 'team_outcomes_fixture_one', ${sqlLiteral(regularUserId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_outcomes_fixture_two', 'team_outcomes_fixture_two', ${sqlLiteral(judgeId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_competition_reassign_fixture', 'team_competition_reassign_fixture', ${sqlLiteral(regularUserId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_competition_force_skip_fixture', 'team_competition_force_skip_fixture', ${sqlLiteral(regularUserId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_competition_shortlist_fixture_one', 'team_competition_shortlist_fixture_one', ${sqlLiteral(regularUserId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_competition_shortlist_fixture_two', 'team_competition_shortlist_fixture_two', ${sqlLiteral(judgingParticipantTwoId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_competition_complete_fixture_one', 'team_competition_complete_fixture_one', ${sqlLiteral(regularUserId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)}),
      ('membership_competition_complete_fixture_two', 'team_competition_complete_fixture_two', ${sqlLiteral(judgingParticipantTwoId)}, 'admin', ${sqlLiteral(fixtureTimestamp)}, null, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into submissions (
      id, team_id, status, project_name, summary, repository_url, demo_url, submitted_at, locked_at, withdrawn_at, disqualified_at, created_at, updated_at
    ) values
      ('submission_participant_submission_locked_fixture', 'team_participant_submission_locked_fixture', 'locked', 'Locked Review Project', 'Locked fixture summary for participant submission visibility.', 'https://example.com/locked-review-project', 'https://example.com/locked-review-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('submission_operations_fixture_alpha', 'team_operations_fixture_alpha', 'submitted', 'Operations Project Alpha', 'Operations fixture summary alpha', 'https://example.com/operations-fixture-alpha', 'https://example.com/operations-fixture-alpha-demo', ${sqlLiteral(fixtureTimestamp)}, null, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('submission_operations_fixture_beta', 'team_operations_fixture_beta', 'draft', 'Operations Project Beta', 'Operations fixture summary beta', 'https://example.com/operations-fixture-beta', 'https://example.com/operations-fixture-beta-demo', null, null, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('submission_operations_fixture_gamma', 'team_operations_fixture_gamma', 'submitted', 'Operations Project Gamma', 'Operations fixture summary gamma', 'https://example.com/operations-fixture-gamma', 'https://example.com/operations-fixture-gamma-demo', ${sqlLiteral(fixtureTimestamp)}, null, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('submission_judging_fixture_one', 'team_judging_fixture_one', 'locked', 'Fixture Project One', 'Blind fixture summary one', 'https://example.com/judging-fixture-one', 'https://example.com/judging-fixture-one-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('submission_judging_fixture_two', 'team_judging_fixture_two', 'locked', 'Fixture Project Two', 'Blind fixture summary two', 'https://example.com/judging-fixture-two', 'https://example.com/judging-fixture-two-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('submission_judge_workspace_fixture_one', 'team_judge_workspace_fixture_one', 'locked', 'Workspace Project One', 'Blind workspace summary one', 'https://example.com/workspace-fixture-one', 'https://example.com/workspace-fixture-one-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('submission_judge_workspace_fixture_two', 'team_judge_workspace_fixture_two', 'locked', 'Workspace Project Two', 'Blind workspace summary two', 'https://example.com/workspace-fixture-two', 'https://example.com/workspace-fixture-two-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureOutcomesSubmissionOneId)}, 'team_outcomes_fixture_one', 'locked', 'Fixture Outcomes Project One', 'Outcomes summary one', 'https://example.com/outcomes-fixture-one', 'https://example.com/outcomes-fixture-one-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureOutcomesSubmissionTwoId)}, 'team_outcomes_fixture_two', 'locked', 'Fixture Outcomes Project Two', 'Outcomes summary two', 'https://example.com/outcomes-fixture-two', 'https://example.com/outcomes-fixture-two-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionReassignSubmissionId)}, 'team_competition_reassign_fixture', 'locked', 'Competition Reassign Project', 'Competition reassign summary', 'https://example.com/competition-reassign', 'https://example.com/competition-reassign-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionForceSkipSubmissionId)}, 'team_competition_force_skip_fixture', 'locked', 'Competition Force Skip Project', 'Competition force-skip summary', 'https://example.com/competition-force-skip', 'https://example.com/competition-force-skip-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionShortlistSubmissionOneId)}, 'team_competition_shortlist_fixture_one', 'locked', 'Competition Shortlist Project One', 'Competition shortlist summary one', 'https://example.com/competition-shortlist-one', 'https://example.com/competition-shortlist-one-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionShortlistSubmissionTwoId)}, 'team_competition_shortlist_fixture_two', 'locked', 'Competition Shortlist Project Two', 'Competition shortlist summary two', 'https://example.com/competition-shortlist-two', 'https://example.com/competition-shortlist-two-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionCompleteSubmissionOneId)}, 'team_competition_complete_fixture_one', 'locked', 'Competition Complete Project One', 'Competition complete summary one', 'https://example.com/competition-complete-one', 'https://example.com/competition-complete-one-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionCompleteSubmissionTwoId)}, 'team_competition_complete_fixture_two', 'locked', 'Competition Complete Project Two', 'Competition complete summary two', 'https://example.com/competition-complete-two', 'https://example.com/competition-complete-two-demo', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into evaluation_criteria (
      id, hackathon_id, name, description, weight, display_order, created_at
    ) values
      (${sqlLiteral(fixturePublicCriterionOneId)}, ${sqlLiteral(fixtureHackathonId)}, 'Community Impact', 'Measures how clearly the project serves participants and organizers.', 60, 1, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixturePublicCriterionTwoId)}, ${sqlLiteral(fixtureHackathonId)}, 'Technical Craft', 'Measures execution quality, reliability, and polish.', 40, 2, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureJudgingCriterionOneId)}, ${sqlLiteral(fixtureJudgingHackathonId)}, 'Novelty', 'Judging fixture novelty criterion', 50, 1, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureJudgingCriterionTwoId)}, ${sqlLiteral(fixtureJudgingHackathonId)}, 'Execution', 'Judging fixture execution criterion', 50, 2, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureJudgeWorkspaceCriterionOneId)}, ${sqlLiteral(fixtureJudgeWorkspaceHackathonId)}, 'Clarity', 'Judge workspace clarity criterion', 40, 1, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureJudgeWorkspaceCriterionTwoId)}, ${sqlLiteral(fixtureJudgeWorkspaceHackathonId)}, 'Impact', 'Judge workspace impact criterion', 60, 2, ${sqlLiteral(fixtureTimestamp)}),
      ('evaluation_criterion_outcomes_fixture_novelty', ${sqlLiteral(fixtureOutcomesHackathonId)}, 'Novelty', 'Outcomes fixture novelty criterion', 50, 1, ${sqlLiteral(fixtureTimestamp)}),
      ('evaluation_criterion_outcomes_fixture_execution', ${sqlLiteral(fixtureOutcomesHackathonId)}, 'Execution', 'Outcomes fixture execution criterion', 50, 2, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionShortlistCriterionOneId)}, ${sqlLiteral(fixtureCompetitionShortlistHackathonId)}, 'Novelty', 'Competition shortlist novelty criterion', 50, 1, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionShortlistCriterionTwoId)}, ${sqlLiteral(fixtureCompetitionShortlistHackathonId)}, 'Execution', 'Competition shortlist execution criterion', 50, 2, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionCompleteCriterionOneId)}, ${sqlLiteral(fixtureCompetitionCompleteHackathonId)}, 'Novelty', 'Competition complete novelty criterion', 50, 1, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionCompleteCriterionTwoId)}, ${sqlLiteral(fixtureCompetitionCompleteHackathonId)}, 'Execution', 'Competition complete execution criterion', 50, 2, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into judge_assignments (
      id, hackathon_id, submission_id, judge_user_id, status, assigned_at, started_at, completed_at, skipped_at, skipped_by_user_id, skip_reason, ineligibility_status, ineligibility_reason, ineligibility_marked_at, ineligibility_marked_by_user_id, created_at
    ) values
      (${sqlLiteral(fixtureJudgingAssignmentId)}, ${sqlLiteral(fixtureJudgingHackathonId)}, 'submission_judging_fixture_one', ${sqlLiteral(judgeId)}, 'assigned', ${sqlLiteral(fixtureTimestamp)}, null, null, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureJudgingStartedAssignmentId)}, ${sqlLiteral(fixtureJudgingHackathonId)}, 'submission_judging_fixture_two', ${sqlLiteral(judgeId)}, 'judge_started', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureJudgeWorkspaceAssignmentId)}, ${sqlLiteral(fixtureJudgeWorkspaceHackathonId)}, 'submission_judge_workspace_fixture_one', ${sqlLiteral(judgeId)}, 'assigned', ${sqlLiteral(fixtureTimestamp)}, null, null, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureJudgeWorkspaceStartedAssignmentId)}, ${sqlLiteral(fixtureJudgeWorkspaceHackathonId)}, 'submission_judge_workspace_fixture_two', ${sqlLiteral(judgeId)}, 'judge_started', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_assignment_outcomes_fixture_one', ${sqlLiteral(fixtureOutcomesHackathonId)}, ${sqlLiteral(fixtureOutcomesSubmissionOneId)}, ${sqlLiteral(judgeId)}, 'judge_completed', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_assignment_outcomes_fixture_two', ${sqlLiteral(fixtureOutcomesHackathonId)}, ${sqlLiteral(fixtureOutcomesSubmissionTwoId)}, ${sqlLiteral(judgeId)}, 'judge_completed', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_assignment_competition_reassign_fixture', ${sqlLiteral(fixtureCompetitionReassignHackathonId)}, ${sqlLiteral(fixtureCompetitionReassignSubmissionId)}, ${sqlLiteral(judgeId)}, 'assigned', ${sqlLiteral(fixtureTimestamp)}, null, null, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_assignment_competition_force_skip_fixture', ${sqlLiteral(fixtureCompetitionForceSkipHackathonId)}, ${sqlLiteral(fixtureCompetitionForceSkipSubmissionId)}, ${sqlLiteral(judgeId)}, 'judge_started', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_assignment_competition_shortlist_fixture_one', ${sqlLiteral(fixtureCompetitionShortlistHackathonId)}, ${sqlLiteral(fixtureCompetitionShortlistSubmissionOneId)}, ${sqlLiteral(judgeId)}, 'judge_completed', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_assignment_competition_shortlist_fixture_two', ${sqlLiteral(fixtureCompetitionShortlistHackathonId)}, ${sqlLiteral(fixtureCompetitionShortlistSubmissionTwoId)}, ${sqlLiteral(judgeId)}, 'judge_completed', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_assignment_competition_complete_fixture_one', ${sqlLiteral(fixtureCompetitionCompleteHackathonId)}, ${sqlLiteral(fixtureCompetitionCompleteSubmissionOneId)}, ${sqlLiteral(judgeId)}, 'judge_completed', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_assignment_competition_complete_fixture_two', ${sqlLiteral(fixtureCompetitionCompleteHackathonId)}, ${sqlLiteral(fixtureCompetitionCompleteSubmissionTwoId)}, ${sqlLiteral(judgeId)}, 'judge_completed', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}, null, null, null, 'eligible', null, null, null, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into judge_criterion_scores (
      id, judge_assignment_id, evaluation_criterion_id, score, comment, created_at, updated_at
    ) values
      ('judge_score_outcomes_fixture_one_novelty', 'judge_assignment_outcomes_fixture_one', 'evaluation_criterion_outcomes_fixture_novelty', 9, 'Strong novelty', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_score_outcomes_fixture_one_execution', 'judge_assignment_outcomes_fixture_one', 'evaluation_criterion_outcomes_fixture_execution', 8, 'Strong execution', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_score_outcomes_fixture_two_novelty', 'judge_assignment_outcomes_fixture_two', 'evaluation_criterion_outcomes_fixture_novelty', 7, 'Good novelty', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_score_outcomes_fixture_two_execution', 'judge_assignment_outcomes_fixture_two', 'evaluation_criterion_outcomes_fixture_execution', 6, 'Good execution', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_score_competition_shortlist_fixture_one_novelty', 'judge_assignment_competition_shortlist_fixture_one', ${sqlLiteral(fixtureCompetitionShortlistCriterionOneId)}, 9, 'Excellent novelty', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_score_competition_shortlist_fixture_one_execution', 'judge_assignment_competition_shortlist_fixture_one', ${sqlLiteral(fixtureCompetitionShortlistCriterionTwoId)}, 8, 'Strong execution', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_score_competition_shortlist_fixture_two_novelty', 'judge_assignment_competition_shortlist_fixture_two', ${sqlLiteral(fixtureCompetitionShortlistCriterionOneId)}, 7, 'Good novelty', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_score_competition_shortlist_fixture_two_execution', 'judge_assignment_competition_shortlist_fixture_two', ${sqlLiteral(fixtureCompetitionShortlistCriterionTwoId)}, 6, 'Good execution', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_score_competition_complete_fixture_one_novelty', 'judge_assignment_competition_complete_fixture_one', ${sqlLiteral(fixtureCompetitionCompleteCriterionOneId)}, 9, 'Complete novelty leader', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_score_competition_complete_fixture_one_execution', 'judge_assignment_competition_complete_fixture_one', ${sqlLiteral(fixtureCompetitionCompleteCriterionTwoId)}, 9, 'Complete execution leader', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_score_competition_complete_fixture_two_novelty', 'judge_assignment_competition_complete_fixture_two', ${sqlLiteral(fixtureCompetitionCompleteCriterionOneId)}, 6, 'Complete novelty runner-up', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('judge_score_competition_complete_fixture_two_execution', 'judge_assignment_competition_complete_fixture_two', ${sqlLiteral(fixtureCompetitionCompleteCriterionTwoId)}, 7, 'Complete execution runner-up', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into prize_eligibility_snapshots (
      id, hackathon_id, team_id, user_id, snapshot_at, created_at
    ) values
      ('prize_snapshot_outcomes_fixture_team_one', ${sqlLiteral(fixtureOutcomesHackathonId)}, 'team_outcomes_fixture_one', ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('prize_snapshot_outcomes_fixture_team_two', ${sqlLiteral(fixtureOutcomesHackathonId)}, 'team_outcomes_fixture_two', ${sqlLiteral(judgeId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('prize_snapshot_competition_shortlist_fixture_team_one', ${sqlLiteral(fixtureCompetitionShortlistHackathonId)}, 'team_competition_shortlist_fixture_one', ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('prize_snapshot_competition_shortlist_fixture_team_two', ${sqlLiteral(fixtureCompetitionShortlistHackathonId)}, 'team_competition_shortlist_fixture_two', ${sqlLiteral(judgingParticipantTwoId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('prize_snapshot_competition_complete_fixture_team_one', ${sqlLiteral(fixtureCompetitionCompleteHackathonId)}, 'team_competition_complete_fixture_one', ${sqlLiteral(regularUserId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      ('prize_snapshot_competition_complete_fixture_team_two', ${sqlLiteral(fixtureCompetitionCompleteHackathonId)}, 'team_competition_complete_fixture_two', ${sqlLiteral(judgingParticipantTwoId)}, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into prizes (
      id, hackathon_id, name, description, reward_type, reward_value, reward_currency, award_scope, rank_start, rank_end, created_at
    ) values
      (${sqlLiteral(fixturePublicPrizeId)}, ${sqlLiteral(fixtureHackathonId)}, 'Launch Award', 'Team award for the highest-ranked public program submission.', 'api_credits', '2500', 'USD', 'team', 1, 1, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixturePrizeWorkspacePrizeId)}, ${sqlLiteral(fixturePrizeWorkspaceHackathonId)}, 'Prize Workspace Grand Prize', 'Team prize for the dedicated prize workspace UI fixture.', 'api_credits', '1200', 'USD', 'team', 1, 1, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureOutcomesTeamRedemptionPrizeId)}, ${sqlLiteral(fixtureOutcomesHackathonId)}, 'Outcomes Grand Prize', 'Team prize for rank 1', 'api_credits', '1000', 'USD', 'team', 1, 1, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureOutcomesMemberRedemptionPrizeId)}, ${sqlLiteral(fixtureOutcomesHackathonId)}, 'Outcomes Top Two Membership', 'Member prize for top two teams', 'subscription', 'pro', null, 'member', 1, 2, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionShortlistPrizeId)}, ${sqlLiteral(fixtureCompetitionShortlistHackathonId)}, 'Competition Shortlist Grand Prize', 'Team prize for the announced shortlist winner.', 'api_credits', '750', 'USD', 'team', 1, 1, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionCompletePrizeId)}, ${sqlLiteral(fixtureCompetitionCompleteHackathonId)}, 'Competition Complete Grand Prize', 'Team prize for the completed hackathon winner.', 'api_credits', '900', 'USD', 'team', 1, 1, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into prize_redemptions (
      id, prize_id, user_id, team_id, status, legal_name, winner_terms_document_id, winner_terms_accepted_at, redeemed_at, created_at, updated_at
    ) values
      (${sqlLiteral(fixturePrizeWorkspaceRedemptionId)}, ${sqlLiteral(fixturePrizeWorkspacePrizeId)}, null, 'team_prize_workspace_fixture', 'pending', null, null, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureCompetitionCompleteRedemptionId)}, ${sqlLiteral(fixtureCompetitionCompletePrizeId)}, null, 'team_competition_complete_fixture_one', 'pending', null, null, null, null, ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureApplicationTermsId)},
          current_winner_terms_document_id = ${sqlLiteral(fixtureWinnerTermsId)}
      where id = ${sqlLiteral(fixtureHackathonId)}`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureParticipantApplicationTermsId)}
      where id = ${sqlLiteral(fixtureParticipantApplicationHackathonId)}`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureApiTeamFormationTermsId)}
      where id = ${sqlLiteral(fixtureApiTeamFormationHackathonId)}`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureParticipantProfileRequirementTermsId)}
      where id = ${sqlLiteral(fixtureParticipantProfileRequirementHackathonId)}`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureParticipantApprovedTermsId)}
      where id = ${sqlLiteral(fixtureParticipantApprovedHackathonId)}`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureParticipantRejectedTermsId)}
      where id = ${sqlLiteral(fixtureParticipantRejectedHackathonId)}`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureParticipantTeamCreateTermsId)}
      where id = ${sqlLiteral(fixtureParticipantTeamCreateHackathonId)}`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureParticipantTeamJoinTermsId)}
      where id = ${sqlLiteral(fixtureParticipantTeamJoinHackathonId)}`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureParticipantTeamSoloTermsId)}
      where id = ${sqlLiteral(fixtureParticipantTeamSoloHackathonId)}`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureApiSoloTeamTermsId)}
      where id = ${sqlLiteral(fixtureApiSoloTeamHackathonId)}`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixturePrizeWorkspaceApplicationTermsId)},
          current_winner_terms_document_id = ${sqlLiteral(fixturePrizeWorkspaceWinnerTermsId)}
      where id = ${sqlLiteral(fixturePrizeWorkspaceHackathonId)}`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureOperationsApplicationTermsId)}
      where id = ${sqlLiteral(fixtureOperationsHackathonId)}`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureJudgingApplicationTermsId)}
      where id = ${sqlLiteral(fixtureJudgingHackathonId)}`,
    `update hackathons
      set current_winner_terms_document_id = ${sqlLiteral(fixtureOutcomesWinnerTermsId)}
      where id = ${sqlLiteral(fixtureOutcomesHackathonId)}`,
    `update hackathons
      set current_winner_terms_document_id = ${sqlLiteral(fixtureCompetitionShortlistWinnerTermsId)}
      where id = ${sqlLiteral(fixtureCompetitionShortlistHackathonId)}`,
    `update hackathons
      set current_winner_terms_document_id = ${sqlLiteral(fixtureCompetitionCompleteWinnerTermsId)}
      where id = ${sqlLiteral(fixtureCompetitionCompleteHackathonId)}`
  ].join(';\n')
}

export function buildPlatformFixtureResetSql(personas: ProvisionedStablePersona[]) {
  return buildFixtureSql(personas)
}

function applyLocalD1Migrations(environment: NodeJS.ProcessEnv) {
  const localPlatformPersistPath = resolveLocalPlatformPersistPath(environment)

  execFileSync(
    'bun',
    [
      'x',
      'wrangler',
      'd1',
      'migrations',
      'apply',
      'DB',
      '--local',
      '--persist-to',
      dirname(localPlatformPersistPath),
      '--config',
      localWranglerConfigPath
    ],
    {
      cwd: process.cwd(),
      env: {
        ...environment,
        CI: '1'
      },
      stdio: 'pipe'
    }
  )
}

function applyFixtureSql(environment: NodeJS.ProcessEnv, fixtureSql: string) {
  const localPlatformPersistPath = resolveLocalPlatformPersistPath(environment)
  const tempDirectory = mkdtempSync(join(tmpdir(), 'codex-hackathons-bdd-fixtures-'))
  const fixtureSqlPath = join(tempDirectory, 'platform-fixtures.sql')

  try {
    writeFileSync(fixtureSqlPath, fixtureSql, 'utf8')
    execFileSync(
      'bun',
      [
        'x',
        'wrangler',
        'd1',
        'execute',
        'DB',
        '--local',
        '--persist-to',
        dirname(localPlatformPersistPath),
        '--config',
        localWranglerConfigPath,
        '--file',
        fixtureSqlPath
      ],
      {
        cwd: process.cwd(),
        env: {
          ...environment,
          CI: '1'
        },
        stdio: 'pipe'
      }
    )
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true })
  }
}

export async function resetPlatformFixtures(
  personas: ProvisionedStablePersona[],
  environment: NodeJS.ProcessEnv = process.env
) {
  const localPlatformPersistPath = resolveLocalPlatformPersistPath(environment)
  const fixtureSql = buildFixtureSql(personas)
  mkdirSync(dirname(localPlatformPersistPath), { recursive: true })
  rmSync(localPlatformPersistPath, { recursive: true, force: true })
  applyLocalD1Migrations(environment)
  applyFixtureSql(environment, fixtureSql)

  return {
    hackathonId: fixtureHackathonId,
    userIds: personaUserIds
  }
}
