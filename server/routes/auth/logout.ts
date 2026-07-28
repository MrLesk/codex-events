import { defineEventHandler, sendRedirect } from 'h3'

import { clearLocalCodexUser } from '#server/auth/local-codex-auth'

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const returnTo = runtimeConfig.auth0.appBaseUrl

  if (runtimeConfig.localCodexAuth) {
    clearLocalCodexUser(event)
    return sendRedirect(event, returnTo)
  }

  const auth0 = useAuth0(event)

  await auth0.logout({ returnTo })

  const logoutUrl = new URL('/v2/logout', `https://${runtimeConfig.auth0.domain}`)
  logoutUrl.searchParams.set('client_id', runtimeConfig.auth0.clientId)
  logoutUrl.searchParams.set('returnTo', returnTo)

  return sendRedirect(event, logoutUrl.href)
})
