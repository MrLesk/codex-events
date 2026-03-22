<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const route = useRoute()
const user = useUser()

const loginHref = computed(() => `/auth/login?returnTo=${encodeURIComponent(route.fullPath || '/dashboard')}`)
const title = 'Codex Hackathons'
const description = 'The internal platform for running Codex community hackathons with Auth0-backed platform authentication.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="font-semibold tracking-[0.14em] uppercase text-sm text-highlighted"
        >
          Codex Hackathons
        </NuxtLink>
      </template>

      <template #right>
        <UButton
          to="/dashboard"
          color="neutral"
          variant="ghost"
          label="Dashboard"
        />

        <UColorModeButton />

        <UButton
          v-if="user"
          to="/auth/logout"
          label="Sign out"
          color="primary"
        />
        <UButton
          v-else
          :to="loginHref"
          label="Sign in"
          color="primary"
        />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <USeparator icon="i-simple-icons-nuxtdotjs" />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          Codex Community hackathon platform
        </p>
      </template>

      <template #right>
        <div class="flex items-center gap-3 text-sm text-muted">
          <UAvatar
            v-if="user"
            :src="user.picture"
            :alt="user.name"
            size="sm"
          />
          <span>{{ user?.email ?? 'Signed out' }}</span>
        </div>
      </template>
    </UFooter>
  </UApp>
</template>
