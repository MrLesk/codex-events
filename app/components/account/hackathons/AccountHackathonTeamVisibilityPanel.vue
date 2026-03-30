<script setup lang="ts">
import type {
  AdminTeamDetailRecord,
  ApiDataResponse,
  ApiListResponse,
  TeamSummary
} from '~/utils/admin-workspace'

import { listAllPaginatedItems } from '~/utils/admin-workspace'

const props = defineProps<{
  hackathonId: string
}>()

const apiFetch = import.meta.server ? useRequestFetch() : $fetch

const {
  data,
  error,
  status
} = useAsyncData<AdminTeamDetailRecord[]>(
  () => `hackathon-team-visibility:${props.hackathonId}`,
  async () => {
    const teams = await listAllPaginatedItems(
      async (page, pageSize) => await apiFetch<ApiListResponse<TeamSummary>>(
        `/api/hackathons/${props.hackathonId}/teams`,
        {
          query: {
            page,
            page_size: pageSize
          }
        }
      ),
      100
    )

    return await Promise.all(teams.map(async (team) => {
      const response = await apiFetch<ApiDataResponse<AdminTeamDetailRecord>>(
        `/api/hackathons/${props.hackathonId}/teams/${team.id}`
      )

      return response.data
    }))
  },
  {
    watch: [() => props.hackathonId],
    default: () => []
  }
)

const teams = computed(() => data.value ?? [])
const openTeamsCount = computed(() =>
  teams.value.filter(team => team.isOpenToJoinRequests).length
)
const activeMemberCount = computed(() =>
  teams.value.reduce((total, team) => total + team.members.filter(member => member.leftAt === null).length, 0)
)

function getActiveMembers(team: AdminTeamDetailRecord) {
  return team.members.filter(member => member.leftAt === null)
}

function formatMemberLabel(team: AdminTeamDetailRecord) {
  const activeAdmins = getActiveMembers(team).filter(member => member.role === 'admin')

  if (activeAdmins.length === 0) {
    return 'No active admin members'
  }

  return activeAdmins
    .map(member => member.user?.displayName ?? member.user?.email ?? member.userId)
    .join(', ')
}
</script>

<template>
  <div class="space-y-6">
    <section class="grid gap-4 md:grid-cols-3">
      <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Teams
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ status === 'pending' ? 'Loading...' : status === 'error' ? 'Unavailable' : teams.length }}
        </p>
      </div>

      <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Open to join
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ status === 'pending' ? 'Loading...' : status === 'error' ? 'Unavailable' : openTeamsCount }}
        </p>
      </div>

      <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Active members
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ status === 'pending' ? 'Loading...' : status === 'error' ? 'Unavailable' : activeMemberCount }}
        </p>
      </div>
    </section>

    <AppAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Team directory unavailable"
      :description="error.message"
    />

    <AppAlert
      v-else-if="status === 'pending'"
      color="neutral"
      variant="soft"
      title="Loading teams"
      description="Fetching team detail and active membership records."
    />

    <AppCard
      v-else-if="teams.length === 0"
      class="rounded-xl hackathon-workspace-detail-panel"
    >
      <AppAlert
        color="neutral"
        variant="soft"
        title="No teams yet"
        description="Teams will appear here once approved participants start forming them."
      />
    </AppCard>

    <div
      v-else
      class="grid gap-4"
    >
      <AppCard
        v-for="team in teams"
        :key="team.id"
        class="rounded-xl hackathon-workspace-detail-panel p-6"
      >
        <div class="space-y-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-highlighted dark:text-white">
                {{ team.name }}
              </h2>
              <p class="text-sm text-muted">
                {{ getActiveMembers(team).length }} active member{{ getActiveMembers(team).length === 1 ? '' : 's' }} •
                {{ team.isOpenToJoinRequests ? 'Open to join requests' : 'Closed to join requests' }}
              </p>
              <p class="text-sm text-muted">
                Team admins: {{ formatMemberLabel(team) }}
              </p>
            </div>

            <AppBadge
              :color="team.isOpenToJoinRequests ? 'success' : 'neutral'"
              variant="soft"
            >
              {{ team.isOpenToJoinRequests ? 'Open' : 'Closed' }}
            </AppBadge>
          </div>

          <div class="space-y-3 border-t border-black/8 pt-4 dark:border-white/[0.08]">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Active members
            </p>

            <div class="flex flex-wrap gap-2">
              <div
                v-for="member in getActiveMembers(team)"
                :key="member.id"
                class="rounded-lg border border-black/8 px-3 py-2 text-sm dark:border-white/[0.08]"
              >
                <p class="font-medium text-highlighted dark:text-white">
                  {{ member.user?.displayName ?? member.user?.email ?? member.userId }}
                </p>
                <p class="text-xs text-muted">
                  {{ member.user?.email ?? member.userId }} • {{ member.role === 'admin' ? 'Admin' : 'Member' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>
