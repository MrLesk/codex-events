<script setup lang="ts">
import type {
  TeamActionAvailability,
  TeamDetailRecord,
  TeamDirectoryEntry
} from '~/utils/team-workspace'

const form = defineModel<{
  name: string
  slug: string
  isOpenToJoinRequests: boolean
}>('form', {
  required: true
})

const props = defineProps<{
  currentTeam?: TeamDetailRecord | null
  currentTeamHref?: string
  teams: TeamDirectoryEntry[]
  totalTeams?: number
  canCreateTeam: TeamActionAvailability
  isCreatingTeam?: boolean
  isLoadingTeams?: boolean
  teamErrorMessage?: string
  hasMoreTeams?: boolean
  isLoadingMoreTeams?: boolean
  loadMoreTeamsErrorMessage?: string
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  submitCreate: []
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
  <div class="space-y-6">
    <UCard
      v-if="currentTeam"
      class="border border-success/30 bg-success/5"
    >
      <template #header>
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-highlighted">
            Current Team
          </h2>
          <p class="text-sm text-muted">
            You already belong to an active team in this hackathon. Team updates and join-request review happen inside the dedicated team workspace.
          </p>
        </div>
      </template>

      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-3">
            <h3 class="text-xl font-semibold text-highlighted">
              {{ currentTeam.name }}
            </h3>
            <UBadge
              color="success"
              variant="soft"
            >
              {{ currentTeam.activeMemberCount ?? currentTeam.members.length }} active member{{ (currentTeam.activeMemberCount ?? currentTeam.members.length) === 1 ? '' : 's' }}
            </UBadge>
          </div>
          <p class="text-sm text-toned">
            Team slug: {{ currentTeam.slug }}.
          </p>
        </div>

        <UButton
          v-if="currentTeamHref"
          :to="currentTeamHref"
          color="primary"
          icon="i-lucide-arrow-right"
        >
          Open team workspace
        </UButton>
      </div>
    </UCard>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <UCard class="border border-default/70 bg-elevated/90">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Create Team
            </h2>
            <p class="text-sm text-muted">
              Team creation follows the canonical approval and lifecycle rules for the current hackathon.
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UAlert
            v-if="!canCreateTeam.isAllowed"
            color="warning"
            variant="soft"
            title="Team creation unavailable"
            :description="canCreateTeam.reason"
          />

          <form
            class="space-y-4"
            @submit.prevent="emit('submitCreate')"
          >
            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Team name</span>
              <input
                v-model="form.name"
                type="text"
                class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="North Star Builders"
                :disabled="isCreatingTeam || !canCreateTeam.isAllowed"
                required
              >
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Team slug</span>
              <input
                v-model="form.slug"
                type="text"
                class="rounded-2xl border border-default bg-default px-4 py-3 text-sm text-highlighted outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="north-star-builders"
                :disabled="isCreatingTeam || !canCreateTeam.isAllowed"
                required
              >
            </label>

            <label class="flex items-center gap-3 rounded-2xl border border-default bg-default px-4 py-3 text-sm text-toned">
              <input
                v-model="form.isOpenToJoinRequests"
                type="checkbox"
                class="size-4 rounded border-default"
                :disabled="isCreatingTeam || !canCreateTeam.isAllowed"
              >
              Open this team to join requests immediately
            </label>

            <UButton
              type="submit"
              color="primary"
              :loading="isCreatingTeam"
              :disabled="isCreatingTeam || !canCreateTeam.isAllowed"
              data-testid="participant-team-create-submit"
            >
              Create team
            </UButton>
          </form>
        </div>
      </UCard>

      <UCard
        data-testid="participant-team-directory-panel"
        class="border border-default/70 bg-elevated/90"
      >
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-highlighted">
              Team Directory
            </h2>
            <p class="text-sm text-muted">
              Approved participants can browse visible teams and request to join the teams that remain open.
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UAlert
            v-if="teamErrorMessage"
            color="error"
            variant="soft"
            title="Team directory unavailable"
            :description="teamErrorMessage"
          />

          <UAlert
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
              class="rounded-[1.5rem] border border-default bg-default px-5 py-5"
            >
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="space-y-2">
                  <div class="flex flex-wrap items-center gap-3">
                    <h3 class="text-lg font-semibold text-highlighted">
                      {{ entry.team.name }}
                    </h3>

                    <UBadge
                      :color="entry.team.isOpenToJoinRequests ? 'success' : 'neutral'"
                      variant="soft"
                    >
                      {{ entry.team.isOpenToJoinRequests ? 'Open to join requests' : 'Closed to join requests' }}
                    </UBadge>

                    <UBadge
                      v-if="entry.isOwnTeam"
                      color="primary"
                      variant="soft"
                    >
                      Your team
                    </UBadge>
                  </div>

                  <p class="text-sm text-toned">
                    {{ entry.team.activeMemberCount ?? 0 }} active member{{ (entry.team.activeMemberCount ?? 0) === 1 ? '' : 's' }} • Slug {{ entry.team.slug }}
                  </p>

                  <p
                    v-if="!entry.joinAvailability.isAllowed && entry.joinAvailability.reason"
                    class="text-sm text-muted"
                  >
                    {{ entry.joinAvailability.reason }}
                  </p>
                </div>

                <div class="flex flex-wrap gap-3">
                  <UButton
                    :to="entry.detailHref"
                    color="neutral"
                    variant="outline"
                  >
                    View team
                  </UButton>

                  <UButton
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
                  </UButton>

                  <UButton
                    v-else
                    color="primary"
                    :loading="isActionPending(`join-team:${entry.team.id}`)"
                    :disabled="!entry.joinAvailability.isAllowed || isActionPending(`join-team:${entry.team.id}`)"
                    :data-testid="`participant-team-join-${entry.team.id}`"
                    @click="emit('joinTeam', entry.team.id)"
                  >
                    Request to join
                  </UButton>
                </div>
              </div>
            </article>
          </div>

          <UAlert
            v-else
            color="neutral"
            variant="soft"
            title="No visible teams yet"
            description="Create a new team above or wait for another approved participant to open a team for collaboration."
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
              data-testid="participant-team-load-more"
              @click="emit('loadMoreTeams')"
            >
              Load more teams
            </UButton>

            <UAlert
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
      </UCard>
    </div>
  </div>
</template>
