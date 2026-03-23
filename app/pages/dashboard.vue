<script setup lang="ts">
definePageMeta({
  middleware: [to => useUser().value
    ? undefined
    : navigateTo(`/auth/login?returnTo=${encodeURIComponent(to.fullPath)}`)]
})

const user = useUser()
const {
  actor,
  dashboardEntries,
  hasAdminAccess,
  hasJudgeAccess,
  isResolvingActor,
  prizeRedemptionsErrorMessage,
  roleChips
} = useShellNavigation()

const actorRows = computed(() => {
  if (actor.value.kind === 'anonymous') {
    return []
  }

  const rows = [{
    label: 'Actor kind',
    value: actor.value.kind
  }, {
    label: 'Email',
    value: actor.value.sessionUser.email ?? 'Not available'
  }, {
    label: 'Auth0 subject',
    value: actor.value.sessionUser.sub ?? 'Not available'
  }]

  if (actor.value.kind === 'platform_user') {
    rows.push({
      label: 'Platform profile',
      value: actor.value.platformUser.displayName
    })
  }

  return rows
})

const roleSummary = computed(() => {
  if (actor.value.kind === 'authenticated_identity') {
    return 'Finish the platform account setup before hackathon applications, teams, submissions, and role-aware workspaces become available.'
  }

  if (actor.value.kind !== 'platform_user') {
    return 'Authenticate through Auth0 to unlock the role-aware dashboard.'
  }

  if (hasAdminAccess.value && hasJudgeAccess.value) {
    return 'You have admin and judge entry points available, alongside participant and winner-facing surfaces tied to your platform account.'
  }

  if (hasAdminAccess.value) {
    return 'You can operate admin configuration surfaces in addition to the standard participant and account areas.'
  }

  if (hasJudgeAccess.value) {
    return 'You can enter the blind judge workspace in addition to participant and account surfaces.'
  }

  return 'Your dashboard is currently focused on participant, account, and winner-facing entry points.'
})

useSeoMeta({
  title: 'Dashboard | Codex Hackathons',
  description: 'Role-aware entry hub for the Codex hackathon platform.'
})
</script>

<template>
  <div class="space-y-12 pb-20">
    <UPageHero
      title="Dashboard"
      :description="roleSummary"
    >
      <template #headline>
        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="chip in roleChips"
            :key="chip"
            color="primary"
            variant="soft"
            class="rounded-full px-4 py-1.5 font-semibold tracking-[0.16em] uppercase"
          >
            {{ chip }}
          </UBadge>
        </div>
      </template>

      <template #body>
        <UAlert
          v-if="isResolvingActor"
          color="primary"
          variant="soft"
          icon="i-lucide-loader-circle"
          title="Resolving platform actor"
          description="The shell is loading platform-specific permissions and role assignments for this authenticated session."
        />

        <UCard
          v-else
          variant="subtle"
          :ui="{ root: 'rounded-[1.85rem] border border-default/80 bg-elevated/82 shadow-[0_30px_72px_-52px_rgba(15,20,34,0.65)] backdrop-blur' }"
        >
          <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-center gap-4">
              <UAvatar
                :src="user?.picture"
                :alt="user?.name"
                size="3xl"
              />

              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Active session
                </p>
                <h1 class="mt-2 text-3xl font-semibold tracking-[-0.04em] text-highlighted">
                  {{ actor.kind === 'platform_user' ? actor.platformUser.displayName : user?.name }}
                </h1>
                <p class="mt-2 text-sm leading-7 text-toned">
                  {{ roleSummary }}
                </p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div
                v-for="row in actorRows"
                :key="row.label"
                class="rounded-[1.35rem] border border-default/70 bg-bg/80 px-4 py-3"
              >
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {{ row.label }}
                </p>
                <p class="mt-2 break-all text-sm font-medium text-highlighted">
                  {{ row.value }}
                </p>
              </div>
            </div>
          </div>
        </UCard>
      </template>
    </UPageHero>

    <UPageSection
      title="Available entry points"
      description="These cards are derived from the current actor and hackathon-role assignments exposed by the canonical session API."
    >
      <template #body>
        <UAlert
          v-if="prizeRedemptionsErrorMessage"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Prize redemption status unavailable"
          :description="prizeRedemptionsErrorMessage"
          class="mb-6"
        />

        <div class="grid gap-6 xl:grid-cols-2">
          <DashboardEntryCard
            v-for="entry in dashboardEntries"
            :key="entry.id"
            :entry="entry"
          />
        </div>
      </template>
    </UPageSection>
  </div>
</template>
