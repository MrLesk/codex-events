import { describe, expect, test } from 'vitest'

import { buildPlatformFixtureResetSql } from '../../../bdd/support/platform-fixtures'

const personas = [
  {
    key: 'platform_admin',
    email: 'platform-admin@example.com',
    password: 'password-1',
    displayName: 'Platform Admin',
    nickname: 'platform-admin',
    auth0Subject: 'auth0|platform-admin'
  },
  {
    key: 'event_admin',
    email: 'event-admin@example.com',
    password: 'password-2',
    displayName: 'Event Admin',
    nickname: 'event-admin',
    auth0Subject: 'auth0|event-admin'
  },
  {
    key: 'judge',
    email: 'judge@example.com',
    password: 'password-3',
    displayName: 'Judge Persona',
    nickname: 'judge-persona',
    auth0Subject: 'auth0|judge'
  },
  {
    key: 'regular_user',
    email: 'regular@example.com',
    password: 'password-4',
    displayName: 'Regular User',
    nickname: 'regular-user',
    auth0Subject: 'auth0|regular-user'
  }
] as const

describe('platform fixture reset sql', () => {
  test('recreates the canonical fixture dataset deterministically', () => {
    const sql = buildPlatformFixtureResetSql([...personas])

    expect(sql).toContain('delete from users')
    expect(sql).toContain('insert into users')
    expect(sql).toContain('insert into events')
    expect(sql).toContain('insert into event_role_assignments')
    expect(sql).toContain('registration_open')
    expect(sql).toContain('blind_review')
    expect(sql).toContain('blind_review_count = 2')
    expect(sql).toContain('pitch_review_enabled = 1')
    expect(sql).toContain('pitch_finalist_submission_ids_json = \'[]\'')
    expect(sql).toContain('final_ranking_submission_ids_json = \'[]\'')
    expect(sql).toContain('workspace_mode')
    expect(sql).toContain('\'team_participant_solo_fixture\'')
    expect(sql).toContain('\'solo\'')
    expect(sql).not.toContain('judge_review')
    expect(sql).toContain('draft-managed-event')
    expect(sql).toContain('https://luma.com/a4i7qtbo')
    expect(sql).toContain('set luma_event_url')
  })
})
