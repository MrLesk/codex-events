import { defineEventHandler, sendRedirect } from 'h3'

import {
  buildPlatformAccountLinkRedirect,
  clearPlatformAccountLinkChallenge,
  getPlatformAccountLinkCallbackUrl,
  getPlatformAccountLinkDatabaseConnectionName,
  readPlatformAccountLinkChallenge
} from '../../../utils/platform-account-linking'

export default defineEventHandler(async (event) => {
  const challengeResult = await readPlatformAccountLinkChallenge(event)

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
