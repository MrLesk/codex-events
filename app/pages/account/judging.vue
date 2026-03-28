<script setup lang="ts">
import JudgeAssignmentInboxCard from '~/components/judging/JudgeAssignmentInboxCard.vue'
import {
  formatHackathonState,
  getHackathonStateColor,
  hasHackathonAdminAccess
} from '~/utils/admin-workspace'
import { collapseMarkdownToPlainText } from '~/utils/hackathon-description'

definePageMeta({
  layout: 'profile',
  middleware: ['require-auth']
})

const route = useRoute()
const workspace = useJudgeWorkspace()
const inboxFilter = ref<'all' | 'in_review' | 'ready' | 'ineligible'>('all')

const inboxGroups = computed(() => workspace.inboxGroups.value)
const visibleInboxGroups = computed(() => {
  if (inboxFilter.value === 'all') {
    return inboxGroups.value
  }

  return inboxGroups.value
    .map(group => ({
      ...group,
      assignments: group.assignments.filter((assignment) => {
        if (inboxFilter.value === 'in_review') {
          return assignment.status === 'judge_started'
        }

        if (inboxFilter.value === 'ready') {
          return assignment.status === 'assigned'
        }

        return assignment.ineligibilityStatus === 'ineligible'
      })
    }))
    .filter(group => group.assignments.length > 0)
})

const assignmentCount = computed(() =>
  inboxGroups.value.reduce((total, group) => total + group.assignments.length, 0)
)
const inProgressCount = computed(() =>
  inboxGroups.value.reduce(
    (total, group) => total + group.assignments.filter(assignment => assignment.status === 'judge_started').length,
    0
  )
)
const hackathonCount = computed(() => inboxGroups.value.length)
const visibleAssignmentCount = computed(() =>
  visibleInboxGroups.value.reduce((total, group) => total + group.assignments.length, 0)
)
const descriptionPreviewCharacterLimit = 320
const expandedDescriptionHackathonIds = ref(new Set<string>())
const normalizedDescriptionByHackathonId = computed(() => {
  const descriptionMap = new Map<string, string>()

  for (const group of inboxGroups.value) {
    descriptionMap.set(group.hackathon.id, collapseMarkdownToPlainText(group.hackathon.description))
  }

  return descriptionMap
})
const isLoading = computed(() => workspace.status.value === 'pending')
const hasJudgeAccess = computed(() => {
  const actor = workspace.actor.value

  if (!actor?.hasPlatformAccount) {
    return false
  }

  if (actor.isPlatformAdmin) {
    return true
  }

  return actor.hackathonRoles.some(role => role.role === 'judge' || role.role === 'hackathon_admin')
})
const canManageHackathon = computed(() => (hackathonId: string) =>
  hasHackathonAdminAccess(workspace.actor.value, hackathonId)
)
const nextAction = computed(() => {
  for (const group of inboxGroups.value) {
    const inProgress = group.assignments.find(assignment => assignment.status === 'judge_started')

    if (inProgress) {
      return {
        label: 'Continue review',
        to: `/hackathons/${group.hackathon.slug}/judging/assignments/${inProgress.id}`
      }
    }
  }

  for (const group of inboxGroups.value) {
    const ready = group.assignments.find(assignment => assignment.status === 'assigned')

    if (ready) {
      return {
        label: 'Start next review',
        to: `/hackathons/${group.hackathon.slug}/judging/assignments/${ready.id}`
      }
    }
  }

  return null
})
const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'in_review', label: 'In review' },
  { id: 'ready', label: 'Ready' },
  { id: 'ineligible', label: 'Ineligible' }
] as const
const flashMessage = computed(() =>
  route.query.notice === 'skipped'
    ? 'The assignment was skipped and removed from your active blind-review queue.'
    : ''
)

function isDescriptionExpanded(hackathonId: string) {
  return expandedDescriptionHackathonIds.value.has(hackathonId)
}

function toggleDescriptionExpansion(hackathonId: string) {
  const nextExpandedIds = new Set(expandedDescriptionHackathonIds.value)

  if (nextExpandedIds.has(hackathonId)) {
    nextExpandedIds.delete(hackathonId)
  } else {
    nextExpandedIds.add(hackathonId)
  }

  expandedDescriptionHackathonIds.value = nextExpandedIds
}

function getDescriptionPreview(hackathonId: string) {
  const normalizedDescription = normalizedDescriptionByHackathonId.value.get(hackathonId) ?? ''

  if (
    isDescriptionExpanded(hackathonId)
    || normalizedDescription.length <= descriptionPreviewCharacterLimit
  ) {
    return normalizedDescription
  }

  return `${normalizedDescription.slice(0, descriptionPreviewCharacterLimit).trimEnd()}…`
}

function shouldShowDescriptionToggle(hackathonId: string) {
  const normalizedDescription = normalizedDescriptionByHackathonId.value.get(hackathonId) ?? ''
  return normalizedDescription.length > descriptionPreviewCharacterLimit
}

