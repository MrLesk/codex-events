<script setup lang="ts">
import JudgeAssignmentInboxCard from '~/components/judging/JudgeAssignmentInboxCard.vue'
import JudgeAssignmentWorkspacePanel from '~/components/judging/JudgeAssignmentWorkspacePanel.vue'
import { buildAccountHackathonJudgingTabHref } from '~/utils/judging-query'
import { filterExplicitJudgeHackathons } from '~/utils/judging-workspace'

const props = withDefaults(defineProps<{
  hackathonId: string
  slug: string
  selectedAssignmentId?: string | null
}>(), {
  selectedAssignmentId: null
})

const workspace = useJudgeWorkspace()

const currentHackathon = computed(() =>
  filterExplicitJudgeHackathons(workspace.hackathons.data.value ?? [], workspace.actor.value)
    .find(hackathon => hackathon.id === props.hackathonId || hackathon.slug === props.slug)
    ?? null
)
const currentInboxGroup = computed(() =>
  workspace.inboxGroups.value.find(group => group.hackathon.slug === props.slug) ?? null
)
const assignments = computed(() => currentInboxGroup.value?.assignments ?? [])
const selectedAssignmentId = computed(() => props.selectedAssignmentId?.trim() ?? '')
const inReviewCount = computed(() =>
  assignments.value.filter(assignment => assignment.status === 'judge_started').length
)
const readyCount = computed(() =>
  assignments.value.filter(assignment => assignment.status === 'assigned').length
)

const nextAction = computed(() => {
  const inProgress = assignments.value.find(assignment => assignment.status === 'judge_started')

  if (inProgress && currentHackathon.value) {
    return {
      label: 'Continue review',
      to: buildAccountHackathonJudgingTabHref(currentHackathon.value.slug, inProgress.id)
    }
  }

  const ready = assignments.value.find(assignment => assignment.status === 'assigned')

  if (ready && currentHackathon.value) {
    return {
      label: 'Start next review',
      to: buildAccountHackathonJudgingTabHref(currentHackathon.value.slug, ready.id)
    }
  }

  return null
})

async function refreshWorkspace() {
  await workspace.refreshWorkspace()
}
</script>

<template>
  <div class="space-y-6">
    <AppAlert
      v-if="workspace.error.value"
      color="error"
      variant="soft"
      title="Judging workspace unavailable"
      :description="workspace.error.value.message"
    />

    <AppAlert
      v-else-if="workspace.status.value === 'pending'"
      color="neutral"
      variant="soft"
      title="Loading judging workspace"
      description="Fetching your blind-review queue for this hackathon."
    />

    <AppAlert
      v-else-if="!currentHackathon"
      color="warning"
      variant="soft"
      title="Judge access required"
      description="This hackathon is not currently assigned to you as a judge."
    />

    <template v-else>
      <JudgeAssignmentWorkspacePanel
        v-if="selectedAssignmentId && currentHackathon"
        :hackathon-id="currentHackathon.id"
        :hackathon-slug="currentHackathon.slug"
        :assignment-id="selectedAssignmentId"
        @updated="refreshWorkspace"
      />

      <template v-else>
        <section class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-xl hackathon-workspace-panel p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Active assignments
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ assignments.length }}
            </p>
          </div>

          <div class="rounded-xl hackathon-workspace-panel p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              In review
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ inReviewCount }}
            </p>
          </div>

          <div class="rounded-xl hackathon-workspace-panel p-4">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Ready to start
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ readyCount }}
            </p>
          </div>
        </section>

        <section
          v-if="nextAction"
          class="rounded-xl hackathon-workspace-panel p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="space-y-1">
              <p class="text-[15px] font-semibold text-highlighted dark:text-white">
                Continue in blind review
              </p>
              <p class="text-[13px] text-muted">
                Pick up your next assignment directly from this hackathon workspace.
              </p>
            </div>

            <AppButton
              :to="nextAction.to"
              color="neutral"
              variant="soft"
              class="rounded-lg px-3 py-1.5 text-[13px] font-medium"
            >
              {{ nextAction.label }}
            </AppButton>
          </div>
        </section>

        <section
          v-if="assignments.length === 0"
          class="rounded-xl hackathon-workspace-panel-dashed p-8 text-center"
        >
          <p class="text-[15px] font-medium text-highlighted dark:text-white">
            No active blind reviews for this hackathon
          </p>
          <p class="mt-2 text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
            New assignments will appear here after judging starts.
          </p>
        </section>

        <section
          v-else
          class="grid gap-4"
        >
          <JudgeAssignmentInboxCard
            v-for="assignment in assignments"
            :key="assignment.id"
            :assignment="assignment"
            :hackathon-slug="currentHackathon.slug"
          />
        </section>
      </template>
    </template>
  </div>
</template>
