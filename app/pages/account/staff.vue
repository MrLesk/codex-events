<script setup lang="ts">
import AccountHackathonDashboardList from '~/components/account/AccountHackathonDashboardList.vue'
import { filterStaffAccessibleHackathons } from '~/utils/staff-dashboard'

definePageMeta({
  middleware: ['require-staff-dashboard']
})

const { actor, status: actorStatus } = useSessionActor()
const hackathons = useUserHackathons()

const currentStaffHackathons = computed(() =>
  filterStaffAccessibleHackathons(hackathons.data.value?.data.current ?? [], actor.value)
)
const pastStaffHackathons = computed(() =>
  filterStaffAccessibleHackathons(hackathons.data.value?.data.past ?? [], actor.value)
)
const allStaffHackathons = computed(() => [
  ...currentStaffHackathons.value,
  ...pastStaffHackathons.value
])
const listItems = computed(() =>
  allStaffHackathons.value.map(hackathon => ({
    id: hackathon.id,
    name: hackathon.name,
    description: 'Open this hackathon to review participant applications, inspect teams, and work from the internal staff surface.',
    state: hackathon.state,
    registrationOpensAt: hackathon.registrationOpensAt,
    registrationClosesAt: hackathon.registrationClosesAt,
    to: `/account/hackathons/${hackathon.slug}?tab=participants`,
    actionLabel: 'Open staff view',
    overline: 'Staff',
    meta: [
      formatHackathonLocation(hackathon),
      'Participant and team visibility'
    ]
  }))
)
const errorMessage = computed(() =>
  hackathons.error.value?.statusMessage
  ?? hackathons.error.value?.message
  ?? ''
)
const isLoading = computed(() =>
  actorStatus.value === 'pending'
  || hackathons.status.value === 'pending'
)

useSeoMeta({
  title: 'Staff Dashboard | Codex Hackathons',
  description: 'Open the hackathons where you support staff operations and review participant activity.'
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
                Staff dashboard
              </h1>
              <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
                Open the hackathons where you support internal operations and move directly into participant and team visibility work.
              </p>
            </div>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="max-w-[68rem] space-y-6 pt-6">
      <AppAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        title="Staff dashboard unavailable"
        :description="errorMessage"
      />

      <AppAlert
        v-else-if="isLoading"
        color="neutral"
        variant="soft"
        title="Loading staff dashboard"
        description="Fetching the hackathons where you can review participant and team activity."
      />

      <template v-else>
        <section class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Staff hackathons
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ allStaffHackathons.length }}
            </p>
          </div>

          <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Current
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ currentStaffHackathons.length }}
            </p>
          </div>

          <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Past
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ pastStaffHackathons.length }}
            </p>
          </div>
        </section>

        <AccountHackathonDashboardList
          title="Hackathons where you support operations"
          description="Each hackathon opens into the Participants tab so you can review applications, participant status, and team activity without using the admin operations surface."
          :items="listItems"
          empty-title="No staff hackathons yet"
          empty-description="When you are assigned staff access on a hackathon, it will appear here."
        />
      </template>
    </AppContainer>
  </div>
</template>
