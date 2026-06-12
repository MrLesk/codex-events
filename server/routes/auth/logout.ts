import { defineEventHandler, sendRedirect } from 'h3'

export default defineEventHandler(async (event) => {
  const auth0 = useAuth0(event)
  const runtimeConfig = useRuntimeConfig(event)
  const returnTo = runtimeConfig.auth0.appBaseUrl

  await auth0.logout({ returnTo })

  const logoutUrl = new URL('/v2/logout', `https://${runtimeConfig.auth0.domain}`)
  logoutUrl.searchParams.set('client_id', runtimeConfig.auth0.clientId)
  logoutUrl.searchParams.set('returnTo', returnTo)

  return sendRedirect(event, logoutUrl.href)
})
