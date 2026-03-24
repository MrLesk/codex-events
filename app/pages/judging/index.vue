<script setup lang="ts">
import JudgeAssignmentInboxCard from '~/components/judging/JudgeAssignmentInboxCard.vue'
import { formatHackathonState, getHackathonStateColor } from '~/utils/admin-workspace'
import { requireAuthNavigationGuard } from '~/utils/auth-guards'

definePageMeta({
  middleware: [requireAuthNavigationGuard]
})

const route = useRoute()
const workspace = useJudgeWorkspace()

const inboxGroups = computed(() => workspace.inboxGroups.value)
const assignmentCount = computed(() =>
  inboxGroups.value.reduce((total, group) => total + group.assignments.length, 0)
)
const inProgressCount = computed(() =>
  inboxGroups.value.reduce(
    (total, group) => total + group.assignments.filter(assignment => assignment.status === 'judge_started').length,
    0
  )
)
const flashMessage = computed(() =>
  route.query.notice === 'skipped'
    ? 'The assignment was skipped and removed from your active blind-review queue.'
    : ''
)

useSeoMeta({
  title: 'Judge Workspace | Codex Hackathons',
  description: 'Blind assignment inbox for active judge reviews.'
})
</script>

<template>
  <div class="pb-24">
    <section class="relative isolate overflow-hidden border-b border-default/80 bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.14),transparent_26%),linear-gradient(180deg,rgba(249,251,255,0.96),rgba(241,245,252,0.94))]">
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />

      <AppContainer class="relative py-12 sm:py-16">
        <div class="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_20rem] xl:items-start">
          <div class="space-y-6">
            <AppBadge
              color="primary"
              variant="subtle"
              class="rounded-full px-4 py-1.5 font-semibold uppercase tracking-[0.16em]"
            >
              Blind review workspace
            </AppBadge>

            <div class="space-y-4">
              <h1 class="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-highlighted sm:text-5xl">
                Review only the work, never the team identity.
              </h1>
              <p class="max-w-3xl text-base leading-8 text-toned">
                This inbox shows only the current actor&apos;s active blind assignments. Open an assignment to inspect anonymized application context, score the rubric, or record canonical review outcomes.
              </p>
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
              <AppCard
                variant="subtle"
                :ui="{ root: 'rounded-[1.7rem] border border-default/80 bg-elevated/82 shadow-[0_24px_60px_-48px_rgba(17,24,39,0.42)]' }"
              >
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Active assignments
                </p>
                <p class="mt-3 text-4xl font-semibold tracking-[-0.05em] text-highlighted">
                  {{ assignmentCount }}
                </p>
              </AppCard>

              <AppCard
                variant="subtle"
                :ui="{ root: 'rounded-[1.7rem] border border-default/80 bg-elevated/82 shadow-[0_24px_60px_-48px_rgba(17,24,39,0.42)]' }"
              >
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  In review
                </p>
                <p class="mt-3 text-4xl font-semibold tracking-[-0.05em] text-highlighted">
                  {{ inProgressCount }}
                </p>
              </AppCard>

              <AppCard
                variant="subtle"
                :ui="{ root: 'rounded-[1.7rem] border border-default/80 bg-elevated/82 shadow-[0_24px_60px_-48px_rgba(17,24,39,0.42)]' }"
              >
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Hackathons in queue
                </p>
                <p class="mt-3 text-4xl font-semibold tracking-[-0.05em] text-highlighted">
                  {{ inboxGroups.length }}
                </p>
              </AppCard>
            </div>
          </div>

          <AppCard
            variant="subtle"
            :ui="{ root: 'rounded-[1.9rem] border border-default/80 bg-elevated/82 shadow-[0_28px_72px_-52px_rgba(17,24,39,0.42)]' }"
          >
            <div class="space-y-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Review contract
              </p>
              <p class="text-xl font-semibold tracking-[-0.03em] text-highlighted">
                Team identity stays hidden throughout this workspace.
              </p>
              <p class="text-sm leading-7 text-toned">
                Admin reassignment and operational oversight remain outside this route. This surface stays focused on active blind reviews assigned to the current actor.
              </p>
            </div>
          </AppCard>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="space-y-8 pt-10">
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
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Judge workspace unavailable"
        :description="workspace.error.value.message"
      />

      <AppAlert
        v-else-if="!workspace.hasPlatformAccount.value"
        color="warning"
        variant="soft"
        title="Platform account required"
        description="Blind review access requires a platform account linked to the authenticated session."
      />

      <div
        v-else-if="workspace.status.value === 'pending'"
        class="grid gap-6"
      >
        <div class="h-48 rounded-[2rem] border border-default/80 bg-elevated/75" />
        <div class="h-64 rounded-[2rem] border border-default/80 bg-elevated/75" />
      </div>

      <div
        v-else-if="inboxGroups.length === 0"
        class="rounded-[2rem] border border-dashed border-default/80 bg-elevated/68 px-8 py-16 text-center shadow-[0_28px_72px_-52px_rgba(17,24,39,0.36)]"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          No active blind reviews
        </p>
        <h2 class="mt-4 text-3xl font-semibold tracking-[-0.04em] text-highlighted">
          Your review queue is currently clear.
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-sm leading-8 text-toned">
          New assignments appear here after judging preparation distributes locked submissions and the hackathon enters judge review.
        </p>
      </div>

      <div
        v-else
        class="space-y-8"
      >
        <section
          v-for="group in inboxGroups"
          :key="group.hackathon.id"
          :data-testid="`judge-hackathon-group-${group.hackathon.id}`"
          class="space-y-4"
        >
          <div class="flex flex-col gap-4 rounded-[1.9rem] border border-default/80 bg-elevated/80 px-6 py-5 shadow-[0_24px_60px_-46px_rgba(17,24,39,0.38)] sm:flex-row sm:items-end sm:justify-between">
            <div class="space-y-3">
              <div class="flex flex-wrap items-center gap-2">
                <AppBadge
                  :color="getHackathonStateColor(group.hackathon.state)"
                  variant="soft"
                  class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                >
                  {{ formatHackathonState(group.hackathon.state) }}
                </AppBadge>
                <span class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  {{ group.hackathon.city }}
                </span>
              </div>

              <div>
                <h2 class="text-2xl font-semibold tracking-[-0.04em] text-highlighted">
                  {{ group.hackathon.name }}
                </h2>
                <p class="mt-2 max-w-3xl text-sm leading-7 text-toned">
                  {{ group.hackathon.description }}
                </p>
              </div>
            </div>

            <div class="rounded-[1.35rem] border border-default/70 bg-default/65 px-4 py-3 text-left sm:text-right">
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Active blind reviews
              </p>
              <p class="mt-2 text-2xl font-semibold tracking-[-0.04em] text-highlighted">
                {{ group.assignments.length }}
              </p>
            </div>
          </div>

          <div class="grid gap-5 xl:grid-cols-2">
            <JudgeAssignmentInboxCard
              v-for="assignment in group.assignments"
              :key="assignment.id"
              :assignment="assignment"
            />
          </div>
        </section>
      </div>
    </AppContainer>
  </div>
</template>
