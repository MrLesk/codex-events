<script setup lang="ts">
const user = useUser()

const primaryLinks = computed(() => {
  if (user.value) {
    return [{
      label: 'Open dashboard',
      to: '/dashboard',
      trailingIcon: 'i-lucide-arrow-right',
      size: 'xl' as const
    }, {
      label: 'Sign out',
      to: '/auth/logout',
      size: 'xl' as const,
      color: 'neutral' as const,
      variant: 'subtle' as const
    }]
  }

  return [{
    label: 'Sign in with Auth0',
    to: '/auth/login?returnTo=%2Fdashboard',
    trailingIcon: 'i-lucide-arrow-right',
    size: 'xl' as const
  }, {
    label: 'Protected dashboard',
    to: '/dashboard',
    size: 'xl' as const,
    color: 'neutral' as const,
    variant: 'subtle' as const
  }]
})
</script>

<template>
  <div>
    <UPageHero
      title="Run Codex hackathons on a real platform, not a starter template."
      description="Auth0 now handles platform authentication for the Nuxt app. Signed-in users can enter the protected dashboard, while unauthenticated requests are redirected into the login flow."
      :links="primaryLinks"
    >
      <template #headline>
        <UBadge
          color="primary"
          variant="subtle"
        >
          {{ user ? `Signed in as ${user.email ?? user.name}` : 'No active session' }}
        </UBadge>
      </template>
    </UPageHero>

    <UPageSection
      title="What this integration adds"
      description="The app now follows the platform's canonical identity model: Auth0 provides authentication and the application owns authorization and product workflows."
      :features="[{
        icon: 'i-lucide-shield-check',
        title: 'Server-side session auth',
        description: 'The Nuxt app uses the Auth0 Nuxt SDK with encrypted cookie sessions instead of a client-only token flow.'
      }, {
        icon: 'i-lucide-log-in',
        title: 'Built-in login and logout routes',
        description: 'The UI links directly to `/auth/login` and `/auth/logout`, with return paths preserved for protected navigation.'
      }, {
        icon: 'i-lucide-lock',
        title: 'Protected application surface',
        description: 'The `/dashboard` route is guarded by both route middleware and server middleware so unauthenticated access is redirected early.'
      }]"
    />
  </div>
</template>
