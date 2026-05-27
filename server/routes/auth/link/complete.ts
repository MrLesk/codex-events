import { defineEventHandler, sendRedirect, setResponseHeader } from 'h3'

import {
  buildPlatformAccountLinkActionContinueResponse,
  buildPlatformAccountLinkRedirect,
  clearPlatformAccountLinkAuthentication,
  clearPlatformAccountLinkChallenge,
  readPlatformAccountLinkAuthenticatedSubject,
  readPlatformAccountLinkChallenge
} from '#server/domains/accounts/linking'

export default defineEventHandler(async (event) => {
  const challengeResult = await readPlatformAccountLinkChallenge(event)

  if (!challengeResult.ok || !challengeResult.challenge) {
    await clearPlatformAccountLinkAuthentication(event)
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(null, challengeResult.reason === 'expired' ? 'expired' : 'invalid'))
  }

  const authenticatedSubject = await readPlatformAccountLinkAuthenticatedSubject(event)

  if (!authenticatedSubject || authenticatedSubject !== challengeResult.challenge.primaryAuth0Subject) {
    await clearPlatformAccountLinkAuthentication(event)
    clearPlatformAccountLinkChallenge(event)
    setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
    return await buildPlatformAccountLinkActionContinueResponse(event, challengeResult.challenge, {
      ok: false,
      reason: 'mismatch'
    })
  }

  await clearPlatformAccountLinkAuthentication(event)
  clearPlatformAccountLinkChallenge(event)
  setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
  return await buildPlatformAccountLinkActionContinueResponse(event, challengeResult.challenge, {
    ok: true
  })
})
