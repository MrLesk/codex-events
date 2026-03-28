<script setup lang="ts">
import type { HackathonState, WinnerEntry } from '~/utils/admin-workspace'
import type { PrizeRedemptionRecord } from '~/utils/prize-redemptions'

import {
  buildWinnerLookup,
  describePrizeRedemptionRecipient,
  formatPrizeRedemptionStatus,
  getPrizeRedemptionStatusColor
} from '~/utils/prize-redemptions'

const props = defineProps<{
  hackathonState: HackathonState
  winners: WinnerEntry[]
  redemptions: PrizeRedemptionRecord[]
  isLoading?: boolean
  errorMessage?: string
}>()

const redemptionsVisible = computed(() =>
  ['winners_announced', 'completed'].includes(props.hackathonState)
)

const winnerByTeamId = computed(() => buildWinnerLookup(props.winners))
const pendingCount = computed(() => props.redemptions.filter(redemption => redemption.status === 'pending').length)
const redeemedCount = computed(() => props.redemptions.filter(redemption => redemption.status === 'redeemed').length)
</script>

<template>
  <AppCard class="rounded-xl hackathon-workspace-detail-panel">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Prize Redemptions
        </h2>
        <p class="text-sm text-muted">
          Review winner-facing redemption progress without exposing redemption records outside the admin competition surface.
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <AppAlert
        v-if="!redemptionsVisible"
        color="neutral"
        variant="soft"
        title="Prize redemption visibility unavailable"
        description="Redemption records become visible here only after winners are announced."
      />

      <template v-else>
        <section class="grid gap-4 sm:grid-cols-2">
          <div class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Pending records
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ pendingCount }}
            </p>
          </div>

          <div class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-5 py-5">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Redeemed records
            </p>
            <p class="mt-2 text-xl font-semibold text-highlighted">
              {{ redeemedCount }}
            </p>
          </div>
        </section>

        <AppAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          title="Prize redemption view unavailable"
          :description="errorMessage"
        />

        <AppAlert
          v-else-if="isLoading"
          color="neutral"
          variant="soft"
          title="Loading prize redemptions"
          description="Winner records and redemption progress are still loading."
        />

        <div
          v-else-if="redemptions.length > 0"
          class="grid gap-4"
        >
          <article
            v-for="redemption in redemptions"
            :key="redemption.id"
            :data-testid="`admin-competition-redemption-${redemption.id}`"
            class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-5 py-5"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="space-y-3">
                <div class="space-y-1">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {{ redemption.hackathon.name }}
                  </p>
                  <div class="flex flex-wrap items-center gap-3">
                    <h3 class="text-lg font-semibold text-highlighted">
                      {{ redemption.prize.name }}
                    </h3>
                    <AppBadge
                      :data-testid="`admin-competition-redemption-status-${redemption.id}`"
                      :color="getPrizeRedemptionStatusColor(redemption.status)"
                      variant="soft"
                    >
                      {{ formatPrizeRedemptionStatus(redemption.status) }}
                    </AppBadge>
                  </div>
                </div>

                <p class="text-sm text-toned">
                  {{ describePrizeRedemptionRecipient(redemption) }}
                </p>
              </div>

              <div class="grid gap-3 text-sm text-toned sm:grid-cols-2 lg:min-w-[19rem]">
                <div>
                  <p class="font-semibold text-highlighted">
                    Winning team
                  </p>
                  <p>
                    {{ redemption.teamId ? (winnerByTeamId.get(redemption.teamId)?.teamName ?? redemption.teamId) : 'No team recorded' }}
                  </p>
                </div>

                <div>
                  <p class="font-semibold text-highlighted">
                    Winner rank
                  </p>
                  <p>
                    {{ redemption.teamId ? `#${winnerByTeamId.get(redemption.teamId)?.finalRank ?? '—'}` : '—' }}
                  </p>
                </div>

                <div>
                  <p class="font-semibold text-highlighted">
                    Legal name
                  </p>
                  <p>
                    {{ redemption.legalName ?? 'Not submitted yet' }}
                  </p>
                </div>

                <div>
                  <p class="font-semibold text-highlighted">
                    Accepted winner terms
                  </p>
                  <p>
                    {{ redemption.winnerTermsDocumentId ?? 'Not submitted yet' }}
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>

        <AppAlert
          v-else
          color="neutral"
          variant="soft"
          title="No redemption records yet"
          description="This hackathon currently has no redemption records to review."
        />
      </template>
    </div>
  </AppCard>
</template>
