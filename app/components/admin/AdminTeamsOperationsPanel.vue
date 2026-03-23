<script setup lang="ts">
import type { AdminOperationalTeam } from '~/utils/admin-workspace'

import {
  formatSubmissionStatus,
  getSubmissionStatusColor
} from '~/utils/admin-workspace'

const props = defineProps<{
  teams: AdminOperationalTeam[]
  totalTeams?: number
  isLoadingTeams?: boolean
  teamErrorMessage?: string
  isLoadingNoSubmission?: boolean
  noSubmissionErrorMessage?: string
  hasMoreTeams?: boolean
  isLoadingMoreTeams?: boolean
  loadMoreTeamsErrorMessage?: string
}>()

const emit = defineEmits<{
  loadMoreTeams: []
}>()

const noSubmissionTeams = computed(() =>
  props.teams.filter(team => team.isInNoSubmissionSection)
)
const activeCompetitionTeams = computed(() =>
  props.teams.filter(team => team.submissionStatus === 'submitted' || team.submissionStatus === 'locked')
)

function formatAdminNames(team: AdminOperationalTeam) {
  if (team.activeAdminChoices.length === 0) {
    return 'No active admin members found'
  }

  return team.activeAdminChoices.map(choice => choice.label).join(', ')
}
</script>

<template>
  <UCard class="border border-default/70 bg-elevated/90">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Teams And Submission Monitor
        </h2>
        <p class="text-sm text-muted">
          Monitor team formation, submission state, and the computed no-submission section from the admin workspace only.
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <div
        v-if="!teamErrorMessage && !isLoadingTeams"
        class="grid gap-4 md:grid-cols-3"
      >
        <div class="rounded-2xl border border-default bg-default px-4 py-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Total teams
          </p>
          <p class="mt-2 text-2xl font-semibold text-highlighted">
            {{ totalTeams ?? teams.length }}
          </p>
        </div>

        <div class="rounded-2xl border border-default bg-default px-4 py-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            In competition
          </p>
          <p class="mt-2 text-2xl font-semibold text-highlighted">
            {{ activeCompetitionTeams.length }}
          </p>
        </div>

        <div class="rounded-2xl border border-default bg-default px-4 py-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            No-submission section
          </p>
          <p class="mt-2 text-2xl font-semibold text-highlighted">
            {{ noSubmissionTeams.length }}
          </p>
        </div>
      </div>

      <section class="space-y-3">
        <div class="space-y-1">
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            Computed no-submission section
          </h3>
          <p class="text-sm text-toned">
            Draft, withdrawn, disqualified, and missing submission records stay visible here as the canonical operational section.
          </p>
        </div>

        <UAlert
          v-if="noSubmissionErrorMessage"
          color="error"
          variant="soft"
          title="No-submission view unavailable"
          :description="noSubmissionErrorMessage"
        />

        <UAlert
          v-else-if="isLoadingNoSubmission"
          color="neutral"
          variant="soft"
          title="Loading no-submission section"
          description="The derived no-submission view is still loading."
        />

        <div
          v-else-if="noSubmissionTeams.length > 0"
          class="grid gap-3"
        >
          <article
            v-for="team in noSubmissionTeams"
            :key="`${team.team.id}-no-submission`"
            :data-testid="`admin-no-submission-${team.team.id}`"
            class="rounded-2xl border border-default bg-default px-4 py-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 class="font-semibold text-highlighted">
                  {{ team.team.name }}
                </h4>
                <p class="mt-1 text-sm text-toned">
                  {{ team.activeMemberCount }} active member{{ team.activeMemberCount === 1 ? '' : 's' }} • Admins: {{ formatAdminNames(team) }}
                </p>
              </div>

              <UBadge
                :color="getSubmissionStatusColor(team.noSubmissionReason)"
                variant="soft"
              >
                {{ formatSubmissionStatus(team.noSubmissionReason) }}
              </UBadge>
            </div>
          </article>
        </div>

        <UAlert
          v-else
          color="success"
          variant="soft"
          title="No missing submissions"
          description="Every visible team currently has a submitted or locked project in competition."
        />
      </section>

      <section class="space-y-3">
        <div class="space-y-1">
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            Team monitor
          </h3>
          <p class="text-sm text-toned">
            Team rows show current join openness, active admin coverage, and the latest visible submission record for admin review.
          </p>
        </div>

        <UAlert
          v-if="teamErrorMessage"
          color="error"
          variant="soft"
          title="Team monitor unavailable"
          :description="teamErrorMessage"
        />

        <UAlert
          v-else-if="isLoadingTeams"
          color="neutral"
          variant="soft"
          title="Loading teams"
          description="Team and submission operational records are still loading."
        />

        <div
          v-else-if="teams.length > 0"
          class="grid gap-4"
        >
          <article
            v-for="team in teams"
            :key="team.team.id"
            :data-testid="`admin-team-${team.team.id}`"
            class="rounded-[1.5rem] border border-default bg-default px-5 py-5"
          >
            <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div class="space-y-2">
                <div class="flex flex-wrap items-center gap-3">
                  <h4 class="text-lg font-semibold text-highlighted">
                    {{ team.team.name }}
                  </h4>
                  <UBadge
                    :color="getSubmissionStatusColor(team.submissionStatus)"
                    variant="soft"
                  >
                    {{ formatSubmissionStatus(team.submissionStatus) }}
                  </UBadge>
                </div>
                <p class="text-sm text-toned">
                  {{ team.activeMemberCount }} active member{{ team.activeMemberCount === 1 ? '' : 's' }} •
                  {{ team.team.isOpenToJoinRequests ? 'Open to join requests' : 'Closed to join requests' }}
                </p>
                <p class="text-sm text-toned">
                  Admins: {{ formatAdminNames(team) }}
                </p>
              </div>

              <div class="grid gap-3 text-sm text-toned sm:grid-cols-2 xl:min-w-[24rem]">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Project
                  </p>
                  <p class="mt-1">
                    {{ team.submission?.projectName ?? 'No project title yet' }}
                  </p>
                </div>

                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Last submission event
                  </p>
                  <p class="mt-1">
                    {{ team.submission?.submittedAt ?? team.submission?.updatedAt ?? 'No submission record' }}
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>

        <UAlert
          v-else
          color="neutral"
          variant="soft"
          title="No teams yet"
          description="Team monitoring becomes active once approved users create or join teams."
        />

        <div
          v-if="!teamErrorMessage && !isLoadingTeams && teams.length > 0"
          class="flex flex-col items-start gap-3"
        >
          <UButton
            v-if="hasMoreTeams"
            color="neutral"
            variant="outline"
            :loading="isLoadingMoreTeams"
            data-testid="admin-operations-load-more-teams"
            @click="emit('loadMoreTeams')"
          >
            Load more teams
          </UButton>

          <p class="text-sm text-muted">
            Showing {{ teams.length }} of {{ totalTeams ?? teams.length }} teams.
          </p>
        </div>

        <UAlert
          v-if="loadMoreTeamsErrorMessage"
          color="warning"
          variant="soft"
          title="More teams unavailable"
          :description="loadMoreTeamsErrorMessage"
        />
      </section>
    </div>
  </UCard>
</template>
