<script setup lang="ts">
definePageMeta({
  middleware: [to => useUser().value
    ? undefined
    : navigateTo(`/auth/login?returnTo=${encodeURIComponent(to.fullPath)}`)]
})

const user = useUser()

const profileRows = computed(() => {
  if (!user.value) {
    return []
  }

  return [
    {
      label: 'Email',
      value: user.value.email ?? 'Not available'
    },
    {
      label: 'Auth0 subject',
      value: user.value.sub ?? 'Not available'
    },
    {
      label: 'Nickname',
      value: user.value.nickname ?? 'Not available'
    }
  ]
})
</script>

<template>
  <UContainer class="py-12">
    <UPageSection
      title="Dashboard"
      description="This route is protected by Auth0-backed session middleware and is only available to authenticated platform users."
    >
      <UCard
        v-if="user"
        class="max-w-3xl"
      >
        <template #header>
          <div class="flex items-center gap-4">
            <UAvatar
              :src="user.picture"
              :alt="user.name"
              size="xl"
            />

            <div class="space-y-1">
              <p class="text-lg font-semibold text-highlighted">
                {{ user.name }}
              </p>
              <p class="text-sm text-muted">
                Authenticated through Auth0
              </p>
            </div>
          </div>
        </template>

        <dl class="grid gap-4 sm:grid-cols-2">
          <div
            v-for="row in profileRows"
            :key="row.label"
            class="rounded-lg border border-default bg-elevated/60 p-4"
          >
            <dt class="text-xs font-medium uppercase tracking-[0.16em] text-muted">
              {{ row.label }}
            </dt>
            <dd class="mt-2 break-all text-sm text-toned">
              {{ row.value }}
            </dd>
          </div>
        </dl>
      </UCard>
    </UPageSection>
  </UContainer>
</template>
