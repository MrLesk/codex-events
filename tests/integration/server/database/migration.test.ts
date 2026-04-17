import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { createTestD1Database, type TestD1Database } from '../../../support/backend/fake-d1'

const migrationSql = readdirSync(join(process.cwd(), 'drizzle'))
  .filter(fileName => /^\d+.*\.sql$/.test(fileName))
  .sort()
  .map(fileName => readFileSync(join(process.cwd(), 'drizzle', fileName), 'utf8'))
  .join('\n')
  .replaceAll('--> statement-breakpoint', '\n')

const judgeScaleMigrationFileName = '0040_judge_score_scale_1_to_5.sql'
const preJudgeScaleMigrationSql = readdirSync(join(process.cwd(), 'drizzle'))
  .filter(fileName => /^\d+.*\.sql$/.test(fileName) && fileName < judgeScaleMigrationFileName)
  .sort()
  .map(fileName => readFileSync(join(process.cwd(), 'drizzle', fileName), 'utf8'))
  .join('\n')
  .replaceAll('--> statement-breakpoint', '\n')

const judgeScaleMigrationSql = readFileSync(join(process.cwd(), 'drizzle', judgeScaleMigrationFileName), 'utf8')
  .replaceAll('--> statement-breakpoint', '\n')

describe('shared database migration', () => {
  let database: TestD1Database

  beforeEach(async () => {
    database = createTestD1Database({
      applyMigrations: false
    })
    await database.exec(migrationSql)
  })

  afterEach(async () => {
    await database.close()
  })

  test('allows duplicate emails only after soft deletion', async () => {
    const now = isoTimestamp(0)
    const insertUser = database.prepare(`
      insert into users (id, auth0_subject, email, display_name, is_platform_admin, created_at, updated_at, deleted_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    await insertUser.run('user_1', 'auth0|user_1', 'user@example.com', 'User One', 0, now, now, null)
    await expect(insertUser.run('user_2', 'auth0|user_2', 'user@example.com', 'User Two', 0, now, now, null)).rejects.toThrow()

    await insertUser.run('user_3', 'auth0|user_3', 'user@example.com', 'Deleted User', 0, now, now, now)
  })

  test('allows duplicate Auth0 subjects only after soft deletion', async () => {
    const now = isoTimestamp(0)
    const insertUser = database.prepare(`
      insert into users (id, auth0_subject, email, display_name, is_platform_admin, created_at, updated_at, deleted_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    await insertUser.run('user_1', 'auth0|shared-subject', 'first@example.com', 'User One', 0, now, now, null)
    await expect(insertUser.run('user_2', 'auth0|shared-subject', 'second@example.com', 'User Two', 0, now, now, null)).rejects.toThrow()

    await insertUser.run('user_3', 'auth0|shared-subject', 'deleted@example.com', 'Deleted User', 0, now, now, now)
  })

  test('enforces a unique non-null Luma event API id across hackathons', async () => {
    const now = isoTimestamp(0)
    await seedUser(database, 'creator_1', now)
    await seedHackathon(database, 'hackathon_1', 'draft', now, 'creator_1')
    await seedHackathon(database, 'hackathon_2', 'draft', now, 'creator_1')

    await database.prepare(`
      update hackathons
      set luma_event_api_id = ?
      where id = ?
    `).run('evt-unique123', 'hackathon_1')

    await expect(database.prepare(`
      update hackathons
      set luma_event_api_id = ?
      where id = ?
    `).run('evt-unique123', 'hackathon_2')).rejects.toThrow()
  })

  test('creates and removes primary linked-auth-identity rows with user inserts and soft deletion', async () => {
    const now = isoTimestamp(0)

    await database.prepare(`
      insert into users (id, auth0_subject, email, display_name, is_platform_admin, created_at, updated_at, deleted_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('user_1', 'auth0|user_1', 'user@example.com', 'User One', 0, now, now, null)

    const insertedIdentities = await database.prepare(`
      select user_id, auth0_subject
      from user_auth_identities
      where user_id = ?
    `).all<{ user_id: string, auth0_subject: string }>('user_1')

    expect(insertedIdentities.results).toEqual([
      {
        user_id: 'user_1',
        auth0_subject: 'auth0|user_1'
      }
    ])

    await database.prepare(`
      update users
      set auth0_subject = ?, deleted_at = ?, updated_at = ?
      where id = ?
    `).run('deleted_user_1_20260322120000000', isoTimestamp(1), isoTimestamp(1), 'user_1')

    const deletedIdentities = await database.prepare(`
      select auth0_subject
      from user_auth_identities
      where user_id = ?
    `).all<{ auth0_subject: string }>('user_1')

    expect(deletedIdentities.results).toEqual([])
  })

  test('prevents more than one active team membership per hackathon', async () => {
    const now = isoTimestamp(0)
    await seedUser(database, 'user_1', now)
    await seedHackathon(database, 'hackathon_1', 'draft', now, 'user_1')
    await seedTeam(database, 'team_1', 'hackathon_1', 'user_1', now)
    await seedTeam(database, 'team_2', 'hackathon_1', 'user_1', now)

    await database.prepare(`
      insert into team_members (id, team_id, user_id, role, joined_at, left_at, created_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `).run('member_1', 'team_1', 'user_1', 'admin', now, null, now)

    await expect(database.prepare(`
      insert into team_members (id, team_id, user_id, role, joined_at, left_at, created_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `).run('member_2', 'team_2', 'user_1', 'member', now, null, now)).rejects.toThrow()
  })

  test('stores the final ranking override column on hackathons with an empty default', async () => {
    const now = isoTimestamp(0)
    await seedUser(database, 'creator_1', now)
    await seedHackathon(database, 'hackathon_1', 'draft', now, 'creator_1')

    const hackathonRow = await database.prepare(`
      select final_ranking_submission_ids_json
      from hackathons
      where id = ?
    `).all<{ final_ranking_submission_ids_json: string }>('hackathon_1')

    expect(hackathonRow.results).toEqual([{
      final_ranking_submission_ids_json: '[]'
    }])
  })

  test('stores the Discord server URL column on hackathons with a null default', async () => {
    const now = isoTimestamp(0)
    await seedUser(database, 'creator_1', now)
    await seedHackathon(database, 'hackathon_1', 'draft', now, 'creator_1')

    const hackathonRow = await database.prepare(`
      select discord_server_url
      from hackathons
      where id = ?
    `).all<{ discord_server_url: string | null }>('hackathon_1')

    expect(hackathonRow.results).toEqual([{
      discord_server_url: null
    }])
  })

  test('applies the judge score scale migration on populated judge data without breaking foreign keys', async () => {
    const migrationDatabase = createTestD1Database({
      applyMigrations: false
    })

    try {
      await migrationDatabase.exec(preJudgeScaleMigrationSql)

      const now = isoTimestamp(0)
      await seedUser(migrationDatabase, 'creator_1', now)
      await seedUser(migrationDatabase, 'judge_1', now)
      await seedHackathon(migrationDatabase, 'hackathon_1', 'pitch_review', now, 'creator_1')
      await seedTeam(migrationDatabase, 'team_1', 'hackathon_1', 'creator_1', now)
      await seedSubmission(migrationDatabase, 'submission_1', 'team_1', 'locked', now)

      await migrationDatabase.prepare(`
        insert into evaluation_criteria (
          id, hackathon_id, name, description, weight, display_order, created_at
        )
        values (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'criterion_1',
        'hackathon_1',
        'Execution',
        'Execution quality',
        50,
        1,
        now,
        'criterion_2',
        'hackathon_1',
        'Novelty',
        'Novelty quality',
        50,
        2,
        now
      )

      await migrationDatabase.prepare(`
        insert into judge_assignments (
          id, hackathon_id, submission_id, judge_user_id, review_stage, blind_review_slot, status,
          pitch_score, pitch_comment, assigned_at, started_at, completed_at, skipped_at,
          skipped_by_user_id, skip_reason, ineligibility_status, ineligibility_reason,
          ineligibility_marked_at, ineligibility_marked_by_user_id, created_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'blind_assignment_1',
        'hackathon_1',
        'submission_1',
        'judge_1',
        'blind_review',
        1,
        'judge_completed',
        null,
        null,
        now,
        now,
        now,
        null,
        null,
        null,
        'eligible',
        null,
        null,
        null,
        now
      )

      await migrationDatabase.prepare(`
        insert into judge_assignments (
          id, hackathon_id, submission_id, judge_user_id, review_stage, blind_review_slot, status,
          pitch_score, pitch_comment, assigned_at, started_at, completed_at, skipped_at,
          skipped_by_user_id, skip_reason, ineligibility_status, ineligibility_reason,
          ineligibility_marked_at, ineligibility_marked_by_user_id, created_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'pitch_assignment_1',
        'hackathon_1',
        'submission_1',
        'judge_1',
        'pitch_review',
        null,
        'judge_completed',
        8,
        'Strong pitch',
        now,
        now,
        now,
        null,
        null,
        null,
        'eligible',
        null,
        null,
        null,
        now
      )

      await migrationDatabase.prepare(`
        insert into judge_criterion_scores (
          id, judge_assignment_id, evaluation_criterion_id, score, comment, created_at, updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'score_1',
        'blind_assignment_1',
        'criterion_1',
        6,
        'Solid',
        now,
        now,
        'score_2',
        'blind_assignment_1',
        'criterion_2',
        9,
        'Excellent',
        now,
        now
      )

      await migrationDatabase.exec(judgeScaleMigrationSql)

      const pitchAssignmentRows = await migrationDatabase.prepare(`
        select id, pitch_score
        from judge_assignments
        where id = ?
      `).all<{ id: string, pitch_score: number | null }>('pitch_assignment_1')

      expect(pitchAssignmentRows.results).toEqual([{
        id: 'pitch_assignment_1',
        pitch_score: 5
      }])

      const criterionScoreRows = await migrationDatabase.prepare(`
        select id, score, judge_assignment_id
        from judge_criterion_scores
        order by id
      `).all<{ id: string, score: number, judge_assignment_id: string }>()

      expect(criterionScoreRows.results).toEqual([
        {
          id: 'score_1',
          score: 4,
          judge_assignment_id: 'blind_assignment_1'
        },
        {
          id: 'score_2',
          score: 5,
          judge_assignment_id: 'blind_assignment_1'
        }
      ])

      const foreignKeyCheckRows = await migrationDatabase.prepare(`
        pragma foreign_key_check
      `).all<Record<string, unknown>>()

      expect(foreignKeyCheckRows.results).toEqual([])
    } finally {
      await migrationDatabase.close()
    }
  })

  test('prevents duplicate pending join requests for the same user and team', async () => {
    const now = isoTimestamp(0)
    await seedUser(database, 'creator_1', now)
    await seedUser(database, 'user_1', now)
    await seedHackathon(database, 'hackathon_1', 'registration_open', now, 'creator_1')
    await seedTeam(database, 'team_1', 'hackathon_1', 'creator_1', now)

    await database.prepare(`
      insert into team_join_requests (id, team_id, user_id, status, requested_at, reviewed_at, reviewed_by_user_id, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('request_1', 'team_1', 'user_1', 'pending', now, null, null, now)

    await expect(database.prepare(`
      insert into team_join_requests (id, team_id, user_id, status, requested_at, reviewed_at, reviewed_by_user_id, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('request_2', 'team_1', 'user_1', 'pending', now, null, null, now)).rejects.toThrow()
  })

  test('prevents setting current application terms to a document from another hackathon', async () => {
    const now = isoTimestamp(0)
    await seedUser(database, 'creator_1', now)
    await seedHackathon(database, 'hackathon_1', 'registration_open', now, 'creator_1')
    await seedHackathon(database, 'hackathon_2', 'registration_open', now, 'creator_1')
    await seedHackathonTermsDocument(database, {
      documentId: 'terms_other_hackathon',
      hackathonId: 'hackathon_2',
      documentType: 'application_terms',
      now
    })

    await expect(database.prepare(`
      update hackathons
      set current_application_terms_document_id = ?
      where id = ?
    `).run('terms_other_hackathon', 'hackathon_1')).rejects.toThrow(/hackathon_current_application_terms_document_invalid/)
  })

  test('prevents setting current application terms to the wrong document type', async () => {
    const now = isoTimestamp(0)
    await seedUser(database, 'creator_1', now)
    await seedHackathon(database, 'hackathon_1', 'registration_open', now, 'creator_1')
    await seedHackathonTermsDocument(database, {
      documentId: 'terms_winner_1',
      hackathonId: 'hackathon_1',
      documentType: 'winner_terms',
      now
    })

    await expect(database.prepare(`
      update hackathons
      set current_application_terms_document_id = ?
      where id = ?
    `).run('terms_winner_1', 'hackathon_1')).rejects.toThrow(/hackathon_current_application_terms_document_invalid/)
  })

  test('prevents mutating a referenced current terms document into an invalid state', async () => {
    const now = isoTimestamp(0)
    await seedUser(database, 'creator_1', now)
    await seedHackathon(database, 'hackathon_1', 'registration_open', now, 'creator_1')
    await seedHackathonTermsDocument(database, {
      documentId: 'terms_app_1',
      hackathonId: 'hackathon_1',
      documentType: 'application_terms',
      now
    })

    await database.prepare(`
      update hackathons
      set current_application_terms_document_id = ?
      where id = ?
    `).run('terms_app_1', 'hackathon_1')

    await expect(database.prepare(`
      update hackathon_terms_documents
      set document_type = 'winner_terms'
      where id = ?
    `).run('terms_app_1')).rejects.toThrow(/hackathon_current_application_terms_document_invalid/)
  })

  test('prevents deleting a referenced current terms document', async () => {
    const now = isoTimestamp(0)
    await seedUser(database, 'creator_1', now)
    await seedHackathon(database, 'hackathon_1', 'registration_open', now, 'creator_1')
    await seedHackathonTermsDocument(database, {
      documentId: 'terms_win_1',
      hackathonId: 'hackathon_1',
      documentType: 'winner_terms',
      now
    })

    await database.prepare(`
      update hackathons
      set current_winner_terms_document_id = ?
      where id = ?
    `).run('terms_win_1', 'hackathon_1')

    await expect(database.prepare(`
      delete from hackathon_terms_documents
      where id = ?
    `).run('terms_win_1')).rejects.toThrow(/hackathon_current_winner_terms_document_invalid/)
  })

  test('prevents removing the last active admin while other active members remain on the team', async () => {
    const now = isoTimestamp(0)
    await seedUser(database, 'user_1', now)
    await seedUser(database, 'user_2', now)
    await seedHackathon(database, 'hackathon_1', 'registration_open', now, 'user_1')
    await seedTeam(database, 'team_1', 'hackathon_1', 'user_1', now)

    await database.prepare(`
      insert into team_members (id, team_id, user_id, role, joined_at, left_at, created_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `).run('member_1', 'team_1', 'user_1', 'admin', now, null, now)
    await database.prepare(`
      insert into team_members (id, team_id, user_id, role, joined_at, left_at, created_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `).run('member_2', 'team_1', 'user_2', 'member', now, null, now)

    await expect(database.prepare(`
      update team_members
      set left_at = ?
      where id = ?
    `).run(isoTimestamp(1), 'member_1')).rejects.toThrow()
  })

  test('allows dissolving a team by removing its last active admin during team formation when no active submission exists', async () => {
    const now = isoTimestamp(0)
    await seedUser(database, 'user_1', now)
    await seedHackathon(database, 'hackathon_1', 'registration_open', now, 'user_1')
    await seedTeam(database, 'team_1', 'hackathon_1', 'user_1', now)

    await database.prepare(`
      insert into team_members (id, team_id, user_id, role, joined_at, left_at, created_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `).run('member_1', 'team_1', 'user_1', 'admin', now, null, now)

    await expect(database.prepare(`
      update team_members
      set left_at = ?
      where id = ?
    `).run(isoTimestamp(1), 'member_1')).resolves.toBeDefined()
  })

  test('prevents dissolving a team when the last active admin still has an active submission', async () => {
    const now = isoTimestamp(0)
    await seedUser(database, 'user_1', now)
    await seedHackathon(database, 'hackathon_1', 'registration_open', now, 'user_1')
    await seedTeam(database, 'team_1', 'hackathon_1', 'user_1', now)

    await database.prepare(`
      insert into team_members (id, team_id, user_id, role, joined_at, left_at, created_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `).run('member_1', 'team_1', 'user_1', 'admin', now, null, now)
    await seedSubmission(database, 'submission_1', 'team_1', 'draft', now)

    await expect(database.prepare(`
      update team_members
      set left_at = ?
      where id = ?
    `).run(isoTimestamp(1), 'member_1')).rejects.toThrow()
  })
})

async function seedUser(database: TestD1Database, userId: string, now: string) {
  await database.prepare(`
    insert into users (id, auth0_subject, email, display_name, is_platform_admin, created_at, updated_at, deleted_at)
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, `auth0|${userId}`, `${userId}@example.com`, userId, 0, now, now, null)
}

async function seedHackathon(
  database: TestD1Database,
  hackathonId: string,
  state: string,
  now: string,
  createdByUserId: string
) {
  await database.prepare(`
    insert into hackathons (
      id, name, slug, description, background_image_url, banner_image_url, city, country, address,
      registration_opens_at, registration_closes_at, submission_opens_at, submission_closes_at,
      state, max_team_members, require_x_profile, require_linkedin_profile, require_github_profile,
      current_application_terms_document_id, current_winner_terms_document_id, created_by_user_id,
      created_at, updated_at
    )
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    hackathonId,
    `Hackathon ${hackathonId}`,
    hackathonId,
    'Desc',
    null,
    null,
    'City',
    'Country',
    'Address',
    now,
    isoTimestamp(1),
    isoTimestamp(2),
    isoTimestamp(3),
    state,
    5,
    0,
    0,
    0,
    null,
    null,
    createdByUserId,
    now,
    now
  )
}

async function seedTeam(
  database: TestD1Database,
  teamId: string,
  hackathonId: string,
  createdByUserId: string,
  now: string
) {
  await database.prepare(`
    insert into teams (
      id, hackathon_id, name, slug, is_open_to_join_requests, created_by_user_id, created_at, updated_at
    )
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(teamId, hackathonId, `Team ${teamId}`, teamId, 1, createdByUserId, now, now)
}

async function seedHackathonTermsDocument(
  database: TestD1Database,
  options: {
    documentId: string
    hackathonId: string
    documentType: 'application_terms' | 'winner_terms'
    now: string
  }
) {
  await database.prepare(`
    insert into hackathon_terms_documents (
      id, hackathon_id, document_type, version, title, content, published_at, created_at
    )
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    options.documentId,
    options.hackathonId,
    options.documentType,
    1,
    `${options.documentType} title`,
    'Doc content',
    options.now,
    options.now
  )
}

async function seedSubmission(
  database: TestD1Database,
  submissionId: string,
  teamId: string,
  status: 'draft' | 'submitted' | 'locked',
  now: string
) {
  await database.prepare(`
    insert into submissions (
      id, team_id, status, project_name, summary, repository_url, demo_url,
      submitted_at, locked_at, withdrawn_at, disqualified_at, created_at, updated_at
    )
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    submissionId,
    teamId,
    status,
    null,
    null,
    null,
    null,
    status === 'submitted' ? now : null,
    status === 'locked' ? now : null,
    null,
    null,
    now,
    now
  )
}

function isoTimestamp(offsetDays: number) {
  const date = new Date('2026-01-01T00:00:00.000Z')
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString()
}
