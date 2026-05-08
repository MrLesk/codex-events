import type { SessionActor } from '~/domains/accounts/session-actor'

type AccountRegistrationErrorLike = {
  code?: string | null
  message?: string | null
}

export const missingIdentityEmailMessage = 'This sign-in method did not share an email address. Codex Events needs an email address to create your account. Sign in with a login method that shares your email address, then try again.'

export function isAccountRegistrationLinkOnlyMode(
  actor: SessionActor,
  hasPendingLinkRequirement: boolean
) {
  return actor.kind === 'authenticated_identity'
    && (Boolean(actor.accountLink?.required) || hasPendingLinkRequirement)
}

export function getAccountRegistrationIntro(linkOnlyMode: boolean) {
  if (linkOnlyMode) {
    return {
      title: 'Connect your existing account',
      description: 'Sign in to your existing Codex Events account once to connect this login method.'
    }
  }

  return {
    title: 'Finish account registration',
    description: 'Review the current platform Privacy Policy and Platform Terms, then accept both to continue into your account and event workspaces.'
  }
}

export function getAccountRegistrationSubmitErrorMessage(error: AccountRegistrationErrorLike | null | undefined) {
  if (error?.code === 'identity_email_unavailable') {
    return missingIdentityEmailMessage
  }

  const message = error?.message?.trim()

  return message || 'Unable to finish account registration right now.'
}
