import { defineEventHandler, sendRedirect } from 'h3'

import { getRequestActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import {
  buildPlatformAccountLinkRedirect,
  clearPlatformAccountLinkAuthentication,
  clearPlatformAccountLinkChallenge,
  findLinkablePlatformAccountIdentity,
  issuePlatformAccountLinkChallenge,
  readPlatformAccountLinkChallenge,
  startPlatformAccountLinkAuthentication
} from '#server/utils/platform-account-linking'

export default defineEventHandler(async (event) => {
  let challengeResult = await readPlatformAccountLinkChallenge(event)

  if (!challengeResult.ok && challengeResult.reason === 'missing') {
    const actor = await getRequestActor(event)

    if (actor.kind === 'authenticated_identity') {
      const linkableIdentity = await findLinkablePlatformAccountIdentity(getDatabase(event), actor.sessionUser)

      if (linkableIdentity) {
        challengeResult = {
          ok: true,
          challenge: await issuePlatformAccountLinkChallenge(event, {
            primaryAuth0Subject: linkableIdentity.primaryAuth0Subject,
            secondaryAuth0Subject: actor.sessionUser.sub,
            email: linkableIdentity.email,
            returnTo: null
          })
        }
      }
    }
  }

  if (!challengeResult.ok || !challengeResult.challenge) {
    await clearPlatformAccountLinkAuthentication(event)
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(null, challengeResult.reason === 'expired' ? 'expired' : 'invalid'))
  }

  const authorizationUrl = await startPlatformAccountLinkAuthentication(event, challengeResult.challenge.email)

  return sendRedirect(event, authorizationUrl.href)
})
