import { defineEventHandler, sendRedirect } from 'h3'

import {
  buildPlatformAccountLinkRedirect,
  clearPlatformAccountLinkAuthentication,
  clearPlatformAccountLinkChallenge,
  linkPlatformAccountIdentity,
  readPlatformAccountLinkAuthenticatedSubject,
  readPlatformAccountLinkChallenge
} from '../../../utils/platform-account-linking'

export default defineEventHandler(async (event) => {
  const challengeResult = await readPlatformAccountLinkChallenge(event)
  const fallbackReturnTo = challengeResult.ok && challengeResult.challenge
    ? challengeResult.challenge.returnTo
    : null

  if (!challengeResult.ok || !challengeResult.challenge) {
    await clearPlatformAccountLinkAuthentication(event)
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(fallbackReturnTo, challengeResult.reason === 'expired' ? 'expired' : 'invalid'))
  }

  const authenticatedSubject = await readPlatformAccountLinkAuthenticatedSubject(event)

  if (!authenticatedSubject || authenticatedSubject !== challengeResult.challenge.primaryAuth0Subject) {
    await clearPlatformAccountLinkAuthentication(event)
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(challengeResult.challenge.returnTo, 'mismatch'))
  }

  try {
    await linkPlatformAccountIdentity(
      event,
      challengeResult.challenge.primaryAuth0Subject,
      challengeResult.challenge.secondaryAuth0Subject
    )
  } catch {
    await clearPlatformAccountLinkAuthentication(event)
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(challengeResult.challenge.returnTo, 'failed'))
  }

  await clearPlatformAccountLinkAuthentication(event)
  clearPlatformAccountLinkChallenge(event)
  return sendRedirect(event, buildPlatformAccountLinkRedirect(challengeResult.challenge.returnTo))
})
