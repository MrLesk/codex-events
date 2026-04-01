import { describe, expect, test } from 'vitest'

import {
  getAccountRegistrationSubmitErrorMessage,
  getAccountRegistrationIntro,
  isAccountRegistrationLinkOnlyMode,
  missingIdentityEmailMessage
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

  test('returns a clear message when account registration is blocked by a missing identity email', () => {
    expect(getAccountRegistrationSubmitErrorMessage({
      code: 'identity_email_unavailable',
      message: 'The authenticated identity does not expose an email address required for platform account registration.'
    })).toBe(missingIdentityEmailMessage)
  })

  test('falls back to the API error message for other account registration failures', () => {
    expect(getAccountRegistrationSubmitErrorMessage({
      code: 'platform_account_email_conflict',
      message: 'An active platform account already exists for this email address.'
    })).toBe('An active platform account already exists for this email address.')
  })
})
