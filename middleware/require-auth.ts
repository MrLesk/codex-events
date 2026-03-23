export default defineNuxtRouteMiddleware((to) => {
  if (useUser().value) {
    return
  }

  return navigateTo(`/auth/login?returnTo=${encodeURIComponent(to.fullPath)}`)
})
