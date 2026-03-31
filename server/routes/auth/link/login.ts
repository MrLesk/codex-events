import { defineEventHandler, sendRedirect } from 'h3'

import { getRequestActor } from '../../../auth/actor'
import { getDatabase } from '../../../database/client'
import {
  buildPlatformAccountLinkRedirect,
  clearPlatformAccountLinkChallenge,
  findLinkablePlatformAccountIdentity,
  getPlatformAccountLinkCallbackUrl,
  getPlatformAccountLinkDatabaseConnectionName,
  issuePlatformAccountLinkChallenge,
  readPlatformAccountLinkChallenge
} from '../../../utils/platform-account-linking'

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
    clearPlatformAccountLinkChallenge(event)
    return sendRedirect(event, buildPlatformAccountLinkRedirect(null, challengeResult.reason === 'expired' ? 'expired' : 'invalid'))
  }

  const auth0 = useAuth0(event)
  const authorizationUrl = await auth0.startInteractiveLogin({
    authorizationParams: {
      connection: getPlatformAccountLinkDatabaseConnectionName(event),
      prompt: 'login',
      login_hint: challengeResult.challenge.email,
      redirect_uri: getPlatformAccountLinkCallbackUrl(event)
    }
  })

  return sendRedirect(event, authorizationUrl.href)
})
