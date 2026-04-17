<script setup lang="ts">
import type {
  AdminOperationalTeam,
  AdminSubmissionDashboardFilter,
  AdminSubmissionDashboardMetrics,
  HackathonState
} from '~/utils/admin-workspace'

import { formatTimestamp } from '~/utils/date-formatting'
import {
  getAdminSubmissionInterventionPolicy,
  formatSubmissionStatus,
  getSubmissionStatusColor,
  isHackathonStateReached
} from '~/utils/admin-workspace'

const search = defineModel<string>('search', {
  required: true
})

const filter = defineModel<AdminSubmissionDashboardFilter>('filter', {
  required: true
})

const props = defineProps<{
  hackathonState: HackathonState
  teams: AdminOperationalTeam[]
  metrics: AdminSubmissionDashboardMetrics
  pendingActionKey?: string | null
  isLoading?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  adminWithdraw: [payload: { teamId: string, requestedByUserId: string, reason?: string }]
}>()

const expandedTeamIds = ref(new Set<string>())
const expandedWithdrawTeamIds = ref(new Set<string>())
const withdrawDrafts = reactive<Record<string, {
  requestedByUserId: string
  adminWithdrawReason: string
}>>({})

const hasEnteredSubmissionPhase = computed(() =>
  isHackathonStateReached(props.hackathonState, 'submission_open')
)

const summaryCards = computed(() => [
  {
    key: 'total',
    label: 'Total teams',
    value: props.metrics.totalTeams
  },
  {
    key: 'submitted-or-later',
    label: 'Submitted or later',
    value: props.metrics.submittedOrLaterTeams
  },
  {
    key: 'draft',
    label: 'Draft',
    value: props.metrics.draftTeams
  },
  {
    key: 'none',
    label: 'No record',
    value: props.metrics.noRecordTeams
  }
])

const filterOptions = computed<Array<{
  label: string
  value: AdminSubmissionDashboardFilter
  count: number
}>>(() => {
  const options: Array<{
    label: string
    value: AdminSubmissionDashboardFilter
    count: number
  }> = [
    { label: 'All', value: 'all', count: props.metrics.totalTeams },
    { label: 'No record', value: 'none', count: props.metrics.noRecordTeams },
    { label: 'Draft', value: 'draft', count: props.metrics.draftTeams },
    { label: 'Submitted', value: 'submitted', count: props.metrics.submittedTeams }
  ]

  if (props.metrics.lockedTeams > 0 || filter.value === 'locked') {
    options.push({
      label: 'Locked',
      value: 'locked',
      count: props.metrics.lockedTeams
    })
  }

  if (props.metrics.outTeams > 0 || filter.value === 'out') {
    options.push({
      label: 'Out',
      value: 'out',
      count: props.metrics.outTeams
    })
  }

  return options
})

const hasActiveSearch = computed(() => search.value.trim().length > 0)
const hasActiveFilter = computed(() => filter.value !== 'all')
const filteredCountLabel = computed(() => {
  if (props.isLoading) {
    return 'Loading...'
  }

  if (props.errorMessage) {
    return 'Unavailable'
  }

  return `${props.teams.length} shown`
})

const emptyState = computed(() => {
  if (hasActiveSearch.value || hasActiveFilter.value) {
    return {
      title: 'No matching teams',
      description: 'Try a different search or filter.'
    }
  }

  return {
    title: 'No teams yet',
    description: 'Teams appear here once approved participants start working.'
  }
})

function isExpanded(teamId: string) {
  return expandedTeamIds.value.has(teamId)
}

function toggleExpanded(teamId: string) {
  const nextExpandedTeamIds = new Set(expandedTeamIds.value)

  if (nextExpandedTeamIds.has(teamId)) {
    nextExpandedTeamIds.delete(teamId)
  } else {
    nextExpandedTeamIds.add(teamId)
  }

  expandedTeamIds.value = nextExpandedTeamIds
}

function isWithdrawExpanded(teamId: string) {
  return expandedWithdrawTeamIds.value.has(teamId)
}

function toggleWithdrawExpanded(teamId: string) {
  const nextExpandedWithdrawTeamIds = new Set(expandedWithdrawTeamIds.value)

  if (nextExpandedWithdrawTeamIds.has(teamId)) {
    nextExpandedWithdrawTeamIds.delete(teamId)
  } else {
    nextExpandedWithdrawTeamIds.add(teamId)
  }

  expandedWithdrawTeamIds.value = nextExpandedWithdrawTeamIds
}

function hasSubmissionDetails(team: AdminOperationalTeam) {
  return Boolean(team.submission)
}

function getWithdrawDraft(team: AdminOperationalTeam) {
  const existing = withdrawDrafts[team.team.id]

  if (existing) {
    if (!existing.requestedByUserId && team.activeAdminChoices[0]) {
      existing.requestedByUserId = team.activeAdminChoices[0].userId
    }

    return existing
  }

  const next = {
    requestedByUserId: team.activeAdminChoices[0]?.userId ?? '',
    adminWithdrawReason: ''
  }

  withdrawDrafts[team.team.id] = next
  return next
}

