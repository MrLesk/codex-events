import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { afterEach, beforeEach, describe, expect, test } from 'vitest'

const migrationSql = readdirSync(join(process.cwd(), 'drizzle'))
  .filter(fileName => /^\d+.*\.sql$/.test(fileName))
  .sort()
  .map(fileName => readFileSync(join(process.cwd(), 'drizzle', fileName), 'utf8'))
  .join('\n')
  .replaceAll('--> statement-breakpoint', '\n')

describe('shared database migration', () => {
  let database: DatabaseSync

  beforeEach(() => {
    database = new DatabaseSync(':memory:')
    database.exec(migrationSql)
  })

  afterEach(() => {
    database.close()
  })

  test('allows duplicate emails only after soft deletion', () => {
    const now = isoTimestamp(0)
    const insertUser = database.prepare(`
      insert into users (id, auth0_subject, email, display_name, is_platform_admin, created_at, updated_at, deleted_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertUser.run('user_1', 'auth0|user_1', 'user@example.com', 'User One', 0, now, now, null)
    expect(() => insertUser.run('user_2', 'auth0|user_2', 'user@example.com', 'User Two', 0, now, now, null)).toThrow()

    insertUser.run('user_3', 'auth0|user_3', 'user@example.com', 'Deleted User', 0, now, now, now)
  })

  test('allows duplicate Auth0 subjects only after soft deletion', () => {
    const now = isoTimestamp(0)
    const insertUser = database.prepare(`
      insert into users (id, auth0_subject, email, display_name, is_platform_admin, created_at, updated_at, deleted_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertUser.run('user_1', 'auth0|shared-subject', 'first@example.com', 'User One', 0, now, now, null)
    expect(() => insertUser.run('user_2', 'auth0|shared-subject', 'second@example.com', 'User Two', 0, now, now, null)).toThrow()

    insertUser.run('user_3', 'auth0|shared-subject', 'deleted@example.com', 'Deleted User', 0, now, now, now)
  })

  test('prevents more than one active team membership per hackathon', () => {
    const now = isoTimestamp(0)
    seedUser(database, 'user_1', now)
    seedHackathon(database, 'hackathon_1', 'draft', now, 'user_1')
    seedTeam(database, 'team_1', 'hackathon_1', 'user_1', now)
    seedTeam(database, 'team_2', 'hackathon_1', 'user_1', now)

    database.prepare(`
      insert into team_members (id, team_id, user_id, role, joined_at, left_at, created_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `).run('member_1', 'team_1', 'user_1', 'admin', now, null, now)

    expect(() => database.prepare(`
      insert into team_members (id, team_id, user_id, role, joined_at, left_at, created_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `).run('member_2', 'team_2', 'user_1', 'member', now, null, now)).toThrow()
  })

  test('prevents duplicate pending join requests for the same user and team', () => {
    const now = isoTimestamp(0)
    seedUser(database, 'creator_1', now)
    seedUser(database, 'user_1', now)
    seedHackathon(database, 'hackathon_1', 'registration_open', now, 'creator_1')
    seedTeam(database, 'team_1', 'hackathon_1', 'creator_1', now)

    database.prepare(`
      insert into team_join_requests (id, team_id, user_id, status, requested_at, reviewed_at, reviewed_by_user_id, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('request_1', 'team_1', 'user_1', 'pending', now, null, null, now)

    expect(() => database.prepare(`
      insert into team_join_requests (id, team_id, user_id, status, requested_at, reviewed_at, reviewed_by_user_id, created_at)
      values (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('request_2', 'team_1', 'user_1', 'pending', now, null, null, now)).toThrow()
  })

  test('prevents setting current application terms to a document from another hackathon', () => {
    const now = isoTimestamp(0)
    seedUser(database, 'creator_1', now)
    seedHackathon(database, 'hackathon_1', 'registration_open', now, 'creator_1')
    seedHackathon(database, 'hackathon_2', 'registration_open', now, 'creator_1')
    seedHackathonTermsDocument(database, {
      documentId: 'terms_other_hackathon',
      hackathonId: 'hackathon_2',
      documentType: 'application_terms',
      now
    })

    expect(() => database.prepare(`
      update hackathons
      set current_application_terms_document_id = ?
      where id = ?
    `).run('terms_other_hackathon', 'hackathon_1')).toThrow(/hackathon_current_application_terms_document_invalid/)
  })

  test('prevents setting current application terms to the wrong document type', () => {
    const now = isoTimestamp(0)
    seedUser(database, 'creator_1', now)
    seedHackathon(database, 'hackathon_1', 'registration_open', now, 'creator_1')
    seedHackathonTermsDocument(database, {
      documentId: 'terms_winner_1',
      hackathonId: 'hackathon_1',
      documentType: 'winner_terms',
      now
    })

    expect(() => database.prepare(`
      update hackathons
      set current_application_terms_document_id = ?
      where id = ?
    `).run('terms_winner_1', 'hackathon_1')).toThrow(/hackathon_current_application_terms_document_invalid/)
  })

  test('prevents mutating a referenced current terms document into an invalid state', () => {
    const now = isoTimestamp(0)
    seedUser(database, 'creator_1', now)
    seedHackathon(database, 'hackathon_1', 'registration_open', now, 'creator_1')
    seedHackathonTermsDocument(database, {
      documentId: 'terms_app_1',
      hackathonId: 'hackathon_1',
      documentType: 'application_terms',
      now
    })

    database.prepare(`
      update hackathons
      set current_application_terms_document_id = ?
      where id = ?
    `).run('terms_app_1', 'hackathon_1')

    expect(() => database.prepare(`
      update hackathon_terms_documents
      set document_type = 'winner_terms'
      where id = ?
    `).run('terms_app_1')).toThrow(/hackathon_current_application_terms_document_invalid/)
  })

  test('prevents deleting a referenced current terms document', () => {
    const now = isoTimestamp(0)
    seedUser(database, 'creator_1', now)
    seedHackathon(database, 'hackathon_1', 'registration_open', now, 'creator_1')
    seedHackathonTermsDocument(database, {
      documentId: 'terms_win_1',
      hackathonId: 'hackathon_1',
      documentType: 'winner_terms',
      now
    })

    database.prepare(`
      update hackathons
      set current_winner_terms_document_id = ?
      where id = ?
    `).run('terms_win_1', 'hackathon_1')

    expect(() => database.prepare(`
      delete from hackathon_terms_documents
      where id = ?
    `).run('terms_win_1')).toThrow(/hackathon_current_winner_terms_document_invalid/)
  })

  test('prevents removing the last active admin from a team', () => {
    const now = isoTimestamp(0)
    seedUser(database, 'user_1', now)
    seedHackathon(database, 'hackathon_1', 'registration_open', now, 'user_1')
    seedTeam(database, 'team_1', 'hackathon_1', 'user_1', now)

    database.prepare(`
      insert into team_members (id, team_id, user_id, role, joined_at, left_at, created_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `).run('member_1', 'team_1', 'user_1', 'admin', now, null, now)

    expect(() => database.prepare(`
      update team_members
      set left_at = ?
      where id = ?
    `).run(isoTimestamp(1), 'member_1')).toThrow()
  })
})

function seedUser(database: DatabaseSync, userId: string, now: string) {
  database.prepare(`
    insert into users (id, auth0_subject, email, display_name, is_platform_admin, created_at, updated_at, deleted_at)
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, `auth0|${userId}`, `${userId}@example.com`, userId, 0, now, now, null)
}

function seedHackathon(
  database: DatabaseSync,
  hackathonId: string,
  state: string,
  now: string,
  createdByUserId: string
) {
  database.prepare(`
    insert into hackathons (
      id, name, slug, description, background_image_url, banner_image_url, city, address,
      registration_opens_at, registration_closes_at, submission_opens_at, submission_closes_at,
      state, max_team_members, require_x_profile, require_linkedin_profile, require_github_profile,
      current_application_terms_document_id, current_winner_terms_document_id, created_by_user_id,
      created_at, updated_at
    )
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    hackathonId,
    `Hackathon ${hackathonId}`,
    hackathonId,
    'Desc',
    null,
    null,
    'City',
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

function seedTeam(database: DatabaseSync, teamId: string, hackathonId: string, creatorUserId: string, now: string) {
  database.prepare(`
    insert into teams (
      id, hackathon_id, name, slug, is_open_to_join_requests, created_by_user_id, created_at, updated_at
    )
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(teamId, hackathonId, `Team ${teamId}`, teamId, 1, creatorUserId, now, now)
}

function seedHackathonTermsDocument(
  database: DatabaseSync,
  options: {
    documentId: string
    hackathonId: string
    documentType: 'application_terms' | 'winner_terms'
    now: string
  }
) {
  database.prepare(`
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
    `${options.documentType} content`,
    options.now,
    options.now
  )
}

function isoTimestamp(offsetSeconds: number) {
  return new Date(Date.UTC(2026, 2, 22, 12, 0, offsetSeconds)).toISOString()
}
