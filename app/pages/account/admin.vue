<script setup lang="ts">
import AccountHackathonDashboardList from '~/components/account/AccountHackathonDashboardList.vue'
import {
  adminOverviewTabs,
  countAdminOverviewHackathonsByTab,
  getAdminOverviewTabForHackathon,
  type AdminOverviewTab
} from '~/utils/admin-overview'
import { canCreateHackathon } from '~/utils/admin-workspace'
import { normalizeTabQueryValue, resolveTabQueryValue } from '~/utils/tab-query'

definePageMeta({
  layout: 'profile',
  middleware: ['require-account-admin']
})

const route = useRoute()
const workspace = useAdminWorkspace()
const adminOverviewNow = Date.now()
const adminOverviewTabLabels: Record<AdminOverviewTab, string> = {
  active: 'Active',
  upcoming: 'Upcoming',
  past: 'Past'
}

const isPlatformAdmin = computed(() => workspace.actor.value?.isPlatformAdmin === true)
const canCreate = computed(() => canCreateHackathon(workspace.actor.value))
const manageableHackathons = computed(() => workspace.manageableHackathons.value)
const activeTab = computed<AdminOverviewTab>(() =>
  resolveTabQueryValue(route.query.tab, adminOverviewTabs, 'active')
)
const filterCounts = computed(() =>
  countAdminOverviewHackathonsByTab(manageableHackathons.value, adminOverviewNow)
)
const filterTabs = computed(() =>
  adminOverviewTabs.map(tab => ({
    id: tab,
    label: adminOverviewTabLabels[tab],
    count: filterCounts.value[tab]
  }))
)
const filteredHackathons = computed(() =>
  manageableHackathons.value.filter(hackathon =>
    getAdminOverviewTabForHackathon(hackathon, adminOverviewNow) === activeTab.value
  )
)
const listItems = computed(() =>
  filteredHackathons.value.map(hackathon => ({
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
const listContent = computed(() => {
  if (activeTab.value === 'upcoming') {
    return {
      title: isPlatformAdmin.value ? 'Upcoming hackathons' : 'Upcoming hackathons you manage',
      description: isPlatformAdmin.value
        ? 'Draft and future hackathons stay here until they move into active operations.'
        : 'Draft and future hackathons you manage stay here until they move into active operations.',
      emptyTitle: 'No upcoming hackathons',
      emptyDescription: isPlatformAdmin.value
        ? 'Draft and future hackathons will appear here.'
        : 'When you manage a draft or future hackathon, it will appear here.'
    }
  }

  if (activeTab.value === 'past') {
    return {
      title: isPlatformAdmin.value ? 'Past hackathons' : 'Past hackathons you managed',
      description: isPlatformAdmin.value
        ? 'Completed hackathons remain available for reference and follow-up work.'
        : 'Completed hackathons you managed remain available for reference and follow-up work.',
      emptyTitle: 'No past hackathons',
      emptyDescription: isPlatformAdmin.value
        ? 'Completed hackathons will appear here once they are closed.'
        : 'Completed hackathons you managed will appear here once they are closed.'
    }
  }

  return {
    title: isPlatformAdmin.value ? 'Active hackathons' : 'Active hackathons you manage',
    description: isPlatformAdmin.value
      ? 'Use the shared list surface to jump into live operations, settings, judging, and outcome workflows.'
      : 'Open the hackathons you currently manage and continue work in operations or settings.',
    emptyTitle: 'No active hackathons',
    emptyDescription: isPlatformAdmin.value
      ? 'Active hackathons will appear here once they move out of draft and before completion.'
      : 'When a manageable hackathon is live or in progress, it will appear here.'
  }
})

async function selectAdminOverviewTab(nextTab: AdminOverviewTab) {
  if (normalizeTabQueryValue(route.query.tab) === nextTab) {
    return
  }

  await navigateTo({
    path: route.path,
    query: {
      ...route.query,
      tab: nextTab
    },
    hash: route.hash
  })
}

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

            <div class="flex flex-wrap items-center gap-3">
              <AppButton
                v-if="isPlatformAdmin"
                to="/account/platform-admins"
                color="neutral"
                variant="outline"
                class="h-auto rounded-lg px-4 py-2 text-[13px] font-medium"
              >
                Manage platform admins
              </AppButton>

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
        <section class="app-surface-panel flex flex-col gap-4 rounded-xl p-2">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <button
              v-for="tab in filterTabs"
              :key="tab.id"
              class="inline-flex min-w-max grow basis-0 items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:min-w-0 sm:grow-0 sm:basis-auto sm:justify-start"
              :class="activeTab === tab.id ? 'bg-black font-medium text-white dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
              @click="void selectAdminOverviewTab(tab.id)"
            >
              <span>{{ tab.label }}</span>
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
                :class="activeTab === tab.id ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
              >
                {{ tab.count }}
              </span>
            </button>
          </div>
        </section>

        <AccountHackathonDashboardList
          :title="listContent.title"
          :description="listContent.description"
          :items="listItems"
          :empty-title="listContent.emptyTitle"
          :empty-description="listContent.emptyDescription"
        />
      </template>
    </AppContainer>
  </div>
</template>
