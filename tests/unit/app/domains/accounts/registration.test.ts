import { describe, expect, test } from 'vitest'

import {
  getAccountRegistrationSubmitErrorMessage,
  getAccountRegistrationIntro,
  missingIdentityEmailMessage
} from '../../../../../app/domains/accounts/registration'

describe('account registration helpers', () => {
  test('returns account-registration copy', () => {
    expect(getAccountRegistrationIntro()).toEqual({
      title: 'Finish account registration',
      description: 'Review the current platform Privacy Policy and Platform Terms, then accept both to continue into your account and event workspaces.'
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
