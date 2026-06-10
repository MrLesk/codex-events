type AccountRegistrationErrorLike = {
  code?: string | null
  message?: string | null
}

type AccountRegistrationAlertColor = 'info' | 'warning'

interface AccountRegistrationMissingDocumentsOptions {
  canCreateFirstPlatformAdminSetupAccount: boolean
  canOpenLegalSettingsForSetup: boolean
}

export const missingIdentityEmailMessage = 'This sign-in method did not share an email address. Codex Events needs an email address to create your account. Sign in with a login method that shares your email address, then try again.'
export const identityEmailVerificationResentMessage = 'Check your inbox for a new confirmation email, then return to this page to finish creating your account.'

export function getUnverifiedIdentityEmailMessage(email: string) {
  return `Thanks for signing up. Confirm ${email} from the verification email, then return to this page to finish creating your account.`
}

export function getAccountRegistrationIntro() {
  return {
    title: 'Finish account registration',
    description: 'Review the current platform Privacy Policy and Platform Terms, then accept both to continue into your account and event workspaces.'
  }
}

export function getAccountRegistrationMissingDocumentsCopy(
  options: AccountRegistrationMissingDocumentsOptions
) {
  if (options.canCreateFirstPlatformAdminSetupAccount) {
    return {
      intro: {
        title: 'Create the first platform admin account',
        description: 'This sign-in matches the first platform admin email. Create the admin account, then publish platform legal settings.'
      },
      alert: {
        color: 'info' as AccountRegistrationAlertColor,
        title: 'First platform admin setup',
        description: 'Create your admin account first. You can publish the Privacy Policy and Platform Terms from platform settings after this step.'
      },
      helperText: null,
      submitButtonLabel: 'Create admin account'
    }
  }

  if (options.canOpenLegalSettingsForSetup) {
    return {
      intro: {
        title: 'Finish platform legal setup',
        description: 'Publish legal settings before regular account registration can continue.'
      },
      alert: {
        color: 'warning' as AccountRegistrationAlertColor,
        title: 'Legal content required',
        description: 'Publish legal settings, a Privacy Policy, and Platform Terms before regular account registration can continue.'
      },
      helperText: null,
      submitButtonLabel: 'Open legal settings'
    }
  }

  return {
    intro: {
      title: 'Finish account registration',
      description: 'Platform legal content must be published before regular account registration can continue.'
    },
    alert: {
      color: 'warning' as AccountRegistrationAlertColor,
      title: 'Legal content required',
      description: 'The platform needs legal settings, a Privacy Policy, and Platform Terms before regular account registration can continue.'
    },
    helperText: 'A platform admin needs to publish legal settings before you can create an account.',
    submitButtonLabel: null
  }
}

export function getAccountRegistrationSubmitErrorMessage(error: AccountRegistrationErrorLike | null | undefined) {
  if (error?.code === 'identity_email_unavailable') {
    return missingIdentityEmailMessage
  }

  if (error?.code === 'identity_email_unverified') {
    return 'Confirm your email address before creating your account.'
  }

  const message = error?.message?.trim()

  return message || 'Unable to finish account registration right now.'
}

export function getIdentityEmailVerificationResendErrorMessage(error: AccountRegistrationErrorLike | null | undefined) {
  if (error?.code === 'identity_email_unavailable') {
    return missingIdentityEmailMessage
  }

  if (error?.code === 'identity_email_already_verified') {
    return 'Your email address is already confirmed. Continue registration below.'
  }

  if (
    error?.code === 'auth0_email_verification_unavailable'
    || error?.code === 'auth0_email_verification_failed'
    || error?.code === 'auth0_email_verification_rate_limited'
  ) {
    return 'Confirmation email cannot be sent right now. Try again later.'
  }

  const message = error?.message?.trim()

  return message || 'Unable to resend the confirmation email right now.'
}