function getWithdrawalPolicy(team: AdminOperationalTeam) {
  return getAdminSubmissionInterventionPolicy(props.hackathonState, team.submissionStatus)
}

function formatAdminNames(team: AdminOperationalTeam) {
  if (team.activeAdminChoices.length === 0) {
    return 'No active admin members'
  }

  return team.activeAdminChoices.map(choice => choice.label).join(', ')
}

function formatLastActivity(team: AdminOperationalTeam) {
  return formatTimestamp(
    team.submission?.submittedAt ?? team.submission?.updatedAt ?? team.team.updatedAt,
    'No activity yet'
  )
}

function formatMetricValue(value: number) {
  if (props.isLoading) {
    return 'Loading...'
  }

  if (props.errorMessage) {
    return 'Unavailable'
  }

  return `${value}`
}

function formatProjectLabel(team: AdminOperationalTeam) {
  if (team.submissionStatus === 'none') {
    return hasEnteredSubmissionPhase.value
      ? 'No submission record yet'
      : 'Submission window not open yet'
  }

  if (team.submissionStatus === 'draft') {
    return team.submission?.projectName ?? 'Untitled draft'
  }

  return team.submission?.projectName ?? 'Untitled project'
}

function hasExpandedTeamFooter(team: AdminOperationalTeam) {
  return isWithdrawExpanded(team.team.id) || (Boolean(team.submission) && isExpanded(team.team.id))
}
</script>

