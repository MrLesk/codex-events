<script setup lang="ts">
import {
  formatJoinAvailabilityReason,
  type TeamDirectoryEntry
} from '~/utils/team-workspace'

const directoryFilter = defineModel<string>('directoryFilter', {
  required: false,
  default: 'all'
})

const props = defineProps<{
  teams: TeamDirectoryEntry[]
  maxTeamMembers: number
  totalTeams?: number
  showLockedStatus?: boolean
  filterOptions?: ReadonlyArray<{
    label: string
    value: string
    count?: number
  }>
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

function selectDirectoryFilter(nextFilter: string) {
  if (directoryFilter.value === nextFilter) {
    return
  }

  directoryFilter.value = nextFilter
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
          Teams
        </h2>
        <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
          Browse the active teams in this hackathon and filter the directory by team shape or joinability.
        </p>
      </div>

      <div
        v-if="filterOptions?.length"
        class="app-surface-panel flex flex-col gap-4 rounded-xl p-2"
      >
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            type="button"
            class="inline-flex min-w-max grow basis-0 items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:min-w-0 sm:grow-0 sm:basis-auto sm:justify-start"
            :class="directoryFilter === option.value ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
            @click="selectDirectoryFilter(option.value)"
          >
            <span>{{ option.label }}</span>
            <span
              v-if="typeof option.count === 'number'"
              class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
              :class="directoryFilter === option.value ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
            >
              {{ option.count }}
            </span>
          </button>
        </div>
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
                  v-if="props.showLockedStatus || entry.team.workspaceMode !== 'solo'"
                  :color="props.showLockedStatus ? 'neutral' : entry.team.isOpenToJoinRequests ? 'success' : 'neutral'"
                  variant="outline"
                  :class="props.showLockedStatus || !entry.team.isOpenToJoinRequests ? 'border-black/16 bg-white/75 text-neutral-700 dark:border-white/[0.18] dark:bg-white/[0.03] dark:text-[#D0D0D0]' : ''"
                >
                  {{ props.showLockedStatus ? 'Locked' : entry.team.isOpenToJoinRequests ? 'Open to join requests' : 'Closed to join requests' }}
                </AppBadge>

                <AppBadge
                  v-if="entry.team.workspaceMode === 'solo'"
                  color="warning"
                  variant="soft"
                >
                  Solo Team
                </AppBadge>

                <AppBadge
                  v-if="entry.isOwnTeam"
                  color="primary"
                  :variant="entry.team.workspaceMode === 'solo' ? 'outline' : 'soft'"
                >
                  Your team
                </AppBadge>

                <AppBadge
                  v-if="entry.isFull"
                  color="neutral"
                  variant="soft"
                >
                  Full
                </AppBadge>
              </div>

              <p
                v-if="entry.team.workspaceMode !== 'solo'"
                class="text-sm text-toned"
              >
                {{ entry.team.activeMemberCount ?? 0 }}/{{ props.maxTeamMembers }} members
              </p>

              <p
                v-if="entry.team.bio"
                class="max-w-3xl whitespace-pre-line text-sm text-muted"
              >
                {{ entry.team.bio }}
              </p>

              <p
                v-if="!entry.joinAvailability.isAllowed && formatJoinAvailabilityReason(entry.team, entry.joinAvailability)"
                class="text-sm text-muted"
              >
                {{ formatJoinAvailabilityReason(entry.team, entry.joinAvailability) }}
              </p>
            </div>

            <div class="flex shrink-0 flex-col items-start gap-3 sm:items-end">
              <AppButton
                v-if="entry.detailHref?.trim() && !entry.isOwnTeam"
                :to="entry.detailHref"
                color="neutral"
                class="rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 dark:border-white dark:bg-white dark:text-black dark:hover:bg-[#ECECEC] dark:hover:text-black"
                trailing-icon="i-lucide-arrow-up-right"
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
                v-else-if="entry.joinAvailability.isAllowed"
                color="success"
                icon="i-lucide-user-plus"
                :loading="isActionPending(`join-team:${entry.team.id}`)"
                :disabled="isActionPending(`join-team:${entry.team.id}`)"
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
        description="No active teams match the current filter yet."
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
