<script setup lang="ts">
import type {
  AdminOperationalTeam,
  AdminSubmissionDashboardFilter,
  AdminSubmissionDashboardMetrics
} from '~/utils/admin-workspace'

import { formatTimestamp } from '~/utils/date-formatting'
import {
  formatSubmissionStatus,
  getSubmissionStatusColor
} from '~/utils/admin-workspace'

const search = defineModel<string>('search', {
  required: true
})

const filter = defineModel<AdminSubmissionDashboardFilter>('filter', {
  required: true
})

const props = defineProps<{
  teams: AdminOperationalTeam[]
  lateTeams: AdminOperationalTeam[]
  metrics: AdminSubmissionDashboardMetrics
  isLoading?: boolean
  errorMessage?: string
}>()

const expandedTeamIds = ref(new Set<string>())
const filterOptions: Array<{ label: string, value: AdminSubmissionDashboardFilter }> = [
  { label: 'All teams', value: 'all' },
  { label: 'Late', value: 'late' },
  { label: 'Ready', value: 'ready' },
  { label: 'No submission', value: 'none' },
  { label: 'Draft only', value: 'draft' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Locked', value: 'locked' },
  { label: 'Out', value: 'out' },
  { label: 'Withdrawn', value: 'withdrawn' },
  { label: 'Disqualified', value: 'disqualified' }
]

const summaryCards = computed(() => [
  {
    key: 'total',
    label: 'Total teams',
    value: props.metrics.totalTeams
  },
  {
    key: 'ready',
    label: 'Ready',
    value: props.metrics.readyTeams
  },
  {
    key: 'draft',
    label: 'Draft only',
    value: props.metrics.draftTeams
  },
  {
    key: 'none',
    label: 'No record',
    value: props.metrics.noSubmissionTeams
  }
])

const noSubmissionTeams = computed(() =>
  props.lateTeams.filter(team => team.submissionStatus === 'none')
)

const draftTeams = computed(() =>
  props.lateTeams.filter(team => team.submissionStatus === 'draft')
)

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

function hasSubmissionDetails(team: AdminOperationalTeam) {
  return Boolean(team.submission)
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
      <div class="hackathon-workspace-detail-inset flex flex-col gap-3 rounded-xl px-4 py-4">
        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem]">
          <div class="space-y-1">
            <label
              for="admin-submission-search"
              class="sr-only"
            >
              Search submissions
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
          </div>

          <div class="space-y-1">
            <label
              for="admin-submission-filter"
              class="sr-only"
            >
              Filter submissions
            </label>
            <AppSelect
              id="admin-submission-filter"
              v-model="filter"
            >
              <option
                v-for="option in filterOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </AppSelect>
          </div>
        </div>

        <p class="text-sm text-muted">
          {{ filteredCountLabel }}
        </p>
      </div>

      <AppCard
        v-if="lateTeams.length > 0"
        class="rounded-xl hackathon-workspace-detail-panel"
      >
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold text-highlighted">
              Late Teams
            </h2>
            <AppBadge
              color="warning"
              variant="soft"
            >
              {{ lateTeams.length }}
            </AppBadge>
          </div>
        </template>

        <div class="space-y-5">
          <section class="space-y-4">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                No submission
              </h3>
              <span class="text-sm text-muted">
                {{ noSubmissionTeams.length }}
              </span>
            </div>

            <div
              v-if="noSubmissionTeams.length > 0"
              class="divide-y divide-black/8 dark:divide-white/[0.08]"
            >
              <article
                v-for="team in noSubmissionTeams"
                :key="`${team.team.id}-no-submission`"
                :data-testid="`admin-no-submission-${team.team.id}`"
                class="py-4 first:pt-0 last:pb-0"
              >
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="min-w-0 space-y-1">
                    <div class="flex flex-wrap items-center gap-3">
                      <h4 class="text-base font-semibold text-highlighted">
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
                      {{ team.activeMemberCount }} active member{{ team.activeMemberCount === 1 ? '' : 's' }}
                    </p>
                    <p class="text-sm text-toned">
                      Admins: {{ formatAdminNames(team) }}
                    </p>
                  </div>

                  <div class="text-sm text-toned lg:text-right">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Last activity
                    </p>
                    <p class="mt-1">
                      {{ formatLastActivity(team) }}
                    </p>
                  </div>
                </div>
              </article>
            </div>

            <p
              v-else
              class="text-sm text-muted"
            >
              None
            </p>
          </section>

          <section class="space-y-4 border-t border-black/8 pt-5 dark:border-white/[0.08]">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                Draft only
              </h3>
              <span class="text-sm text-muted">
                {{ draftTeams.length }}
              </span>
            </div>

            <div
              v-if="draftTeams.length > 0"
              class="divide-y divide-black/8 dark:divide-white/[0.08]"
            >
              <article
                v-for="team in draftTeams"
                :key="`${team.team.id}-draft-only`"
                class="py-4 first:pt-0 last:pb-0"
              >
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="min-w-0 space-y-1">
                    <div class="flex flex-wrap items-center gap-3">
                      <h4 class="text-base font-semibold text-highlighted">
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
                      {{ team.submission?.projectName ?? 'Untitled draft' }}
                    </p>
                    <p class="text-sm text-toned">
                      Admins: {{ formatAdminNames(team) }}
                    </p>
                  </div>

                  <div class="text-sm text-toned lg:text-right">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Last activity
                    </p>
                    <p class="mt-1">
                      {{ formatLastActivity(team) }}
                    </p>
                  </div>
                </div>
              </article>
            </div>

            <p
              v-else
              class="text-sm text-muted"
            >
              None
            </p>
          </section>
        </div>
      </AppCard>

      <AppCard class="rounded-xl hackathon-workspace-detail-panel">
        <template #header>
          <h2 class="text-lg font-semibold text-highlighted">
            Submissions
          </h2>
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
                  {{ team.submission?.projectName ?? 'No project yet' }}
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

            <div
              v-if="team.submission && isExpanded(team.team.id)"
              class="mt-4 grid gap-4 border-t border-black/8 pt-4 dark:border-white/[0.08] lg:grid-cols-[minmax(0,1fr)_20rem]"
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
                    {{ formatTimestamp(team.submission.updatedAt, 'Unknown') }}
                  </p>
                </div>

                <div v-if="team.submission.submittedAt">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Submitted
                  </p>
                  <p class="mt-1 text-toned">
                    {{ formatTimestamp(team.submission.submittedAt, 'Not submitted') }}
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </AppCard>
    </template>
  </div>
</template>
