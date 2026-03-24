<script setup lang="ts">
import type {
  PublicApiDataResponse,
  PublicHackathon
} from '~/composables/useHackathonPresentation'
import type { TeamDirectoryEntry } from '~/utils/team-workspace'

import { requireAuthNavigationGuard } from '~/utils/auth-guards'
import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'
import ParticipantTeamDirectoryPanel from '~/components/teams/ParticipantTeamDirectoryPanel.vue'
import {
  createTeamSlug,
  getCreateTeamAvailability,
  getJoinTeamAvailability,
  getTeamFormationAvailability
} from '~/utils/team-workspace'

definePageMeta({
  middleware: [requireAuthNavigationGuard]
})

const route = useRoute()
const toast = useToast()
const slug = computed(() => String(route.params.slug ?? '').trim())

if (!slug.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const {
  data: hackathonResponse,
  error: hackathonError
} = await useFetch<PublicApiDataResponse<PublicHackathon>>(() => `/api/public/hackathons/${slug.value}`, {
  key: () => `public-hackathon-team-directory:${slug.value}`
})

if (hackathonError.value) {
  throw createError({
    statusCode: hackathonError.value.statusCode ?? hackathonError.value.status ?? 500,
    statusMessage: hackathonError.value.statusMessage ?? 'Unable to load the requested hackathon.'
  })
}

if (!hackathonResponse.value?.data) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Hackathon not found.'
  })
}

const hackathon = computed(() => hackathonResponse.value!.data)
const workspace = useTeamFormationWorkspace(hackathon, slug)
const createForm = reactive({
  name: '',
  slug: '',
  isOpenToJoinRequests: true
})
const hasManuallyEditedSlug = ref(false)

watch(() => createForm.name, (value) => {
  if (!hasManuallyEditedSlug.value) {
    createForm.slug = createTeamSlug(value)
  }
})

watch(() => createForm.slug, (value) => {
  hasManuallyEditedSlug.value = value.length > 0 && value !== createTeamSlug(createForm.name)
})

const actor = computed(() => workspace.actor.value)
const ownApplicationStatus = computed(() => workspace.ownApplication.value?.status ?? null)
const currentTeamHref = computed(() =>
  workspace.ownTeam.value ? `/hackathons/${slug.value}/teams/${workspace.ownTeam.value.id}` : ''
)
const teamFormationAvailability = computed(() =>
  getTeamFormationAvailability(hackathon.value, ownApplicationStatus.value, Boolean(workspace.ownTeam.value))
)
const createTeamAvailability = computed(() =>
  getCreateTeamAvailability(hackathon.value, ownApplicationStatus.value, Boolean(workspace.ownTeam.value))
)
const isWorkspaceLoading = computed(() => {
  if (workspace.actorStatus.value === 'idle' || workspace.actorStatus.value === 'pending' || !actor.value) {
    return true
  }

  if (actor.value.kind !== 'platform_user') {
    return false
  }

  return workspace.visibleHackathonStatus.value === 'idle'
    || workspace.visibleHackathonStatus.value === 'pending'
    || workspace.ownApplicationStatus.value === 'idle'
    || workspace.ownApplicationStatus.value === 'pending'
})

const directoryEntries = computed<TeamDirectoryEntry[]>(() => {
  const ownTeamId = workspace.ownTeam.value?.id ?? null

  return workspace.visibleTeams.value
    .filter(team => team.id !== ownTeamId)
    .map((team) => {
      const pendingJoinRequestId = workspace.getRememberedPendingJoinRequestId(team.id)

      return {
        team,
        detailHref: `/hackathons/${slug.value}/teams/${team.id}`,
        isOwnTeam: team.id === ownTeamId,
        hasPendingJoinRequest: Boolean(pendingJoinRequestId),
        pendingJoinRequestId,
        joinAvailability: getJoinTeamAvailability(hackathon.value, team, {
          applicationStatus: ownApplicationStatus.value,
          hasTeamMembership: Boolean(workspace.ownTeam.value),
          activeMemberCount: team.activeMemberCount ?? 0,
          hasPendingJoinRequest: Boolean(pendingJoinRequestId),
          isOwnTeam: team.id === ownTeamId
        })
      }
    })
})

function resetCreateForm() {
  createForm.name = ''
  createForm.slug = ''
  createForm.isOpenToJoinRequests = true
  hasManuallyEditedSlug.value = false
}

async function submitCreateTeam() {
  const createdTeam = await workspace.createTeam({
    name: createForm.name,
    slug: createForm.slug,
    isOpenToJoinRequests: createForm.isOpenToJoinRequests
  })

  if (!createdTeam) {
    return
  }

  toast.add({
    title: 'Team created',
    description: 'Your new team workspace is ready.',
    color: 'success'
  })
  resetCreateForm()
  await navigateTo(`/hackathons/${slug.value}/teams/${createdTeam.id}`)
}

