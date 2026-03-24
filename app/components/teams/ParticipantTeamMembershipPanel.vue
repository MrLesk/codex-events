<script setup lang="ts">
import type {
  TeamActionAvailability,
  TeamDetailRecord,
  TeamMemberRecord
} from '~/utils/team-workspace'

import { formatTeamMemberRole } from '~/utils/team-workspace'

defineProps<{
  team: TeamDetailRecord
  membership?: TeamMemberRecord | null
  canManageTeam?: boolean
  removalAvailabilityByUserId?: Record<string, TeamActionAvailability>
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  removeMember: [userId: string]
}>()
</script>

<template>
  <AppCard class="border border-default/70 bg-elevated/90">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Team Members
        </h2>
        <p class="text-sm text-muted">
          Membership roles stay explicit. Active teams must retain an admin, and later lifecycle stages may also require at least one remaining member.
        </p>
      </div>
    </template>

    <div class="grid gap-4">
      <article
        v-for="member in team.members"
        :key="member.id"
        :data-testid="`participant-team-member-${member.userId}`"
        class="rounded-[1.5rem] border border-default bg-default px-5 py-5"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-3">
              <h3 class="text-lg font-semibold text-highlighted">
                {{ member.user?.displayName ?? member.userId }}
              </h3>

              <AppBadge
                :color="member.role === 'admin' ? 'primary' : 'neutral'"
                variant="soft"
              >
                {{ formatTeamMemberRole(member.role) }}
              </AppBadge>

              <AppBadge
                v-if="membership?.id === member.id"
                color="success"
                variant="soft"
              >
                You
              </AppBadge>
            </div>

            <p class="text-sm text-toned">
              {{ member.user?.email ?? member.userId }} • Joined {{ member.joinedAt }}
            </p>

            <p
              v-if="canManageTeam && removalAvailabilityByUserId?.[member.userId] && !removalAvailabilityByUserId?.[member.userId]?.isAllowed"
              class="text-sm text-muted"
            >
              {{ removalAvailabilityByUserId?.[member.userId]?.reason }}
            </p>
          </div>

          <AppButton
            v-if="canManageTeam && membership?.id !== member.id"
            color="warning"
            variant="soft"
            :loading="pendingActionKey === `remove-team-member:${team.id}:${member.userId}`"
            :disabled="!removalAvailabilityByUserId?.[member.userId]?.isAllowed || pendingActionKey === `remove-team-member:${team.id}:${member.userId}`"
            :data-testid="`participant-team-remove-${member.userId}`"
            @click="emit('removeMember', member.userId)"
          >
            Remove member
          </AppButton>
        </div>
      </article>
    </div>
  </AppCard>
</template>