<template>
  <div class="space-y-6">
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in summaryCards"
        :key="card.key"
        class="hackathon-workspace-detail-inset rounded-xl px-5 py-5"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {{ card.label }}
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ formatMetricValue(card.value) }}
        </p>
      </div>
    </section>

    <AppAlert
      v-if="errorMessage"
      color="error"
      variant="soft"
      title="Submission records unavailable"
      :description="errorMessage"
    />

    <AppAlert
      v-else-if="isLoading"
      color="neutral"
      variant="soft"
      title="Loading submissions"
      description="Resolving team and submission records."
    />

    <template v-else>
      <AppAlert
        v-if="!hasEnteredSubmissionPhase"
        color="neutral"
        variant="soft"
        title="Submission window not open yet"
        description="Teams can already form. No record and draft are shown as current team status, not as late-state queues."
      />

      <div class="hackathon-workspace-detail-inset flex flex-col gap-4 rounded-xl p-2">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            type="button"
            class="inline-flex min-w-max grow basis-0 items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:min-w-0 sm:grow-0 sm:basis-auto sm:justify-start"
            :class="filter === option.value ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
            @click="filter = option.value"
          >
            <span>{{ option.label }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
              :class="filter === option.value ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
            >
              {{ option.count }}
            </span>
          </button>
        </div>

        <div class="px-2 pb-2">
          <label
            for="admin-submission-search"
            class="sr-only"
          >
            Search teams
          </label>
          <AppInput
            id="admin-submission-search"
            v-model="search"
            type="search"
            name="admin-submission-search"
            autocomplete="off"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            data-1p-ignore="true"
            data-lpignore="true"
            data-bwignore="true"
            placeholder="Search team, project, admin, member, email, or user ID"
          />

          <p class="mt-2 text-sm text-muted">
            {{ filteredCountLabel }}
          </p>
        </div>
      </div>

      <AppCard class="rounded-xl hackathon-workspace-detail-panel">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Teams and submissions
            </h2>
            <p class="text-sm text-muted">
              Review every team and its current submission state in one list.
            </p>
          </div>
        </template>

        <AppAlert
          v-if="teams.length === 0"
          color="neutral"
          variant="soft"
          :title="emptyState.title"
          :description="emptyState.description"
        />

        <div
          v-else
          class="divide-y divide-black/8 dark:divide-white/[0.08]"
        >
          <article
            v-for="team in teams"
            :key="team.team.id"
            :data-testid="`admin-team-${team.team.id}`"
            class="py-5 first:pt-0 last:pb-0"
          >
            <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div class="min-w-0 space-y-2">
                <div class="flex flex-wrap items-center gap-3">
                  <h4 class="text-lg font-semibold text-highlighted">
                    {{ team.team.name }}
                  </h4>

                  <AppBadge
                    :color="getSubmissionStatusColor(team.submissionStatus)"
                    variant="soft"
                  >
                    {{ formatSubmissionStatus(team.submissionStatus) }}
                  </AppBadge>
                </div>

                <p class="text-sm text-toned">
                  {{ formatProjectLabel(team) }}
                </p>

                <p class="text-sm text-toned">
                  {{ team.activeMemberCount }} active member{{ team.activeMemberCount === 1 ? '' : 's' }} •
                  Admins: {{ formatAdminNames(team) }}
                </p>
              </div>

              <div class="flex flex-col items-start gap-3 xl:items-end">
                <div class="text-sm text-toned xl:text-right">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Last activity
                  </p>
                  <p class="mt-1">
                    {{ formatLastActivity(team) }}
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <AppButton
                    v-if="getWithdrawalPolicy(team).canAdminWithdraw"
                    color="warning"
                    variant="soft"
                    size="sm"
                    :data-testid="`admin-team-withdraw-toggle-${team.team.id}`"
                    @click="toggleWithdrawExpanded(team.team.id)"
                  >
                    {{ isWithdrawExpanded(team.team.id) ? 'Hide withdraw' : 'Withdraw' }}
                  </AppButton>

                  <AppButton
                    v-if="hasSubmissionDetails(team)"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    @click="toggleExpanded(team.team.id)"
                  >
                    {{ isExpanded(team.team.id) ? 'Hide details' : 'Details' }}
                  </AppButton>
                </div>
              </div>
            </div>

            <div
              v-if="hasExpandedTeamFooter(team)"
              class="mt-4 space-y-4 border-t border-black/8 pt-4 dark:border-white/[0.08]"
            >
              <div
                v-if="isWithdrawExpanded(team.team.id)"
                :data-testid="`admin-withdraw-team-${team.team.id}`"
                class="grid gap-4 rounded-lg border border-warning/20 bg-warning/[0.04] px-4 py-4 dark:border-warning/25 dark:bg-warning/[0.08] lg:grid-cols-[0.45fr_0.55fr]"
              >
                <label class="grid gap-2">
                  <span class="text-sm font-medium text-toned">Requested by team admin</span>
                  <AppSelect
                    v-model="getWithdrawDraft(team).requestedByUserId"
                  >
                    <option
                      v-for="choice in team.activeAdminChoices"
                      :key="choice.userId"
                      :value="choice.userId"
                    >
                      {{ choice.label }}
                    </option>
                  </AppSelect>
                </label>

                <div class="space-y-4">
                  <label class="grid gap-2">
                    <span class="text-sm font-medium text-toned">Operational note</span>
                    <AppInput
                      v-model="getWithdrawDraft(team).adminWithdrawReason"
                      type="text"
                      placeholder="Requested by team due to..."
                    />
                  </label>

                  <AppAlert
                    v-if="team.activeAdminChoices.length === 0"
                    color="warning"
                    variant="soft"
                    title="Team-admin request required"
                    description="This action cannot be issued until the team detail exposes at least one active admin requester."
                  />

                  <div class="flex flex-wrap items-center gap-3">
                    <AppButton
                      color="warning"
                      :data-testid="`admin-withdraw-submit-${team.team.id}`"
                      :loading="pendingActionKey === `admin-withdraw:${team.team.id}`"
                      :disabled="team.activeAdminChoices.length === 0 || (pendingActionKey !== null && pendingActionKey !== `admin-withdraw:${team.team.id}`)"
                      @click="emit('adminWithdraw', {
                        teamId: team.team.id,
                        requestedByUserId: getWithdrawDraft(team).requestedByUserId,
                        reason: getWithdrawDraft(team).adminWithdrawReason.trim() || undefined
                      })"
                    >
                      Withdraw submission
                    </AppButton>

                    <button
                      type="button"
                      class="text-sm font-medium text-toned transition-opacity hover:opacity-80"
                      @click="toggleWithdrawExpanded(team.team.id)"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>

              <div
                v-if="team.submission && isExpanded(team.team.id)"
                class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"
              >
                <div class="space-y-2">
                  <p
                    v-if="team.submission.summary"
                    class="whitespace-pre-wrap text-sm leading-6 text-toned"
                  >
                    {{ team.submission.summary }}
                  </p>
                  <p
                    v-else
                    class="text-sm text-muted"
                  >
                    No summary
                  </p>
                </div>

                <div class="grid gap-3 text-sm">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Repository
                    </p>
                    <a
                      v-if="team.submission.repositoryUrl"
                      :href="team.submission.repositoryUrl"
                      target="_blank"
                      rel="noreferrer"
                      class="mt-1 block break-all text-primary underline-offset-4 hover:underline"
                    >
                      {{ team.submission.repositoryUrl }}
                    </a>
                    <p
                      v-else
                      class="mt-1 text-muted"
                    >
                      Not provided
                    </p>
                  </div>

                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Demo
                    </p>
                    <a
                      v-if="team.submission.demoUrl"
                      :href="team.submission.demoUrl"
                      target="_blank"
                      rel="noreferrer"
                      class="mt-1 block break-all text-primary underline-offset-4 hover:underline"
                    >
                      {{ team.submission.demoUrl }}
                    </a>
                    <p
                      v-else
                      class="mt-1 text-muted"
                    >
                      Not provided
                    </p>
                  </div>

                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Updated
                    </p>
                    <p class="mt-1 text-toned">
                      {{ formatTimestamp(team.submission.updatedAt, 'No activity yet') }}
                    </p>
                  </div>

                  <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Submitted
                    </p>
                    <p class="mt-1 text-toned">
                      {{ formatTimestamp(team.submission.submittedAt, 'Not submitted') }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </AppCard>
    </template>
  </div>
</template>
