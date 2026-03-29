import { defineEventHandler, sendRedirect } from 'h3'

import {
  buildPlatformAccountLinkRedirect,
  clearPlatformAccountLinkChallenge,
  linkPlatformAccountIdentity,
  readPlatformAccountLinkChallenge
} from '../../../utils/platform-account-linking'

interface Auth0SessionLike {
  user?: {
    sub?: string | null
  } | null
}

export default defineEventHandler(async (event) => {
  const auth0 = useAuth0(event)
  const initialChallenge = await readPlatformAccountLinkChallenge(event)
  const fallbackReturnTo = initialChallenge.ok && initialChallenge.challenge
    ? initialChallenge.challenge.returnTo
    : null

  if (!initialChallenge.ok || !initialChallenge.challenge) {
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(fallbackReturnTo, initialChallenge.reason === 'expired' ? 'expired' : 'invalid'))
  }

  try {
    await auth0.completeInteractiveLogin(
      new URL(event.node.req.url as string, useRuntimeConfig(event).auth0.appBaseUrl)
    )
  } catch {
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(initialChallenge.challenge.returnTo, 'login_failed'))
  }

  const verifiedChallenge = await readPlatformAccountLinkChallenge(event)

  if (!verifiedChallenge.ok || !verifiedChallenge.challenge) {
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(initialChallenge.challenge.returnTo, verifiedChallenge.reason === 'expired' ? 'expired' : 'invalid'))
  }

  const session = await auth0.getSession() as Auth0SessionLike | null
  const authenticatedSubject = session?.user?.sub?.trim() ?? ''

  if (!authenticatedSubject || authenticatedSubject !== verifiedChallenge.challenge.primaryAuth0Subject) {
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(verifiedChallenge.challenge.returnTo, 'mismatch'))
  }

  try {
    await linkPlatformAccountIdentity(
      event,
      verifiedChallenge.challenge.primaryAuth0Subject,
      verifiedChallenge.challenge.secondaryAuth0Subject
    )
  } catch {
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(verifiedChallenge.challenge.returnTo, 'failed'))
  }

  clearPlatformAccountLinkChallenge(event)
  return sendRedirect(event, buildPlatformAccountLinkRedirect(verifiedChallenge.challenge.returnTo))
})
