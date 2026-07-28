import { defineEventHandler, getQuery, sendRedirect } from 'h3'

import { normalizeAuthReturnTo } from '#shared/domains/accounts/auth-navigation'
import {
  authenticateWithCodex,
  setLocalCodexUser
} from '#server/auth/local-codex-auth'

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const queryReturnTo = getQuery(event).returnTo
  const returnTo = normalizeAuthReturnTo(
    typeof queryReturnTo === 'string' ? queryReturnTo : null,
    '/account'
  )

  if (runtimeConfig.localCodexAuth) {
    const user = await authenticateWithCodex()
    setLocalCodexUser(event, user.email)

    return sendRedirect(event, returnTo)
  }

  const authorizationUrl = await useAuth0(event).startInteractiveLogin({
    appState: {
      returnTo: new URL(returnTo, runtimeConfig.auth0.appBaseUrl).toString()
    }
  })

  return sendRedirect(event, authorizationUrl.href)
})
