import { describe, expect, test } from 'vitest'

import {
  getAccountRegistrationMissingDocumentsCopy,
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

  test('returns first-admin setup copy when the identity can bootstrap the platform account', () => {
    expect(getAccountRegistrationMissingDocumentsCopy({
      canCreateFirstPlatformAdminSetupAccount: true,
      canOpenLegalSettingsForSetup: false
    })).toEqual({
      intro: {
        title: 'Create the first platform admin account',
        description: 'This sign-in matches the first platform admin email. Create the admin account, then publish platform legal settings.'
      },
      alert: {
        color: 'info',
        title: 'First platform admin setup',
        description: 'Create your admin account first. You can publish the Privacy Policy and Platform Terms from platform settings after this step.'
      },
      helperText: null,
      submitButtonLabel: 'Create admin account'
    })
  })

  test('returns regular blocked copy when legal documents are missing for a non-setup identity', () => {
    expect(getAccountRegistrationMissingDocumentsCopy({
      canCreateFirstPlatformAdminSetupAccount: false,
      canOpenLegalSettingsForSetup: false
    })).toEqual({
      intro: {
        title: 'Finish account registration',
        description: 'Platform legal content must be published before regular account registration can continue.'
      },
      alert: {
        color: 'warning',
        title: 'Legal content required',
        description: 'The platform needs legal settings, a Privacy Policy, and Platform Terms before regular account registration can continue.'
      },
      helperText: 'A platform admin needs to publish legal settings before you can create an account.',
      submitButtonLabel: null
    })
  })

  test('returns legal-settings copy when a platform admin needs to publish documents', () => {
    expect(getAccountRegistrationMissingDocumentsCopy({
      canCreateFirstPlatformAdminSetupAccount: false,
      canOpenLegalSettingsForSetup: true
    })).toMatchObject({
      intro: {
        title: 'Finish platform legal setup'
      },
      alert: {
        color: 'warning',
        title: 'Legal content required'
      },
      submitButtonLabel: 'Open legal settings'
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
