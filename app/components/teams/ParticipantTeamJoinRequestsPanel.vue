<script setup lang="ts">
import type { TeamJoinRequestRecord } from '~/utils/team-workspace'

import {
  formatTeamJoinRequestStatus,
  getTeamJoinRequestStatusColor
} from '~/utils/team-workspace'

defineProps<{
  requests: TeamJoinRequestRecord[]
  status?: 'idle' | 'pending' | 'success' | 'error'
  errorMessage?: string
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  approveRequest: [requestId: string]
  rejectRequest: [requestId: string]
}>()
</script>

<template>
  <UCard class="border border-default/70 bg-elevated/90">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Join Requests
        </h2>
        <p class="text-sm text-muted">
          Team admins review pending requests here. Approved users join immediately after approval through the canonical membership rules.
        </p>
      </div>
    </template>

    <div class="space-y-4">
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        title="Join requests unavailable"
        :description="errorMessage"
      />

      <UAlert
        v-else-if="status === 'pending'"
        color="neutral"
        variant="soft"
        title="Loading join requests"
        description="Pending and reviewed join requests are still loading for this team."
      />

      <div
        v-else-if="requests.length > 0"
        class="grid gap-4"
      >
        <article
          v-for="request in requests"
          :key="request.id"
          :data-testid="`participant-team-join-request-${request.id}`"
          class="rounded-[1.5rem] border border-default bg-default px-5 py-5"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-3">
                <h3 class="text-lg font-semibold text-highlighted">
                  {{ request.user?.displayName ?? request.userId }}
                </h3>

                <UBadge
                  :color="getTeamJoinRequestStatusColor(request.status)"
                  variant="soft"
                >
                  {{ formatTeamJoinRequestStatus(request.status) }}
                </UBadge>
              </div>

              <p class="text-sm text-toned">
                {{ request.user?.email ?? request.userId }} • Requested {{ request.requestedAt }}
              </p>

              <p
                v-if="request.reviewedAt"
                class="text-sm text-muted"
              >
                Reviewed {{ request.reviewedAt }} by {{ request.reviewedByUserId ?? 'system' }}.
              </p>
            </div>

            <div
              v-if="request.status === 'pending'"
              class="flex flex-wrap gap-3"
            >
              <UButton
                color="success"
                :loading="pendingActionKey === `approve-join-request:${request.id}`"
                :disabled="pendingActionKey === `approve-join-request:${request.id}`"
                :data-testid="`participant-team-approve-request-${request.id}`"
                @click="emit('approveRequest', request.id)"
              >
                Approve
              </UButton>

              <UButton
                color="warning"
                variant="soft"
                :loading="pendingActionKey === `reject-join-request:${request.id}`"
                :disabled="pendingActionKey === `reject-join-request:${request.id}`"
                :data-testid="`participant-team-reject-request-${request.id}`"
                @click="emit('rejectRequest', request.id)"
              >
                Reject
              </UButton>
            </div>
          </div>
        </article>
      </div>

      <UAlert
        v-else
        color="neutral"
        variant="soft"
        title="No join requests yet"
        description="Join requests will appear here once another approved participant asks to join this team."
      />
    </div>
  </UCard>
</template>
