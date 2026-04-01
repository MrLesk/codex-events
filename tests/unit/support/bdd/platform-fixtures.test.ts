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
    key: 'hackathon_admin',
    email: 'hackathon-admin@example.com',
    password: 'password-2',
    displayName: 'Hackathon Admin',
    nickname: 'hackathon-admin',
    auth0Subject: 'auth0|hackathon-admin'
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
    expect(sql).toContain('insert into hackathons')
    expect(sql).toContain('insert into hackathon_role_assignments')
    expect(sql).toContain('registration_open')
    expect(sql).toContain('draft-managed-hackathon')
    expect(sql).toContain('https://luma.com/a4i7qtbo')
    expect(sql).toContain('set luma_event_url')
  })
})
