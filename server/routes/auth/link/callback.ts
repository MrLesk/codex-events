import { defineEventHandler, sendRedirect } from 'h3'

import {
  buildPlatformAccountLinkRedirect,
  clearPlatformAccountLinkAuthentication,
  clearPlatformAccountLinkChallenge,
  completePlatformAccountLinkAuthentication,
  readPlatformAccountLinkChallenge
} from '../../../utils/platform-account-linking'

export default defineEventHandler(async (event) => {
  const initialChallenge = await readPlatformAccountLinkChallenge(event)
  const fallbackReturnTo = initialChallenge.ok && initialChallenge.challenge
    ? initialChallenge.challenge.returnTo
    : null

  if (!initialChallenge.ok || !initialChallenge.challenge) {
    await clearPlatformAccountLinkAuthentication(event)
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(fallbackReturnTo, initialChallenge.reason === 'expired' ? 'expired' : 'invalid'))
  }

  try {
    await completePlatformAccountLinkAuthentication(event)
  } catch {
    await clearPlatformAccountLinkAuthentication(event)
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(initialChallenge.challenge.returnTo, 'login_failed'))
  }

  return sendRedirect(event, '/auth/link/complete')
})
