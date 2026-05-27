import { defineEventHandler, sendRedirect } from 'h3'

import {
  buildPlatformAccountLinkRedirect,
  clearPlatformAccountLinkAuthentication,
  clearPlatformAccountLinkChallenge,
  issuePlatformAccountLinkActionChallenge,
  startPlatformAccountLinkAuthentication
} from '#server/domains/accounts/linking'

export default defineEventHandler(async (event) => {
  let challenge

  try {
    challenge = await issuePlatformAccountLinkActionChallenge(event)
  } catch {
    await clearPlatformAccountLinkAuthentication(event)
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(null, 'invalid'))
  }

  const authorizationUrl = await startPlatformAccountLinkAuthentication(event, challenge.email)

  return sendRedirect(event, authorizationUrl.href)
})
