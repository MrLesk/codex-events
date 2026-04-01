<script setup lang="ts">
import AccountHackathonDashboardList from '~/components/account/AccountHackathonDashboardList.vue'
import { canCreateHackathon } from '~/utils/admin-workspace'

definePageMeta({
  layout: 'profile',
  middleware: ['require-account-admin']
})

const workspace = useAdminWorkspace()

const isPlatformAdmin = computed(() => workspace.actor.value?.isPlatformAdmin === true)
const canCreate = computed(() => canCreateHackathon(workspace.actor.value))
const manageableHackathons = computed(() => workspace.manageableHackathons.value)
const activeOperationsCount = computed(() =>
  manageableHackathons.value.filter(hackathon => hackathon.state !== 'draft' && hackathon.state !== 'completed').length
)
const draftCount = computed(() =>
  manageableHackathons.value.filter(hackathon => hackathon.state === 'draft').length
)
const judgingFlowCount = computed(() =>
  manageableHackathons.value.filter(hackathon =>
    ['judging_preparation', 'judge_review', 'shortlist'].includes(hackathon.state)
  ).length
)
const listItems = computed(() =>
  manageableHackathons.value.map(hackathon => ({
    id: hackathon.id,
    name: hackathon.name,
    description: isPlatformAdmin.value
      ? 'Open this hackathon to manage operations, change settings, and work across the full internal admin surface.'
      : 'Open this hackathon to manage operations, configure settings, and monitor the participant workflow from one shared detail surface.',
    state: hackathon.state,
    to: `/account/hackathons/${hackathon.slug}?tab=operations`,
    actionLabel: 'Open operations',
    overline: 'Admin',
    meta: [
      formatHackathonLocation(hackathon),
      `${hackathon.maxTeamMembers} max/team`,
      hackathon.slug
    ]
  }))
)

useSeoMeta({
  title: 'Manage Hackathons | Codex Hackathons',
  description: 'Open the hackathons you manage and run applications, judging, and outcomes.'
})
</script>

<template>
  <div class="pb-14">
    <section class="border-b border-black/8 dark:border-white/[0.08]">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <div class="space-y-2 pb-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
                Admin dashboard
              </h1>
              <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
                {{
                  isPlatformAdmin
                    ? 'Run platform-wide admin work, create hackathons, and open any hackathon workspace from one place.'
                    : 'Open the hackathons you manage and jump into their operations and settings tabs.'
                }}
              </p>
            </div>

            <AppButton
              v-if="canCreate"
              to="/admin/hackathons/new"
              color="neutral"
              variant="solid"
              class="h-auto rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
            >
              Create hackathon
              <template #trailing>
                <AppIcon
                  name="i-lucide-plus"
                  class="size-3.5"
                />
              </template>
            </AppButton>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="max-w-[68rem] space-y-6 pt-6">
      <AppAlert
        v-if="workspace.session.error.value"
        color="error"
        variant="soft"
        title="Admin dashboard unavailable"
        :description="workspace.session.error.value.message"
      />

      <AppAlert
        v-else-if="workspace.hackathons.error.value"
        color="error"
        variant="soft"
        title="Unable to load hackathons"
        :description="workspace.hackathons.error.value.message"
      />

      <AppAlert
        v-else-if="workspace.session.status.value === 'pending' || workspace.hackathons.status.value === 'pending'"
        color="neutral"
        variant="soft"
        title="Loading admin dashboard"
        :description="isPlatformAdmin ? 'Fetching the full admin workspace.' : 'Fetching the hackathons you can manage.'"
      />

      <template v-else>
        <section class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              {{ isPlatformAdmin ? 'Total hackathons' : 'Manageable hackathons' }}
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ manageableHackathons.length }}
            </p>
          </div>

          <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Active operations
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ activeOperationsCount }}
            </p>
          </div>

          <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              {{ isPlatformAdmin ? 'Drafts in setup' : 'In judging flow' }}
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ isPlatformAdmin ? draftCount : judgingFlowCount }}
            </p>
          </div>
        </section>

        <AccountHackathonDashboardList
          :title="isPlatformAdmin ? 'All hackathons' : 'Hackathons you manage'"
          :description="isPlatformAdmin
            ? 'Use the same shared list surface to jump into operations and settings for any hackathon.'
            : 'Each hackathon opens into the shared account detail surface, with Operations preselected so you can continue work immediately.'"
          :items="listItems"
          :empty-title="isPlatformAdmin ? 'No hackathons yet' : 'No manageable hackathons yet'"
          :empty-description="isPlatformAdmin
            ? 'Create the first hackathon to start operating the platform.'
            : 'When you receive admin access, those hackathons will appear here.'"
        />
      </template>
    </AppContainer>
  </div>
</template>
