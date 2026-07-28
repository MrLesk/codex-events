import { describe, expect, test } from 'vitest'

import { getStablePersonas } from '../../../bdd/support/personas'
import { buildPlatformFixtureResetSql } from '../../../bdd/support/platform-fixtures'

describe('platform fixture reset sql', () => {
  test('recreates the canonical fixture dataset deterministically', () => {
    const sql = buildPlatformFixtureResetSql(getStablePersonas())

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
    expect(sql).toContain('local-chatgpt|platform-admin@bdd.codex-events.test')
    expect(sql).toContain('local-chatgpt|event-admin@bdd.codex-events.test')
    expect(sql).toContain('local-chatgpt|judge@bdd.codex-events.test')
    expect(sql).toContain('local-chatgpt|regular-user@bdd.codex-events.test')
  })
})
