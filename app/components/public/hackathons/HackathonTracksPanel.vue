<script setup lang="ts">
import type { PublicHackathonTrack } from '~/composables/useHackathonPresentation'

const props = defineProps<{
  tracks: PublicHackathonTrack[]
}>()

const sortedTracks = computed(() =>
  [...props.tracks].sort((left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name))
)
</script>

<template>
  <section
    v-if="sortedTracks.length > 0"
    class="hackathon-workspace-detail-panel rounded-xl p-6"
    data-testid="public-hackathon-tracks"
  >
    <div class="mb-5 space-y-1">
      <h2 class="text-[16px] font-medium text-highlighted dark:text-white">
        Tracks
      </h2>
      <p class="text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
        Participants choose one track when they submit their project.
      </p>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <article
        v-for="track in sortedTracks"
        :key="track.displayOrder"
        class="rounded-xl border border-black/8 bg-white/78 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]"
      >
        <h3 class="text-[15px] font-semibold text-highlighted dark:text-white">
          {{ track.name }}
        </h3>
        <p class="mt-2 text-[14px] leading-relaxed text-neutral-600 dark:text-[#B0B0B0]">
          {{ track.description }}
        </p>
      </article>
    </div>
  </section>
</template>
