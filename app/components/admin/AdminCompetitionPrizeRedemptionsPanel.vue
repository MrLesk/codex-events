<script setup lang="ts">
import type { HackathonState, WinnerEntry } from '~/utils/admin-workspace'
import type {
  PrizeRedemptionBlindRankingEntry,
  PrizeRedemptionFinalRankingEntry,
  PrizeRedemptionRecord
} from '~/utils/prize-redemptions'

import {
  formatPrizeRank,
  formatPrizeReward
} from '~/composables/useHackathonPresentation'
import {
  buildPrizeRedemptionPostShortlistEntries,
  buildPrizeRedemptionOperationsView,
  formatPrizeRedemptionStatus,
  getPrizeRedemptionStatusColor
} from '~/utils/prize-redemptions'

const props = defineProps<{
  hackathonState: HackathonState
  winners: WinnerEntry[]
  redemptions: PrizeRedemptionRecord[]
  blindRankingEntries: PrizeRedemptionBlindRankingEntry[]
  finalRankingEntries: PrizeRedemptionFinalRankingEntry[]
  pitchPresentationSubmissionIds: string[]
  isLoading?: boolean
  errorMessage?: string
}>()

const redemptionsVisible = computed(() =>
  ['winners_announced', 'completed'].includes(props.hackathonState)
)

const pendingCount = computed(() => props.redemptions.filter(redemption => redemption.status === 'pending').length)
const redeemedCount = computed(() => props.redemptions.filter(redemption => redemption.status === 'redeemed').length)
const operationsPrizeView = computed(() =>
  buildPrizeRedemptionOperationsView(props.winners, props.redemptions, props.finalRankingEntries)
)
const podiumItems = computed(() => operationsPrizeView.value.podiumItems)
const additionalWinnerItems = computed(() => operationsPrizeView.value.additionalWinnerItems)
const remainingRankedEntries = computed(() => operationsPrizeView.value.remainingRankedEntries)
const postShortlistEntries = computed(() =>
  buildPrizeRedemptionPostShortlistEntries(
    props.blindRankingEntries,
    props.pitchPresentationSubmissionIds
  )
)
</script>

