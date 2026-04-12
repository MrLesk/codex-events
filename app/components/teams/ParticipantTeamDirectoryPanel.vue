<script setup lang="ts">
import type { TeamDirectoryEntry } from '~/utils/team-workspace'

const props = defineProps<{
  teams: TeamDirectoryEntry[]
  totalTeams?: number
  isLoadingTeams?: boolean
  teamErrorMessage?: string
  hasMoreTeams?: boolean
  isLoadingMoreTeams?: boolean
  loadMoreTeamsErrorMessage?: string
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  joinTeam: [teamId: string]
  cancelJoinRequest: [payload: {
    teamId: string
    requestId: string | null
  }]
  loadMoreTeams: []
}>()

function isActionPending(actionKey: string) {
  return props.pendingActionKey === actionKey
}
</script>

<template>
  <AppCard
    data-testid="participant-team-directory-panel"
    class="rounded-xl hackathon-workspace-detail-panel"
    :ui="{ body: 'p-5' }"
  >
    <div class="space-y-4">
      <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
        <h2 class="text-xl font-semibold text-highlighted dark:text-white">
          Other teams
        </h2>
        <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
          If you would rather join an existing team, browse the listed teams that are still open to collaborators.
        </p>
      </div>

      <AppAlert
        v-if="teamErrorMessage"
        color="error"
        variant="soft"
        title="Team directory unavailable"
        :description="teamErrorMessage"
      />

      <AppAlert
        v-else-if="isLoadingTeams"
        color="neutral"
        variant="soft"
        title="Loading visible teams"
        description="The participant team directory is still resolving visible teams for this hackathon."
      />

      <div
        v-else-if="teams.length > 0"
        class="grid gap-4"
      >
        <article
          v-for="entry in teams"
          :key="entry.team.id"
          :data-testid="`participant-team-card-${entry.team.id}`"
          class="app-inset-card px-5 py-5"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0 flex-1 space-y-2">
              <div class="flex flex-wrap items-center gap-3">
                <h3 class="text-lg font-semibold text-highlighted">
                  {{ entry.team.name }}
                </h3>

                <AppBadge
                  :color="entry.team.isOpenToJoinRequests ? 'success' : 'neutral'"
                  variant="soft"
                >
                  {{ entry.team.isOpenToJoinRequests ? 'Open to join requests' : 'Closed to join requests' }}
                </AppBadge>

                <AppBadge
                  v-if="entry.isOwnTeam"
                  color="primary"
                  variant="soft"
                >
                  Your team
                </AppBadge>
              </div>

              <p class="text-sm text-toned">
                {{ entry.team.activeMemberCount ?? 0 }} active member{{ (entry.team.activeMemberCount ?? 0) === 1 ? '' : 's' }}
              </p>

              <p
                v-if="entry.team.bio"
                class="max-w-3xl whitespace-pre-line text-sm text-muted"
              >
                {{ entry.team.bio }}
              </p>

              <p
                v-if="!entry.joinAvailability.isAllowed && entry.joinAvailability.reason"
                class="text-sm text-muted"
              >
                {{ entry.joinAvailability.reason }}
              </p>
            </div>

            <div class="grid gap-3 shrink-0 sm:min-w-48">
              <AppButton
                v-if="entry.detailHref?.trim()"
                :to="entry.detailHref"
                color="neutral"
              >
                View team
              </AppButton>

              <AppButton
                v-if="entry.hasPendingJoinRequest"
                color="warning"
                variant="soft"
                :loading="isActionPending(`cancel-join-request:${entry.pendingJoinRequestId}`)"
                :disabled="isActionPending(`cancel-join-request:${entry.pendingJoinRequestId}`)"
                :data-testid="`participant-team-cancel-join-${entry.team.id}`"
                @click="emit('cancelJoinRequest', {
                  teamId: entry.team.id,
                  requestId: entry.pendingJoinRequestId
                })"
              >
                Cancel pending request
              </AppButton>

              <AppButton
                v-else
                color="primary"
                :loading="isActionPending(`join-team:${entry.team.id}`)"
                :disabled="!entry.joinAvailability.isAllowed || isActionPending(`join-team:${entry.team.id}`)"
                :data-testid="`participant-team-join-${entry.team.id}`"
                @click="emit('joinTeam', entry.team.id)"
              >
                Request to join
              </AppButton>
            </div>
          </div>
        </article>
      </div>

      <AppAlert
        v-else
        color="neutral"
        variant="soft"
        title="No visible teams yet"
        description="No other teams are listed for collaboration yet."
      />

      <div
        v-if="!teamErrorMessage && !isLoadingTeams && teams.length > 0"
        class="flex flex-col items-start gap-3"
      >
        <AppButton
          v-if="hasMoreTeams"
          color="neutral"
          variant="outline"
          :loading="isLoadingMoreTeams"
          data-testid="participant-team-load-more"
          @click="emit('loadMoreTeams')"
        >
          Load more teams
        </AppButton>

        <AppAlert
          v-if="loadMoreTeamsErrorMessage"
          color="error"
          variant="soft"
          title="Unable to load more teams"
          :description="loadMoreTeamsErrorMessage"
        />

        <p class="text-sm text-muted">
          Showing {{ teams.length }} of {{ totalTeams ?? teams.length }} visible teams.
        </p>
      </div>
    </div>
  </AppCard>
</template>
