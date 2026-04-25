import { describe, expect, it } from 'vitest'
import { getTableColumns, getTableName } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/sqlite-core'

import {
  auditLogs,
  hackathonCreditCodes,
  hackathonCreditOffers,
  hackathonFeedback,
  hackathonPhotos,
  hackathonRoleAssignments,
  hackathonTracks,
  hackathons,
  judgeAssignments,
  prizeEligibilitySnapshots,
  prizeRedemptions,
  prizes,
  submissions,
  teamJoinRequests,
  userAuthIdentities,
  userApplications,
  users
} from '../../../../server/database/schema'

describe('shared schema foundation', () => {
  it('stores the primary Auth0 subject on the user record and linked subjects in identity rows', () => {
    const columns = getTableColumns(users)
    const identityColumns = getTableColumns(userAuthIdentities)

    expect(getTableName(users)).toBe('users')
    expect(columns.auth0Subject.name).toBe('auth0_subject')
    expect(getTableName(userAuthIdentities)).toBe('user_auth_identities')
    expect(identityColumns.auth0Subject.name).toBe('auth0_subject')
    expect(identityColumns.userId.name).toBe('user_id')
    expect(columns.firstName.name).toBe('first_name')
    expect(columns.familyName.name).toBe('family_name')
    expect(columns.company.name).toBe('company')
    expect(columns.bio.name).toBe('bio')
    expect(columns.profileIconUpdatedAt.name).toBe('profile_icon_updated_at')
  })

  it('defines the documented partial unique indexes', () => {
    const userIndexes = getTableConfig(users).indexes.map(index => index.config.name)
    const userAuthIdentityIndexes = getTableConfig(userAuthIdentities).indexes.map(index => index.config.name)
    const joinRequestIndexes = getTableConfig(teamJoinRequests).indexes.map(index => index.config.name)
    const trackIndexes = getTableConfig(hackathonTracks).indexes.map(index => index.config.name)
    const feedbackIndexes = getTableConfig(hackathonFeedback).indexes.map(index => index.config.name)
    const photoIndexes = getTableConfig(hackathonPhotos).indexes.map(index => index.config.name)
    const submissionIndexes = getTableConfig(submissions).indexes.map(index => index.config.name)
    const assignmentIndexes = getTableConfig(judgeAssignments).indexes.map(index => index.config.name)
    const creditOfferIndexes = getTableConfig(hackathonCreditOffers).indexes.map(index => index.config.name)
    const creditCodeIndexes = getTableConfig(hackathonCreditCodes).indexes.map(index => index.config.name)
    const prizeEligibilitySnapshotIndexes = getTableConfig(prizeEligibilitySnapshots).indexes.map(index => index.config.name)
    const prizeRedemptionIndexes = getTableConfig(prizeRedemptions).indexes.map(index => index.config.name)

    expect(userIndexes).toContain('users_auth0_subject_active_idx')
    expect(userIndexes).toContain('users_email_active_idx')
    expect(userAuthIdentityIndexes).toContain('user_auth_identities_auth0_subject_idx')
    expect(joinRequestIndexes).toContain('team_join_requests_pending_team_user_idx')
    expect(trackIndexes).toContain('hackathon_tracks_hackathon_display_order_idx')
    expect(trackIndexes).toContain('hackathon_tracks_hackathon_idx')
    expect(feedbackIndexes).toContain('hackathon_feedback_hackathon_created_idx')
    expect(photoIndexes).toContain('hackathon_photos_hackathon_created_idx')
    expect(photoIndexes).toContain('hackathon_photos_uploaded_by_idx')
    expect(submissionIndexes).toContain('submissions_active_team_idx')
    expect(submissionIndexes).toContain('submissions_track_idx')
    expect(assignmentIndexes).toContain('judge_assignments_active_blind_submission_slot_idx')
    expect(assignmentIndexes).toContain('judge_assignments_pitch_submission_judge_idx')
    expect(assignmentIndexes).toContain('judge_assignments_hackathon_stage_status_judge_idx')
    expect(creditOfferIndexes).toContain('hackathon_credit_offers_hackathon_display_order_idx')
    expect(creditCodeIndexes).toContain('hackathon_credit_codes_offer_claim_state_idx')
    expect(creditCodeIndexes).toContain('hackathon_credit_codes_offer_claimed_user_idx')
    expect(prizeEligibilitySnapshotIndexes).toContain('prize_eligibility_snapshots_hackathon_user_team_idx')
    expect(prizeEligibilitySnapshotIndexes).toContain('prize_eligibility_snapshots_hackathon_team_user_idx')
    expect(prizeRedemptionIndexes).toContain('prize_redemptions_pending_user_created_idx')
    expect(prizeRedemptionIndexes).toContain('prize_redemptions_pending_team_created_idx')
  })

  it('defines schedule and entity checks on shared tables', () => {
    const hackathonColumns = getTableColumns(hackathons)
    const creditOfferColumns = getTableColumns(hackathonCreditOffers)
    const creditCodeColumns = getTableColumns(hackathonCreditCodes)
    const trackColumns = getTableColumns(hackathonTracks)
    const feedbackColumns = getTableColumns(hackathonFeedback)
    const photoColumns = getTableColumns(hackathonPhotos)
    const roleAssignmentColumns = getTableColumns(hackathonRoleAssignments)
    const applicationColumns = getTableColumns(userApplications)
    const prizeColumns = getTableColumns(prizes)
    const submissionColumns = getTableColumns(submissions)
    const prizeChecks = getTableConfig(prizes).checks.map(checkItem => checkItem.name)
    const hackathonChecks = getTableConfig(hackathons).checks.map(checkItem => checkItem.name)
    const roleAssignmentChecks = getTableConfig(hackathonRoleAssignments).checks.map(checkItem => checkItem.name)
    const feedbackChecks = getTableConfig(hackathonFeedback).checks.map(checkItem => checkItem.name)
    const photoChecks = getTableConfig(hackathonPhotos).checks.map(checkItem => checkItem.name)
    const auditIndexes = getTableConfig(auditLogs).indexes.map(index => index.config.name)

    expect(hackathonColumns.lumaEventUrl.name).toBe('luma_event_url')
    expect(hackathonColumns.discordServerUrl.name).toBe('discord_server_url')
    expect(hackathonColumns.lumaEventApiId.name).toBe('luma_event_api_id')
    expect(hackathonColumns.agendaItemsJson.name).toBe('agenda_items_json')
    expect(hackathonColumns.country.name).toBe('country')
    expect(hackathonColumns.inPersonEvent.name).toBe('in_person_event')
    expect(hackathonColumns.participantsLimit.name).toBe('participants_limit')
    expect(hackathonColumns.shortlistFinalistCount.name).toBe('shortlist_finalist_count')
    expect(hackathonColumns.pitchFinalistSubmissionIdsJson.name).toBe('pitch_finalist_submission_ids_json')
    expect(hackathonColumns.activePitchPresentationSubmissionId.name).toBe('active_pitch_presentation_submission_id')
    expect(hackathonColumns.pitchPresentationsCompletedAt.name).toBe('pitch_presentations_completed_at')
    expect(hackathonColumns.finalRankingSubmissionIdsJson.name).toBe('final_ranking_submission_ids_json')
    expect(hackathonColumns.requireWhyThisHackathon.name).toBe('require_why_this_hackathon')
    expect(hackathonColumns.requireProofOfExecution.name).toBe('require_proof_of_execution')
    expect(hackathonColumns.requireSubmissionSummary.name).toBe('require_submission_summary')
    expect(hackathonColumns.requireSubmissionRepositoryUrl.name).toBe('require_submission_repository_url')
    expect(hackathonColumns.requireSubmissionDemoUrl.name).toBe('require_submission_demo_url')
    expect(trackColumns.hackathonId.name).toBe('hackathon_id')
    expect(trackColumns.description.name).toBe('description')
    expect(trackColumns.displayOrder.name).toBe('display_order')
    expect(feedbackColumns.hackathonId.name).toBe('hackathon_id')
    expect(feedbackColumns.foodRating.name).toBe('food_rating')
    expect(feedbackColumns.participantsCommunityRating.name).toBe('participants_community_rating')
    expect(feedbackColumns.communicationBeforeRating.name).toBe('communication_before_rating')
    expect(feedbackColumns.communicationDuringRating.name).toBe('communication_during_rating')
    expect(feedbackColumns.rulesFairnessRating.name).toBe('rules_fairness_rating')
    expect(feedbackColumns.safetyAccessibilityInclusionRating.name).toBe('safety_accessibility_inclusion_rating')
    expect(feedbackColumns.comment.name).toBe('comment')
    expect(photoColumns.fileName.name).toBe('file_name')
    expect(photoColumns.isPubliclyVisible.name).toBe('is_publicly_visible')
    expect(photoColumns.contentType.name).toBe('content_type')
    expect(photoColumns.uploadedByUserId.name).toBe('uploaded_by_user_id')
    expect(roleAssignmentColumns.isStaff.name).toBe('is_staff')
    expect(applicationColumns.preApprovalStatus.name).toBe('pre_approval_status')
    expect(applicationColumns.lumaSyncStatus.name).toBe('luma_sync_status')
    expect(applicationColumns.checkedInAt.name).toBe('checked_in_at')
    expect(creditOfferColumns.hackathonId.name).toBe('hackathon_id')
    expect(creditOfferColumns.displayOrder.name).toBe('display_order')
    expect(creditCodeColumns.creditOfferId.name).toBe('credit_offer_id')
    expect(creditCodeColumns.claimedByUserId.name).toBe('claimed_by_user_id')
    expect(prizeColumns.displayOrder.name).toBe('display_order')
    expect(submissionColumns.trackId.name).toBe('track_id')
    expect(getTableColumns(judgeAssignments).reviewStage.name).toBe('review_stage')
    expect(getTableColumns(judgeAssignments).blindReviewSlot.name).toBe('blind_review_slot')
    expect(getTableColumns(judgeAssignments).pitchScore.name).toBe('pitch_score')
    expect(getTableColumns(judgeAssignments).pitchComment.name).toBe('pitch_comment')
    expect(prizeChecks).toContain('prizes_rank_order_check')
    expect(hackathonChecks).toContain('hackathons_max_team_members_check')
    expect(hackathonChecks).toContain('hackathons_participants_limit_check')
    expect(hackathonChecks).toContain('hackathons_schedule_order_check')
    expect(getTableConfig(hackathons).indexes.map(index => index.config.name)).toContain('hackathons_luma_event_api_id_idx')
    expect(roleAssignmentChecks).toContain('hackathon_role_assignments_judge_pool_check')
    expect(roleAssignmentChecks).toContain('hackathon_role_assignments_staff_flag_check')
    expect(feedbackChecks).toContain('hackathon_feedback_food_rating_check')
    expect(feedbackChecks).toContain('hackathon_feedback_safety_accessibility_inclusion_rating_check')
    expect(photoChecks).toContain('hackathon_photos_width_check')
    expect(photoChecks).toContain('hackathon_photos_height_check')
    expect(auditIndexes).toContain('audit_logs_entity_idx')
    expect(auditIndexes).toContain('audit_logs_created_idx')
    expect(auditIndexes).toContain('audit_logs_entity_created_idx')
    expect(auditIndexes).toContain('audit_logs_metadata_hackathon_created_idx')
  })
})
