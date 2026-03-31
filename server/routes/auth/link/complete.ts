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
  const challengeResult = await readPlatformAccountLinkChallenge(event)
  const fallbackReturnTo = challengeResult.ok && challengeResult.challenge
    ? challengeResult.challenge.returnTo
    : null

  if (!challengeResult.ok || !challengeResult.challenge) {
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(fallbackReturnTo, challengeResult.reason === 'expired' ? 'expired' : 'invalid'))
  }

  const auth0 = useAuth0(event)
  const session = await auth0.getSession() as Auth0SessionLike | null
  const authenticatedSubject = session?.user?.sub?.trim() ?? ''

  if (!authenticatedSubject || authenticatedSubject !== challengeResult.challenge.primaryAuth0Subject) {
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
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(challengeResult.challenge.returnTo, 'failed'))
  }

  clearPlatformAccountLinkChallenge(event)
  return sendRedirect(event, buildPlatformAccountLinkRedirect(challengeResult.challenge.returnTo))
})
