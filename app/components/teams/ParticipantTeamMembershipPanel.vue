<script setup lang="ts">
import type {
  TeamActionAvailability,
  TeamDetailRecord,
  TeamMemberRecord
} from '~/domains/teams/workspace'

import { formatTimestamp } from '~/utils/date-formatting'
import { formatTeamMemberRole } from '~/domains/teams/workspace'

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
  <AppCard class="rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-xl font-semibold text-highlighted dark:text-white">
          Team members
        </h2>
        <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
          Membership roles stay explicit. Active teams must retain an admin, and later lifecycle stages may also require at least one remaining member.
        </p>
      </div>
    </template>

    <div class="grid gap-4">
      <article
        v-for="member in team.members"
        :key="member.id"
        :data-testid="`participant-team-member-${member.userId}`"
        class="rounded-xl border border-black/8 bg-white/78 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] backdrop-blur-xl dark:border-white/[0.10] dark:bg-[#151515]/64 px-5 py-5"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-3">
              <h3 class="text-lg font-semibold text-highlighted dark:text-white">
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
                color="info"
                variant="soft"
              >
                You
              </AppBadge>
            </div>

            <p class="text-sm text-toned">
              <template v-if="member.user?.email">
                {{ member.user.email }} • Joined {{ formatTimestamp(member.joinedAt) }}
              </template>
              <template v-else>
                Joined {{ formatTimestamp(member.joinedAt) }}
              </template>
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
