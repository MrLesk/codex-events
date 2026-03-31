import { defineEventHandler, sendRedirect } from 'h3'

import { getDatabase } from '../../../database/client'
import {
  buildPlatformAccountLinkRedirect,
  clearPlatformAccountLinkAuthentication,
  clearPlatformAccountLinkChallenge,
  linkPlatformAccountIdentity,
  readPlatformAccountLinkAuthenticatedSubject,
  readPlatformAccountLinkChallenge
} from '../../../utils/platform-account-linking'
import { isApiError } from '../../../utils/api-error'
import {
  ensurePlatformUserAuthIdentities,
  findPlatformUserByAuth0Subject
} from '../../../utils/platform-auth-identities'

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
    const linkedAuth0Subjects = await linkPlatformAccountIdentity(
      event,
      challengeResult.challenge.primaryAuth0Subject,
      challengeResult.challenge.secondaryAuth0Subject
    )
    const database = getDatabase(event)
    const platformUser = await findPlatformUserByAuth0Subject(
      database,
      challengeResult.challenge.primaryAuth0Subject
    )

    if (!platformUser) {
      throw new Error('The linked platform user could not be resolved after Auth0 account linking.')
    }

    await ensurePlatformUserAuthIdentities(database, {
      userId: platformUser.id,
      auth0Subjects: linkedAuth0Subjects
    })
  } catch (error) {
    console.error('Platform account linking failed', {
      primaryAuth0Subject: challengeResult.challenge.primaryAuth0Subject,
      secondaryAuth0Subject: challengeResult.challenge.secondaryAuth0Subject,
      error: isApiError(error)
        ? {
            code: error.code,
            message: error.message
          }
        : error
    })
    await clearPlatformAccountLinkAuthentication(event)
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(challengeResult.challenge.returnTo, 'failed'))
  }

  await clearPlatformAccountLinkAuthentication(event)
  clearPlatformAccountLinkChallenge(event)
  return sendRedirect(event, buildPlatformAccountLinkRedirect(challengeResult.challenge.returnTo))
})
