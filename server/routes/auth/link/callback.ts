import { defineEventHandler, sendRedirect } from 'h3'

import {
  buildPlatformAccountLinkRedirect,
  clearPlatformAccountLinkChallenge,
  readPlatformAccountLinkChallenge
} from '../../../utils/platform-account-linking'

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

  return sendRedirect(event, '/auth/link/complete')
})
