export default defineEventHandler(async (event) => {
  const auth0 = useAuth0(event)
  const runtimeConfig = useRuntimeConfig(event)
  const connection = process.env.AUTH0_TEST_CONNECTION_NAME

  if (!connection) {
    throw createError({
      statusCode: 500,
      statusMessage: 'AUTH0_TEST_CONNECTION_NAME is required for BDD Auth0 login.'
    })
  }

  const authorizationUrl = await auth0.startInteractiveLogin({
    authorizationParams: {
      connection,
      redirect_uri: `${runtimeConfig.auth0.appBaseUrl}/auth/bdd-callback`
    }
  })

  return sendRedirect(event, authorizationUrl.href)
})
