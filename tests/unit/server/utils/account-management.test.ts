import { describe, expect, test } from 'vitest'

import { buildDeletedUserPatch } from '../../../../server/utils/account-management'

describe('account management utilities', () => {
  test('builds a GDPR-capable deleted-user patch that sanitizes identity fields', () => {
    const patch = buildDeletedUserPatch('user_1', '2026-03-22T12:00:00.000Z')

    expect(patch).toMatchObject({
      auth0Subject: 'deleted_user_1_20260322120000000',
      email: 'deleted_user_1_20260322120000000@deleted.invalid',
      displayName: 'Deleted User',
      isPlatformAdmin: false,
      xProfileUrl: null,
      linkedinProfileUrl: null,
      githubProfileUrl: null,
      deletedAt: '2026-03-22T12:00:00.000Z'
    })
  })
})
