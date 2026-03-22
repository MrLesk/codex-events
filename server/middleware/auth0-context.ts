export default defineEventHandler((event) => {
  // Ensure request-scoped Auth0 options exist before the SDK's SSR middleware
  // or our own route guards call `useAuth0(event)`.
  event.context.auth0ClientOptions ??= useRuntimeConfig(event).auth0
})
