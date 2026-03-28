<script setup lang="ts">
import AccountHackathonDashboardList from '~/components/account/AccountHackathonDashboardList.vue'
import { filterExplicitJudgeHackathons } from '~/utils/judging-workspace'

definePageMeta({
  layout: 'profile',
  middleware: ['require-judge-dashboard']
})

const workspace = useJudgeWorkspace()

const explicitJudgeHackathons = computed(() =>
  filterExplicitJudgeHackathons(workspace.hackathons.data.value ?? [], workspace.actor.value)
)
const assignmentSummaryByHackathonId = computed(() => {
  const summaryByHackathonId = new Map<string, {
    total: number
    inReview: number
    ready: number
    ineligible: number
  }>()

  for (const group of workspace.inboxGroups.value) {
    summaryByHackathonId.set(group.hackathon.id, {
      total: group.assignments.length,
      inReview: group.assignments.filter(assignment => assignment.status === 'judge_started').length,
      ready: group.assignments.filter(assignment => assignment.status === 'assigned').length,
      ineligible: group.assignments.filter(assignment => assignment.ineligibilityStatus === 'ineligible').length
    })
  }

  return summaryByHackathonId
})

const assignmentCount = computed(() =>
  workspace.inboxGroups.value.reduce((total, group) => total + group.assignments.length, 0)
)
const inProgressCount = computed(() =>
  workspace.inboxGroups.value.reduce(
    (total, group) => total + group.assignments.filter(assignment => assignment.status === 'judge_started').length,
    0
  )
)
const listItems = computed(() =>
  explicitJudgeHackathons.value.map((hackathon) => {
    const summary = assignmentSummaryByHackathonId.value.get(hackathon.id)
    const totalAssignments = summary?.total ?? 0
    const inReviewAssignments = summary?.inReview ?? 0
    const readyAssignments = summary?.ready ?? 0

    return {
      id: hackathon.id,
      name: hackathon.name,
      description: totalAssignments > 0
        ? `${totalAssignments} active assignment${totalAssignments === 1 ? '' : 's'} in your blind-review queue${inReviewAssignments > 0 ? `, including ${inReviewAssignments} currently in review` : ''}.`
        : 'You are assigned as a judge for this hackathon. New blind reviews will appear here when judging begins.',
      state: hackathon.state,
      to: `/account/hackathons/${hackathon.slug}?tab=judging`,
      actionLabel: totalAssignments > 0 ? 'Open judging' : 'Open hackathon',
      overline: totalAssignments > 0
        ? `${totalAssignments} active assignment${totalAssignments === 1 ? '' : 's'}`
        : 'Judge assigned',
      meta: [
        formatHackathonLocation(hackathon),
        `${hackathon.maxTeamMembers} max/team`,
        readyAssignments > 0 ? `${readyAssignments} ready to start` : 'No active queue yet'
      ]
    }
  })
)

useSeoMeta({
  title: 'Judge Dashboard | Codex Hackathons',
  description: 'See the hackathons where you are assigned as a judge and open their blind-review workspaces.'
})
</script>

<template>
  <div class="pb-14">
    <section class="border-b border-black/8 dark:border-white/[0.08]">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <div class="space-y-2 pb-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Account workspace
              </p>
              <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
                Judge dashboard
              </h1>
              <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
                Open the hackathons where you are assigned as a judge and step directly into blind review.
              </p>
            </div>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="max-w-[68rem] space-y-6 pt-6">
      <AppAlert
        v-if="workspace.error.value"
        color="error"
        variant="soft"
        title="Judge dashboard unavailable"
        :description="workspace.error.value.message"
      />

      <AppAlert
        v-else-if="workspace.status.value === 'pending'"
        color="neutral"
        variant="soft"
        title="Loading judge dashboard"
        description="Fetching your assigned hackathons and active review queue."
      />

      <template v-else>
        <section class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Judge hackathons
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ explicitJudgeHackathons.length }}
            </p>
          </div>

          <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Active assignments
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ assignmentCount }}
            </p>
          </div>

          <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              In review
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ inProgressCount }}
            </p>
          </div>
        </section>

        <AccountHackathonDashboardList
          title="Hackathons you judge"
          description="Each hackathon opens into the same detail surface, with the Judging tab preselected for your review work."
          :items="listItems"
          empty-title="No judge assignments yet"
          empty-description="When you are explicitly assigned as a judge on a hackathon, it will appear here."
        />
      </template>
    </AppContainer>
  </div>
</template>
