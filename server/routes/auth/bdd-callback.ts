export default defineEventHandler(async (event) => {
  const auth0 = useAuth0(event)
  const runtimeConfig = useRuntimeConfig(event)

  await auth0.completeInteractiveLogin(
    new URL(event.node.req.url as string, runtimeConfig.auth0.appBaseUrl)
  )

  return sendRedirect(event, '/account/dashboard')
})