<template>
  <AppCard class="rounded-xl hackathon-workspace-detail-panel">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Prize Redemptions
        </h2>
        <p class="text-sm text-muted">
          Review winner-facing redemption progress directly from Operations without exposing redemption records to non-admin actors.
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
          class="space-y-6"
        >
          <section
            v-if="podiumItems.length > 0"
            class="space-y-3"
          >
            <div class="space-y-1">
              <h3 class="text-sm font-semibold text-highlighted">
                Podium awards
              </h3>
              <p class="text-sm text-muted">
                Ranks 1 through 3 stay pinned at the top so the main podium outcomes are visible immediately.
              </p>
            </div>

            <div class="grid gap-4">
              <article
                v-for="item in podiumItems"
                :key="item.primaryPrize.id"
                :data-testid="`admin-competition-redemption-${item.primaryRedemption?.id ?? item.primaryPrize.id}`"
                class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-5 py-5"
              >
                <div class="grid gap-6 xl:grid-cols-[minmax(0,2.25fr)_minmax(18rem,1fr)]">
                  <div class="space-y-4">
                    <div class="space-y-1">
                      <div class="flex flex-wrap items-center gap-3">
                        <h3 class="text-lg font-semibold text-highlighted">
                          #{{ item.winner.finalRank }} {{ item.winner.teamName }}
                        </h3>
                        <AppBadge
                          :data-testid="`admin-competition-redemption-status-${item.primaryRedemption?.id ?? item.primaryPrize.id}`"
                          :color="item.primaryRedemption ? getPrizeRedemptionStatusColor(item.primaryRedemption.status) : 'neutral'"
                          variant="soft"
                        >
                          {{ item.primaryRedemption ? formatPrizeRedemptionStatus(item.primaryRedemption.status) : 'No record' }}
                        </AppBadge>
                      </div>
                      <p class="text-sm text-toned">
                        {{ item.winner.projectName ?? item.winner.submissionId }}
                      </p>
                    </div>

                    <div class="grid gap-4 text-sm text-toned sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p class="font-semibold text-highlighted">
                          Primary prize
                        </p>
                        <p>
                          {{ item.primaryPrize.name }}
                        </p>
                      </div>

                      <div>
                        <p class="font-semibold text-highlighted">
                          Reward
                        </p>
                        <p>
                          {{ formatPrizeReward(item.primaryPrize) }}
                        </p>
                      </div>

                      <div>
                        <p class="font-semibold text-highlighted">
                          Team redemption
                        </p>
                        <p>
                          {{ item.primaryRedemption?.legalName ?? 'Not submitted yet' }}
                        </p>
                      </div>

                      <div v-if="item.additionalPrizes.length > 0">
                        <p class="font-semibold text-highlighted">
                          Also eligible
                        </p>
                        <p>
                          {{ item.additionalPrizes.map(prize => prize.name).join(', ') }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-3">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Winning team members
                    </p>

                    <div
                      v-if="item.winner.teamMembers.length > 0"
                      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"
                    >
                      <article
                        v-for="member in item.winner.teamMembers"
                        :key="member.id"
                        class="hackathon-workspace-detail-inset flex items-center gap-3 rounded-xl p-4"
                      >
                        <AppAvatar
                          size="lg"
                          :src="member.profileIconUrl ?? undefined"
                          :alt="member.fullName"
                          class="shrink-0"
                        />

                        <div class="min-w-0 flex-1">
                          <h4 class="text-sm font-semibold text-highlighted">
                            {{ member.fullName }}
                          </h4>
                          <p
                            v-if="member.bio"
                            class="mt-1 line-clamp-2 text-sm text-toned"
                          >
                            {{ member.bio }}
                          </p>
                        </div>
                      </article>
                    </div>

                    <p
                      v-else
                      class="text-sm text-toned"
                    >
                      No team members are published for this winner.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section
            v-if="additionalWinnerItems.length > 0"
            class="space-y-3"
          >
            <div class="space-y-1">
              <h3 class="text-sm font-semibold text-highlighted">
                Additional winner benefits
              </h3>
              <p class="text-sm text-muted">
                Teams outside the podium still render as winner rows here, so ranks 4 and 5 stay easy to scan with their members and redemption progress.
              </p>
            </div>

            <div class="grid gap-4">
              <article
                v-for="item in additionalWinnerItems"
                :key="item.winner.teamId"
                :data-testid="`admin-competition-additional-winner-${item.winner.teamId}`"
                class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-5 py-5"
              >
                <div class="grid gap-6 xl:grid-cols-[minmax(0,2.25fr)_minmax(18rem,1fr)]">
                  <div class="space-y-4">
                    <div class="space-y-1">
                      <div class="flex flex-wrap items-center gap-3">
                        <h3 class="text-lg font-semibold text-highlighted">
                          #{{ item.winner.finalRank }} {{ item.winner.teamName }}
                        </h3>
                        <AppBadge
                          :color="item.totalCount > 0 && item.redeemedCount === item.totalCount ? 'success' : 'warning'"
                          variant="soft"
                        >
                          {{ item.totalCount > 0 ? `${item.redeemedCount} / ${item.totalCount} redeemed` : 'No records' }}
                        </AppBadge>
                      </div>
                      <p class="text-sm text-toned">
                        {{ item.winner.projectName ?? item.winner.submissionId }}
                      </p>
                    </div>

                    <div class="grid gap-4 text-sm text-toned sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p class="font-semibold text-highlighted">
                          Winner benefits
                        </p>
                        <p>
                          {{ item.prizes.map(prize => prize.name).join(', ') }}
                        </p>
                      </div>

                      <div>
                        <p class="font-semibold text-highlighted">
                          Reward
                        </p>
                        <p>
                          {{ item.prizes.map(prize => `${formatPrizeRank(prize)} · ${formatPrizeReward(prize)}`).join(' / ') }}
                        </p>
                      </div>

                      <div>
                        <p class="font-semibold text-highlighted">
                          Benefit recipients
                        </p>
                        <p>
                          {{ item.recipientLabels.join(', ') || 'No recipients recorded' }}
                        </p>
                      </div>

                      <div>
                        <p class="font-semibold text-highlighted">
                          Recipient progress
                        </p>
                        <p>
                          {{ item.pendingCount }} pending · {{ item.redeemedCount }} redeemed
                        </p>
                      </div>
                    </div>

                    <div
                      v-if="item.recipientEntries.length > 0"
                      class="space-y-2"
                    >
                      <p class="font-semibold text-highlighted">
                        Recipient progress
                      </p>

                      <div class="grid gap-2">
                        <div
                          v-for="recipient in item.recipientEntries"
                          :key="recipient.redemptionId"
                          :data-testid="`admin-competition-redemption-${recipient.redemptionId}`"
                          class="flex flex-wrap items-center justify-between gap-3 text-sm text-toned"
                        >
                          <div class="space-y-0.5">
                            <p>
                              {{ recipient.label }}
                            </p>
                            <p class="text-xs text-muted">
                              {{ recipient.legalName ?? 'Legal name not submitted yet' }}
                            </p>
                          </div>

                          <AppBadge
                            :data-testid="`admin-competition-redemption-status-${recipient.redemptionId}`"
                            :color="getPrizeRedemptionStatusColor(recipient.status)"
                            variant="soft"
                          >
                            {{ formatPrizeRedemptionStatus(recipient.status) }}
                          </AppBadge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-3">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Winning team members
                    </p>

                    <div
                      v-if="item.winner.teamMembers.length > 0"
                      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"
                    >
                      <article
                        v-for="member in item.winner.teamMembers"
                        :key="member.id"
                        class="hackathon-workspace-detail-inset flex items-center gap-3 rounded-xl p-4"
                      >
                        <AppAvatar
                          size="lg"
                          :src="member.profileIconUrl ?? undefined"
                          :alt="member.fullName"
                          class="shrink-0"
                        />

                        <div class="min-w-0 flex-1">
                          <h4 class="text-sm font-semibold text-highlighted">
                            {{ member.fullName }}
                          </h4>
                          <p
                            v-if="member.bio"
                            class="mt-1 line-clamp-2 text-sm text-toned"
                          >
                            {{ member.bio }}
                          </p>
                        </div>
                      </article>
                    </div>

                    <p
                      v-else
                      class="text-sm text-toned"
                    >
                      No team members are published for this winner.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section
            v-if="hackathonState === 'completed' && remainingRankedEntries.length > 0"
            class="space-y-3"
          >
            <div class="space-y-1">
              <h3 class="text-sm font-semibold text-highlighted">
                Remaining final ranking
              </h3>
              <p class="text-sm text-muted">
                Projects without winner benefits stay listed here so the full final ranking is visible after the hackathon is completed.
              </p>
            </div>

            <div class="grid gap-4">
              <article
                v-for="entry in remainingRankedEntries"
                :key="entry.submissionId"
                :data-testid="`admin-competition-remaining-ranked-${entry.submissionId}`"
                class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-5 py-5"
              >
                <div class="grid gap-6 xl:grid-cols-[minmax(0,2.25fr)_minmax(18rem,1fr)]">
                  <div class="space-y-4">
                    <div class="space-y-1">
                      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                        Final rank
                      </p>
                      <div class="flex flex-wrap items-center gap-3">
                        <h4 class="text-lg font-semibold text-highlighted">
                          #{{ entry.finalRank }} {{ entry.teamName }}
                        </h4>
                      </div>
                      <p class="text-sm text-toned">
                        {{ entry.projectName ?? entry.submissionId }}
                      </p>
                    </div>
                  </div>

                  <div class="space-y-3">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Team members
                    </p>

                    <div
                      v-if="entry.teamMembers.length > 0"
                      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"
                    >
                      <article
                        v-for="member in entry.teamMembers"
                        :key="member.id"
                        class="hackathon-workspace-detail-inset flex items-center gap-3 rounded-xl p-4"
                      >
                        <AppAvatar
                          size="lg"
                          :src="member.profileIconUrl ?? undefined"
                          :alt="member.fullName"
                          class="shrink-0"
                        />

                        <div class="min-w-0 flex-1">
                          <h5 class="text-sm font-semibold text-highlighted">
                            {{ member.fullName }}
                          </h5>
                          <p
                            v-if="member.bio"
                            class="mt-1 line-clamp-2 text-sm text-toned"
                          >
                            {{ member.bio }}
                          </p>
                        </div>
                      </article>
                    </div>

                    <p
                      v-else
                      class="text-sm text-toned"
                    >
                      No team members are published for this team.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section
            v-if="hackathonState === 'completed' && postShortlistEntries.length > 0"
            class="space-y-3"
          >
            <div class="space-y-1">
              <h3 class="text-sm font-semibold text-highlighted">
                Post-shortlist teams
              </h3>
              <p class="text-sm text-muted">
                Teams below the finalist cutoff stay visible here in blind-review rank order so the completed operations view still shows what came after the shortlist.
              </p>
            </div>

            <div class="grid gap-4">
              <article
                v-for="entry in postShortlistEntries"
                :key="entry.submissionId"
                :data-testid="`admin-competition-post-shortlist-${entry.submissionId}`"
                class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-5 py-5"
              >
                <div class="grid gap-6 xl:grid-cols-[minmax(0,2.25fr)_minmax(18rem,1fr)]">
                  <div class="space-y-4">
                    <div class="space-y-1">
                      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                        Blind-review rank
                      </p>
                      <div class="flex flex-wrap items-center gap-3">
                        <h4 class="text-lg font-semibold text-highlighted">
                          #{{ entry.blindRank }} {{ entry.teamName }}
                        </h4>
                      </div>
                      <p class="text-sm text-toned">
                        {{ entry.projectName ?? entry.submissionId }}
                      </p>
                    </div>
                  </div>

                  <div class="space-y-3">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Team members
                    </p>

                    <div
                      v-if="entry.teamMembers.length > 0"
                      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"
                    >
                      <article
                        v-for="member in entry.teamMembers"
                        :key="member.id"
                        class="hackathon-workspace-detail-inset flex items-center gap-3 rounded-xl p-4"
                      >
                        <AppAvatar
                          size="lg"
                          :src="member.profileIconUrl ?? undefined"
                          :alt="member.fullName"
                          class="shrink-0"
                        />

                        <div class="min-w-0 flex-1">
                          <h5 class="text-sm font-semibold text-highlighted">
                            {{ member.fullName }}
                          </h5>
                          <p
                            v-if="member.bio"
                            class="mt-1 line-clamp-2 text-sm text-toned"
                          >
                            {{ member.bio }}
                          </p>
                        </div>
                      </article>
                    </div>

                    <p
                      v-else
                      class="text-sm text-toned"
                    >
                      No team members are published for this team.
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </section>
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
