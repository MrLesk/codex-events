<script setup lang="ts">
import type { PublicPrize } from '~/composables/useHackathonPresentation'

const props = defineProps<{
  prizes: PublicPrize[]
  errorMessage?: string
}>()
</script>

<template>
  <UCard
    variant="subtle"
    :ui="{ root: 'border border-default/80 bg-elevated/85 backdrop-blur shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)]' }"
    data-testid="public-hackathon-prizes"
  >
    <div class="space-y-6">
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Prize structure
        </p>
        <h2 class="text-2xl font-semibold tracking-[-0.03em] text-highlighted">
          Published awards
        </h2>
      </div>

      <UAlert
        v-if="errorMessage"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Prizes unavailable"
        :description="errorMessage"
      />

      <div
        v-else-if="prizes.length === 0"
        class="rounded-2xl border border-dashed border-default/80 bg-default/55 p-5 text-sm leading-7 text-muted"
      >
        This program has not published prize definitions yet.
      </div>

      <div
        v-else
        class="grid gap-4"
      >
        <div
          v-for="prize in prizes"
          :key="`${prize.rankStart}-${prize.rankEnd}-${prize.name}`"
          class="rounded-2xl border border-default/80 bg-default/60 p-5"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-semibold text-highlighted">
                  {{ prize.name }}
                </h3>
                <UBadge
                  color="neutral"
                  variant="outline"
                  class="rounded-full px-3 py-1.5"
                >
                  {{ formatPrizeRank(prize) }}
                </UBadge>
              </div>

              <p class="text-sm leading-7 text-toned">
                {{ prize.description }}
              </p>
            </div>

            <div class="space-y-2 text-right">
              <p class="text-sm font-semibold text-highlighted">
                {{ formatPrizeReward(prize) }}
              </p>
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {{ formatPrizeScope(prize.awardScope) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
