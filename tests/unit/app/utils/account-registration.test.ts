import { describe, expect, test } from 'vitest'

import {
  getAccountRegistrationIntro,
  isAccountRegistrationLinkOnlyMode
} from '../../../../app/utils/account-registration'

describe('account registration helpers', () => {
  test('returns link-only mode for authenticated identities with a link-required account state', () => {
    expect(isAccountRegistrationLinkOnlyMode({
      kind: 'authenticated_identity',
      accountLink: {
        required: true,
        email: 'existing-user@example.com',
        linkLoginHref: '/auth/link/login'
      }
    } as never, false)).toBe(true)
  })

  test('returns link-only mode after a submit-triggered link-required response', () => {
    expect(isAccountRegistrationLinkOnlyMode({
      kind: 'authenticated_identity',
      accountLink: null
    } as never, true)).toBe(true)
  })

  test('keeps normal consent mode for platform users and non-linking identities', () => {
    expect(isAccountRegistrationLinkOnlyMode({
      kind: 'authenticated_identity',
      accountLink: null
    } as never, false)).toBe(false)

    expect(isAccountRegistrationLinkOnlyMode({
      kind: 'platform_user'
    } as never, true)).toBe(false)
  })

  test('returns link-specific copy for link-only mode', () => {
    expect(getAccountRegistrationIntro(true)).toEqual({
      title: 'Connect your existing account',
      description: 'Sign in to your existing Codex Hackathons account once to connect this login method.'
    })
  })
})
