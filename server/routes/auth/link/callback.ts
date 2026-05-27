import { defineEventHandler, sendRedirect, setResponseHeader } from 'h3'

import {
  buildPlatformAccountLinkActionContinueResponse,
  buildPlatformAccountLinkRedirect,
  clearPlatformAccountLinkAuthentication,
  clearPlatformAccountLinkChallenge,
  completePlatformAccountLinkAuthentication,
  readPlatformAccountLinkChallenge
} from '#server/domains/accounts/linking'

export default defineEventHandler(async (event) => {
  const initialChallenge = await readPlatformAccountLinkChallenge(event)

  if (!initialChallenge.ok || !initialChallenge.challenge) {
    await clearPlatformAccountLinkAuthentication(event)
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(null, initialChallenge.reason === 'expired' ? 'expired' : 'invalid'))
  }

  try {
    await completePlatformAccountLinkAuthentication(event)
  } catch {
    await clearPlatformAccountLinkAuthentication(event)
    clearPlatformAccountLinkChallenge(event)
    setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
    return await buildPlatformAccountLinkActionContinueResponse(event, initialChallenge.challenge, {
      ok: false,
      reason: 'login_failed'
    })
  }

  return sendRedirect(event, '/auth/link/complete')
})
