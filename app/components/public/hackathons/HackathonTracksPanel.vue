<script setup lang="ts">
import type { PublicHackathonTrack } from '~/domains/hackathons/presentation'

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
    class="!border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60 relative overflow-hidden rounded-[1.75rem] p-5 sm:p-7"
    data-testid="public-hackathon-tracks"
  >
    <div
      class="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-500/55 to-transparent"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -left-8 top-5 size-24 rounded-full bg-sky-500/10 blur-3xl"
      aria-hidden="true"
    />

    <div class="relative mb-6 flex items-center gap-3 border-b border-black/8 pb-5 dark:border-white/[0.08]">
      <span class="flex size-8 items-center justify-center rounded-full border border-black/8 bg-white/80 text-sky-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-sky-300">
        <AppIcon
          name="i-lucide-layout-grid"
          class="size-4"
        />
      </span>
      <div class="min-w-0">
        <h2 class="text-xl font-semibold tracking-[-0.03em] text-highlighted dark:text-white">
          Tracks
        </h2>
        <p class="mt-1 text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
          Participants choose one track when they submit their project.
        </p>
      </div>
    </div>

    <div class="divide-y divide-black/8 dark:divide-white/[0.08]">
      <article
        v-for="track in sortedTracks"
        :key="track.displayOrder"
        class="py-5 first:pt-0 last:pb-0"
      >
        <div class="flex items-start gap-4">
          <div class="flex w-20 shrink-0 items-start justify-center pt-0.5">
            <span class="flex size-11 items-center justify-center rounded-full border border-black/8 bg-white/80 text-sky-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-sky-300">
              <AppIcon
                name="i-lucide-arrow-right"
                class="size-4"
              />
            </span>
          </div>

          <div class="min-w-0 flex-1 space-y-2">
            <div class="flex flex-wrap items-center gap-3">
              <h3 class="text-[16px] font-semibold text-highlighted dark:text-white">
                {{ track.name }}
              </h3>
            </div>

            <p class="max-w-[62ch] text-[14px] leading-relaxed text-neutral-500 dark:text-[#A3A3A3]">
              {{ track.description }}
            </p>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
