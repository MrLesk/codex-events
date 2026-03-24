<script setup lang="ts">
import type { PublicEvaluationCriterion } from '~/composables/useHackathonPresentation'

const props = defineProps<{
  criteria: PublicEvaluationCriterion[]
  errorMessage?: string
}>()
</script>

<template>
  <AppCard
    variant="subtle"
    :ui="{ root: 'border border-default/80 bg-elevated/85 backdrop-blur shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)]' }"
    data-testid="public-hackathon-criteria"
  >
    <div class="space-y-6">
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Evaluation criteria
        </p>
        <h2 class="text-2xl font-semibold tracking-[-0.03em] text-highlighted">
          Public scoring dimensions
        </h2>
      </div>

      <AppAlert
        v-if="errorMessage"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Criteria unavailable"
        :description="errorMessage"
      />

      <div
        v-else-if="criteria.length === 0"
        class="rounded-2xl border border-dashed border-default/80 bg-default/55 p-5 text-sm leading-7 text-muted"
      >
        This program has not published evaluation criteria yet.
      </div>

      <div
        v-else
        class="grid gap-4"
      >
        <div
          v-for="criterion in criteria"
          :key="criterion.displayOrder"
          class="rounded-2xl border border-default/80 bg-default/60 p-5"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-2">
              <h3 class="text-lg font-semibold text-highlighted">
                {{ criterion.name }}
              </h3>
              <p class="text-sm leading-7 text-toned">
                {{ criterion.description }}
              </p>
            </div>

            <AppBadge
              color="primary"
              variant="soft"
              class="rounded-full px-3 py-1.5"
            >
              {{ criterion.weight }} weight
            </AppBadge>
          </div>
        </div>
      </div>
    </div>
  </AppCard>
</template>
