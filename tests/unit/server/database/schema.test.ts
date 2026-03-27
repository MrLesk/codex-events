import { describe, expect, it } from 'vitest'
import { getTableColumns, getTableName } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/sqlite-core'

import {
  auditLogs,
  hackathons,
  judgeAssignments,
  prizes,
  submissions,
  teamJoinRequests,
  users
} from '../../../../server/database/schema'

describe('shared schema foundation', () => {
  it('stores the Auth0 subject on the user record', () => {
    const columns = getTableColumns(users)

    expect(getTableName(users)).toBe('users')
    expect(columns.auth0Subject.name).toBe('auth0_subject')
    expect(columns.firstName.name).toBe('first_name')
    expect(columns.familyName.name).toBe('family_name')
    expect(columns.profileIconUpdatedAt.name).toBe('profile_icon_updated_at')
  })

  it('defines the documented partial unique indexes', () => {
    const userIndexes = getTableConfig(users).indexes.map(index => index.config.name)
    const joinRequestIndexes = getTableConfig(teamJoinRequests).indexes.map(index => index.config.name)
    const submissionIndexes = getTableConfig(submissions).indexes.map(index => index.config.name)
    const assignmentIndexes = getTableConfig(judgeAssignments).indexes.map(index => index.config.name)

    expect(userIndexes).toContain('users_auth0_subject_active_idx')
    expect(userIndexes).toContain('users_email_active_idx')
    expect(joinRequestIndexes).toContain('team_join_requests_pending_team_user_idx')
    expect(submissionIndexes).toContain('submissions_active_team_idx')
    expect(assignmentIndexes).toContain('judge_assignments_active_submission_idx')
  })

  it('defines schedule and entity checks on shared tables', () => {
    const hackathonColumns = getTableColumns(hackathons)
    const prizeColumns = getTableColumns(prizes)
    const prizeChecks = getTableConfig(prizes).checks.map(checkItem => checkItem.name)
    const hackathonChecks = getTableConfig(hackathons).checks.map(checkItem => checkItem.name)
    const auditIndexes = getTableConfig(auditLogs).indexes.map(index => index.config.name)

    expect(hackathonColumns.lumaEventUrl.name).toBe('luma_event_url')
    expect(hackathonColumns.agendaItemsJson.name).toBe('agenda_items_json')
    expect(hackathonColumns.inPersonEvent.name).toBe('in_person_event')
    expect(hackathonColumns.requireWhyThisHackathon.name).toBe('require_why_this_hackathon')
    expect(hackathonColumns.requireProofOfExecution.name).toBe('require_proof_of_execution')
    expect(prizeColumns.displayOrder.name).toBe('display_order')
    expect(prizeChecks).toContain('prizes_rank_order_check')
    expect(hackathonChecks).toContain('hackathons_max_team_members_check')
    expect(hackathonChecks).toContain('hackathons_schedule_order_check')
    expect(auditIndexes).toContain('audit_logs_entity_idx')
  })
})
