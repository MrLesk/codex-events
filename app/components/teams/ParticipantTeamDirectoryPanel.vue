<script setup lang="ts">
import type {
  TeamActionAvailability,
  TeamDetailRecord,
  TeamDirectoryEntry
} from '~/utils/team-workspace'

import { teamDirectoryCreateFormSchema } from '~/utils/form-schemas'
import { cloneFormValues } from '~/utils/form-values'
import { createTeamSlug } from '~/utils/team-workspace'

const form = defineModel<{
  name: string
  slug: string
  isOpenToJoinRequests: boolean
}>('form', {
  required: true
})

const props = defineProps<{
  currentTeam?: TeamDetailRecord | null
  currentTeamHref?: string | null
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

const errors = reactive({
  name: '',
  slug: ''
})
const submitCount = ref(0)

const hasManuallyEditedSlug = ref(false)

watch(() => form.value.name, (nextName) => {
  if (hasManuallyEditedSlug.value) {
    return
  }

  const nextSlug = createTeamSlug(nextName)

  if (form.value.slug !== nextSlug) {
    form.value.slug = nextSlug
  }
})

watch(() => form.value.slug, (nextSlug) => {
  hasManuallyEditedSlug.value = nextSlug.length > 0
    && nextSlug !== createTeamSlug(form.value.name)
})

function validateCreateForm() {
  errors.name = ''
  errors.slug = ''

  const result = teamDirectoryCreateFormSchema.safeParse(cloneFormValues(form.value))

  if (result.success) {
    return true
  }

  const fieldErrors = result.error.flatten().fieldErrors
  errors.name = fieldErrors.name?.[0] ?? ''
  errors.slug = fieldErrors.slug?.[0] ?? ''
  return false
}

function submitCreateForm() {
  submitCount.value += 1

  if (!validateCreateForm()) {
    return
  }

  emit('submitCreate')
}
</script>

<template>
  <div class="space-y-6">
    <AppCard
      v-if="currentTeam"
      class="rounded-xl hackathon-workspace-detail-panel p-6"
    >
      <template #header>
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-highlighted dark:text-white">
            Current team
          </h2>
          <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
            You already belong to a team in this hackathon. Team updates and join-request review now happen in this Team tab.
          </p>
        </div>
      </template>

      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-3">
            <h3 class="text-2xl font-semibold text-highlighted dark:text-white">
              {{ currentTeam.name }}
            </h3>
            <AppBadge
              color="success"
              variant="soft"
              class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
            >
              {{ currentTeam.activeMemberCount ?? currentTeam.members.length }} active member{{ (currentTeam.activeMemberCount ?? currentTeam.members.length) === 1 ? '' : 's' }}
            </AppBadge>
          </div>
          <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
            Team slug: {{ currentTeam.slug }}.
          </p>
        </div>

        <AppButton
          v-if="currentTeamHref?.trim()"
          :to="currentTeamHref"
          color="primary"
          icon="i-lucide-arrow-right"
        >
          Open team workspace
        </AppButton>
      </div>
    </AppCard>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <AppCard class="rounded-xl hackathon-workspace-detail-panel p-6">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-xl font-semibold text-highlighted dark:text-white">
              Create a team
            </h2>
            <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
              Start a new team here when your application and the hackathon lifecycle allow it.
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <AppAlert
            v-if="!canCreateTeam.isAllowed"
            color="warning"
            variant="soft"
            title="Team creation unavailable"
            :description="canCreateTeam.reason"
          />

          <form
            class="space-y-4"
            @submit.prevent="submitCreateForm"
          >
            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Team name</span>
              <input
                v-model="form.name"
                type="text"
                class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none disabled:cursor-not-allowed disabled:opacity-60"
                :class="submitCount > 0 && errors.name ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
                placeholder="North Star Builders"
                :disabled="isCreatingTeam || !canCreateTeam.isAllowed"
              >
              <p
                v-if="submitCount > 0 && errors.name"
                class="text-xs text-error"
              >
                {{ errors.name }}
              </p>
            </label>

            <label class="grid gap-2">
              <span class="text-sm font-medium text-toned">Team slug</span>
              <input
                v-model="form.slug"
                type="text"
                class="app-inset-field px-4 py-3 text-sm text-highlighted outline-none disabled:cursor-not-allowed disabled:opacity-60"
                :class="submitCount > 0 && errors.slug ? 'border-error/45 focus:border-error dark:border-error/50' : 'focus:border-primary'"
                placeholder="north-star-builders"
                :disabled="isCreatingTeam || !canCreateTeam.isAllowed"
              >
              <p
                v-if="submitCount > 0 && errors.slug"
                class="text-xs text-error"
              >
                {{ errors.slug }}
              </p>
            </label>

            <label class="flex items-center gap-3 app-inset-choice px-4 py-3 text-sm text-toned">
              <input
                v-model="form.isOpenToJoinRequests"
                type="checkbox"
                class="size-4 rounded border-default"
                :disabled="isCreatingTeam || !canCreateTeam.isAllowed"
              >
              Open this team to join requests immediately
            </label>

            <AppButton
              type="button"
              color="primary"
              :loading="isCreatingTeam"
              :disabled="isCreatingTeam || !canCreateTeam.isAllowed"
              data-testid="participant-team-create-submit"
              @click="submitCreateForm"
            >
              Create team
            </AppButton>
          </form>
        </div>
      </AppCard>

      <AppCard
        data-testid="participant-team-directory-panel"
        class="rounded-xl hackathon-workspace-detail-panel p-6"
      >
        <template #header>
          <div class="space-y-1">
            <h2 class="text-xl font-semibold text-highlighted dark:text-white">
              Join a team
            </h2>
            <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
              Browse visible teams and request to join the ones that are still open.
            </p>
          </div>
        </template>

        <div class="space-y-4">
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
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="space-y-2">
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
                  <AppButton
                    v-if="entry.detailHref?.trim()"
                    :to="entry.detailHref"
                    color="neutral"
                    variant="outline"
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
            description="Create a new team above or wait for another approved participant to open a team for collaboration."
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
    </div>
  </div>
</template>