async function requestToJoinTeam(teamId: string) {
  const joinRequest = await workspace.requestToJoinTeam(teamId)

  if (!joinRequest) {
    return
  }

  toast.add({
    title: 'Join request submitted',
    description: 'The team admins can now review your request.',
    color: 'success'
  })
}

async function cancelJoinRequest(payload: {
  teamId: string
  requestId: string | null
}) {
  const canceledRequest = await workspace.cancelPendingJoinRequest(payload.teamId, payload.requestId)

  if (!canceledRequest) {
    return
  }

  toast.add({
    title: 'Join request canceled',
    description: 'The pending request has been canceled for this browser session.',
    color: 'success'
  })
}

useSeoMeta({
  title: () => `${hackathon.value.name} Teams | Codex Hackathons`,
  description: () => `Create or join participant teams for ${hackathon.value.name}.`
})
</script>

<template>
  <AppContainer class="space-y-8 py-10 sm:py-14">
    <section class="space-y-4">
      <NuxtLink
        :to="`/hackathons/${slug}`"
        class="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
      >
        <AppIcon
          name="i-lucide-arrow-left"
          class="size-4"
        />
        Back to hackathon detail
      </NuxtLink>

      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="space-y-3">
          <HackathonStateBadge :state="hackathon.state" />

          <div class="space-y-2">
            <h1 class="text-3xl font-semibold tracking-[-0.04em] text-highlighted sm:text-5xl">
              Team Formation Workspace
            </h1>
            <p class="max-w-3xl text-base leading-7 text-toned sm:text-lg">
              Create a new team, browse visible teams, and move into the dedicated team workspace once you are collaborating inside {{ hackathon.name }}.
            </p>
          </div>
        </div>

        <AppCard class="border border-default/70 bg-elevated/90 lg:max-w-sm">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Current access
          </p>
          <p class="mt-3 text-sm leading-7 text-toned">
            {{ teamFormationAvailability.summary }}
          </p>
        </AppCard>
      </div>
    </section>

    <AppAlert
      v-if="isWorkspaceLoading"
      color="neutral"
      variant="soft"
      title="Loading team workspace"
      description="Resolving the participant actor, visible hackathon record, application status, and team visibility for this route."
    />

    <AppAlert
      v-else-if="workspace.actorErrorMessage.value"
      color="error"
      variant="soft"
      title="Unable to resolve team access"
      :description="workspace.actorErrorMessage.value"
    />

    <template v-else-if="actor?.kind === 'authenticated_identity'">
      <AppAlert
        color="warning"
        variant="soft"
        title="Platform account required"
        description="Complete the platform account before you can enter the team formation workspace for this hackathon."
      />

      <AppButton
        to="/onboarding/account"
        color="warning"
        icon="i-lucide-id-card"
      >
        Complete platform account
      </AppButton>
    </template>

    <template v-else-if="actor?.kind === 'platform_user'">
      <AppAlert
        v-if="workspace.visibleHackathonErrorMessage.value"
        color="error"
        variant="soft"
        title="Unable to resolve hackathon access"
        :description="workspace.visibleHackathonErrorMessage.value"
      />

      <AppAlert
        v-else-if="!workspace.visibleHackathonId.value"
        color="error"
        variant="soft"
        title="Hackathon workspace unavailable"
        description="This authenticated route could not resolve the visible hackathon record needed for participant team work."
      />

      <AppAlert
        v-else-if="workspace.ownApplicationErrorMessage.value"
        color="error"
        variant="soft"
        title="Unable to resolve your application status"
        :description="workspace.ownApplicationErrorMessage.value"
      />

      <template v-else>
        <AppAlert
          v-if="workspace.mutationError.value"
          color="error"
          variant="soft"
          title="Team action failed"
          :description="workspace.mutationError.value"
        />

        <AppAlert
          v-if="workspace.ownTeamErrorMessage.value"
          color="warning"
          variant="soft"
          title="Current team membership unresolved"
          :description="workspace.ownTeamErrorMessage.value"
        />

        <ParticipantTeamDirectoryPanel
          v-model:form="createForm"
          :current-team="workspace.ownTeam.value"
          :current-team-href="currentTeamHref"
          :teams="directoryEntries"
          :total-teams="workspace.visibleTeamsTotal.value"
          :can-create-team="createTeamAvailability"
          :is-creating-team="workspace.pendingActionKey.value === 'create-team'"
          :is-loading-teams="workspace.visibleTeamsStatus.value === 'pending'"
          :team-error-message="workspace.visibleTeamsErrorMessage.value"
          :has-more-teams="workspace.hasMoreVisibleTeams.value"
          :is-loading-more-teams="workspace.isLoadingMoreVisibleTeams.value"
          :load-more-teams-error-message="workspace.loadMoreVisibleTeamsErrorMessage.value"
          :pending-action-key="workspace.pendingActionKey.value"
          @submit-create="submitCreateTeam"
          @join-team="requestToJoinTeam"
          @cancel-join-request="cancelJoinRequest"
          @load-more-teams="workspace.loadMoreVisibleTeams"
        />
      </template>
    </template>
  </AppContainer>
</template>
