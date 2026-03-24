<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'

const props = defineProps<{
  hackathon: PublicHackathon
}>()

const termsReferences = computed(() => {
  const currentTerms = props.hackathon.currentTerms

  if (!currentTerms) {
    return []
  }

  return [currentTerms.applicationTerms, currentTerms.winnerTerms].filter(
    (document): document is NonNullable<typeof document> => Boolean(document)
  )
})
</script>

<template>
  <AppCard
    variant="subtle"
    :ui="{ root: 'border border-default/80 bg-elevated/85 backdrop-blur shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)]' }"
    data-testid="public-hackathon-terms"
  >
    <div class="space-y-6">
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Terms references
        </p>
        <h2 class="text-2xl font-semibold tracking-[-0.03em] text-highlighted">
          Current document versions
        </h2>
        <p class="text-sm leading-7 text-toned">
          Public detail shows the currently referenced document versions only. Full terms content is presented later in the authenticated workflows that require acceptance.
        </p>
      </div>

      <div
        v-if="termsReferences.length === 0"
        class="app-inset-card-tight border-dashed p-5 text-sm leading-7 text-muted"
      >
        This program has not published current terms references yet.
      </div>

      <div
        v-else
        class="grid gap-4"
      >
        <div
          v-for="document in termsReferences"
          :key="`${document.documentType}:${document.version}`"
          class="app-inset-card-tight p-5"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {{ formatTermsDocumentType(document.documentType) }}
              </p>
              <h3 class="text-lg font-semibold text-highlighted">
                {{ document.title }}
              </h3>
            </div>

            <AppBadge
              color="neutral"
              variant="outline"
              class="rounded-full px-3 py-1.5"
            >
              Version {{ document.version }}
            </AppBadge>
          </div>

          <p class="mt-4 text-sm text-muted">
            Published {{ formatHackathonDate(document.publishedAt) }}
          </p>
        </div>
      </div>
    </div>
  </AppCard>
</template>
