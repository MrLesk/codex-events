<script setup lang="ts">
import type {
  HackathonState,
  LifecycleControl,
  WinnerEntry
} from '~/utils/admin-workspace'

const props = defineProps<{
  hackathonState: HackathonState
  winners: WinnerEntry[]
  winnerTermsTitle?: string | null
  outcomeControl: LifecycleControl | null
  isLoading?: boolean
  errorMessage?: string
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  announceWinners: []
  completeHackathon: []
}>()

const winnersVisible = computed(() =>
  ['winners_announced', 'completed'].includes(props.hackathonState)
)
</script>

<template>
  <UCard class="border border-default/70 bg-elevated/90">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Winners And Completion
        </h2>
        <p class="text-sm text-muted">
          Publish the final outcome from shortlist, then close the hackathon once winners are announced.
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <div class="rounded-[1.5rem] border border-default bg-default px-5 py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Current winner terms
        </p>
        <p class="mt-2 text-sm text-toned">
          {{ winnerTermsTitle ?? 'No current winner terms selected.' }}
        </p>
      </div>

      <div
        v-if="outcomeControl"
        class="rounded-[1.5rem] border border-default bg-default px-5 py-5"
      >
        <div class="space-y-3">
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Outcome action
            </p>
            <h3 class="text-lg font-semibold text-highlighted">
              {{ outcomeControl.label }}
            </h3>
            <p class="text-sm text-toned">
              {{ outcomeControl.description }}
            </p>
          </div>

          <UAlert
            v-if="outcomeControl.reason"
            color="warning"
            variant="soft"
            title="Action blocked"
            :description="outcomeControl.reason"
          />

          <div class="flex flex-wrap gap-3">
            <UButton
              v-if="outcomeControl.key === 'announce_winners'"
              color="success"
              data-testid="admin-competition-announce-winners"
              :loading="pendingActionKey === 'announce-winners'"
              :disabled="!outcomeControl.isEnabled || (pendingActionKey !== null && pendingActionKey !== 'announce-winners')"
              @click="emit('announceWinners')"
            >
              Announce winners
            </UButton>

            <UButton
              v-else-if="outcomeControl.key === 'complete'"
              color="neutral"
              data-testid="admin-competition-complete-hackathon"
              :loading="pendingActionKey === 'complete-hackathon'"
              :disabled="!outcomeControl.isEnabled || (pendingActionKey !== null && pendingActionKey !== 'complete-hackathon')"
              @click="emit('completeHackathon')"
            >
              Complete hackathon
            </UButton>
          </div>
        </div>
      </div>

      <UAlert
        v-if="!winnersVisible"
        color="neutral"
        variant="soft"
        title="Winners are not public yet"
        description="The winners list becomes available only after the shortlist is announced."
      />

      <template v-else>
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          title="Winner view unavailable"
          :description="errorMessage"
        />

        <UAlert
          v-else-if="isLoading"
          color="neutral"
          variant="soft"
          title="Loading winners"
          description="Final winner records are still loading."
        />

        <div
          v-else-if="winners.length > 0"
          class="grid gap-4"
        >
          <article
            v-for="winner in winners"
            :key="winner.submissionId"
            :data-testid="`admin-competition-winner-${winner.submissionId}`"
            class="rounded-[1.5rem] border border-default bg-default px-5 py-5"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="space-y-2">
                <div class="space-y-1">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Winner rank
                  </p>
                  <h3 class="text-lg font-semibold text-highlighted">
                    #{{ winner.finalRank }}
                  </h3>
                </div>
                <p class="text-sm text-toned">
                  {{ winner.teamName }} • {{ winner.projectName ?? winner.submissionId }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="prize in winner.prizes"
                  :key="prize.id"
                  color="success"
                  variant="soft"
                >
                  {{ prize.name }}
                </UBadge>
              </div>
            </div>
          </article>
        </div>

        <UAlert
          v-else
          color="neutral"
          variant="soft"
          title="No winners currently assigned"
          description="No shortlist entries currently map to configured prizes."
        />
      </template>
    </div>
  </UCard>
</template>
