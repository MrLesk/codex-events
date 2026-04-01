import { defineEventHandler, getQuery, sendRedirect } from 'h3'

import { accountDashboardHref, normalizeAuthReturnTo } from '../../../../app/utils/auth-navigation'

export default defineEventHandler(async (event) => {
  const auth0 = useAuth0(event)
  const runtimeConfig = useRuntimeConfig(event)
  const query = getQuery(event)
  const connection = runtimeConfig.auth0.githubConnectionName?.trim() || 'github'
  const returnTo = normalizeAuthReturnTo(
    typeof query.returnTo === 'string' ? query.returnTo : null,
    accountDashboardHref
  )

  const authorizationUrl = await auth0.startInteractiveLogin({
    appState: {
      returnTo
    },
    authorizationParams: {
      connection
    }
  })

  return sendRedirect(event, authorizationUrl.href)
})