useSeoMeta({
  title: 'Judging Workspace | Codex Hackathons',
  description: 'Review your active blind judging assignments.'
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
                Judging
              </h1>
              <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
                Work through your active blind review queue. Team identity remains hidden throughout these assignments.
              </p>
            </div>

            <div class="rounded-lg border border-black/8 bg-[#F7F7F8] px-4 py-2 dark:border-white/[0.08] dark:bg-[#171717]">
              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                Active assignments
              </p>
              <p class="mt-1 text-[14px] font-medium text-highlighted dark:text-white">
                {{ assignmentCount }}
              </p>
            </div>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="max-w-[68rem] space-y-6 pt-6">
      <AppAlert
        v-if="flashMessage"
        data-testid="judge-workspace-notice"
        color="success"
        variant="subtle"
        icon="i-lucide-badge-check"
        title="Queue updated"
        :description="flashMessage"
      />

      <AppAlert
        v-if="workspace.error.value"
        color="error"
        variant="soft"
        title="Judge workspace unavailable"
        :description="workspace.error.value.message"
      />

      <AppAlert
        v-else-if="isLoading"
        color="neutral"
        variant="soft"
        title="Loading assignments"
        description="This only takes a moment."
      />

      <AppAlert
        v-else-if="!workspace.hasPlatformAccount.value"
        color="warning"
        variant="soft"
        title="Platform account required"
        description="Blind review access requires a platform account linked to your authenticated session."
      />

      <AppAlert
        v-else-if="!hasJudgeAccess"
        color="warning"
        variant="soft"
        title="Judge access required"
        description="This account is not currently assigned to judge or hackathon-admin roles."
      />

      <template v-else>
        <section class="grid gap-4 sm:grid-cols-3">
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

          <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Hackathons in queue
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ hackathonCount }}
            </p>
          </div>
        </section>

        <section
          v-if="assignmentCount > 0"
          class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <button
                v-for="option in filterOptions"
                :key="option.id"
                type="button"
                class="rounded-full border px-3 py-1 text-[12px] font-medium transition-colors"
                :class="inboxFilter === option.id
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-black/10 bg-white text-neutral-700 hover:border-black/20 dark:border-white/[0.12] dark:bg-[#171717] dark:text-[#BDBDBD] dark:hover:border-white/[0.24]'"
                @click="inboxFilter = option.id"
              >
                {{ option.label }}
              </button>
            </div>

            <AppButton
              v-if="nextAction"
              :to="nextAction.to"
              color="neutral"
              variant="soft"
              class="rounded-lg px-3 py-1.5 text-[13px] font-medium"
            >
              {{ nextAction.label }}
              <template #trailing>
                <AppIcon
                  name="i-lucide-arrow-right"
                  class="size-3.5"
                />
              </template>
            </AppButton>
          </div>
        </section>

        <section
          v-if="assignmentCount === 0"
          class="rounded-xl border border-dashed border-black/10 bg-white p-10 text-center dark:border-white/[0.08] dark:bg-[#111111]"
        >
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            No active blind reviews
          </p>
          <p class="mt-3 text-lg font-semibold text-highlighted dark:text-white">
            Your queue is clear
          </p>
          <p class="mt-2 text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
            New assignments appear after judging preparation and judge review start.
          </p>
        </section>

        <section
          v-else-if="visibleAssignmentCount === 0"
          class="rounded-xl border border-dashed border-black/10 bg-white p-8 text-center dark:border-white/[0.08] dark:bg-[#111111]"
        >
          <p class="text-[15px] font-medium text-highlighted dark:text-white">
            No assignments match this filter
          </p>
          <p class="mt-2 text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
            Switch filters to review your full queue.
          </p>
        </section>

        <div
          v-else
          class="space-y-6"
        >
          <section
            v-for="group in visibleInboxGroups"
            :key="group.hackathon.id"
            :data-testid="`judge-hackathon-group-${group.hackathon.id}`"
            class="space-y-4"
          >
            <div class="rounded-xl border border-black/8 bg-white px-5 py-4 dark:border-white/[0.08] dark:bg-[#111111]">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-[20px] font-semibold text-highlighted dark:text-white">
                      {{ group.hackathon.name }}
                    </p>
                    <AppBadge
                      :color="getHackathonStateColor(group.hackathon.state)"
                      variant="soft"
                      class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    >
                      {{ formatHackathonState(group.hackathon.state) }}
                    </AppBadge>
                  </div>
                  <p class="max-w-3xl break-words text-[14px] text-neutral-600 dark:text-[#B0B0B0]">
                    {{ getDescriptionPreview(group.hackathon.id) }}
                  </p>
                  <button
                    v-if="shouldShowDescriptionToggle(group.hackathon.id)"
                    type="button"
                    class="inline-flex text-[13px] font-medium text-highlighted transition-colors hover:text-neutral-700 dark:text-white dark:hover:text-[#D9D9D9]"
                    @click="toggleDescriptionExpansion(group.hackathon.id)"
                  >
                    {{ isDescriptionExpanded(group.hackathon.id) ? 'Show less' : 'Load more' }}
                  </button>
                  <p class="text-[12px] text-muted">
                    {{ formatHackathonLocation(group.hackathon) }}
                  </p>
                </div>

                <div class="space-y-2">
                  <div class="rounded-lg border border-black/8 bg-[#F7F7F8] px-3 py-2 dark:border-white/[0.08] dark:bg-[#171717]">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      Active
                    </p>
                    <p class="mt-1 text-[16px] font-semibold text-highlighted dark:text-white">
                      {{ group.assignments.length }}
                    </p>
                  </div>

                  <AppButton
                    v-if="canManageHackathon(group.hackathon.id)"
                    :to="`/account/hackathons/${group.hackathon.slug}/admin/competition`"
                    color="neutral"
                    variant="soft"
                    class="w-full justify-center rounded-lg px-3 py-1.5 text-[12px] font-medium"
                  >
                    Competition controls
                  </AppButton>
                </div>
              </div>
            </div>

            <div class="grid gap-4 xl:grid-cols-2">
              <JudgeAssignmentInboxCard
                v-for="assignment in group.assignments"
                :key="assignment.id"
                :assignment="assignment"
                :hackathon-slug="group.hackathon.slug"
              />
            </div>
          </section>
        </div>
      </template>
    </AppContainer>
  </div>
</template>
