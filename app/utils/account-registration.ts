import type { ResolvedSessionActor } from '~/composables/useSessionActor'

export function isAccountRegistrationLinkOnlyMode(
  actor: ResolvedSessionActor,
  hasPendingLinkRequirement: boolean
) {
  return actor.kind === 'authenticated_identity'
    && (Boolean(actor.accountLink?.required) || hasPendingLinkRequirement)
}

export function getAccountRegistrationIntro(linkOnlyMode: boolean) {
  if (linkOnlyMode) {
    return {
      title: 'Connect your existing account',
      description: 'Sign in to your existing Codex Hackathons account once to connect this login method.'
    }
  }

  return {
    title: 'Finish account registration',
    description: 'Review the current platform Privacy Policy and Platform Terms, then accept both to continue into your account and hackathon workspaces.'
  }
}
