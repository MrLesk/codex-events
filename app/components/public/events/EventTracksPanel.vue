<script setup lang="ts">
import type { PublicEventTrack, PublicEventType } from '~/domains/events/presentation'

const props = defineProps<{
  eventType: PublicEventType
  tracks: PublicEventTrack[]
}>()

const sortedTracks = computed(() =>
  [...props.tracks].sort((left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name))
)
const hasFullTrackDetails = computed(() =>
  sortedTracks.value.some(track =>
    normalizedText(track.fullDescription) || sortedResources(track).length > 0
  )
)
const panelDescription = computed(() => {
  if (hasFullTrackDetails.value) {
    return 'Review the track guidelines and resources for this event.'
  }

  if (props.eventType === 'hackathon') {
    return 'Participants choose one track for their project.'
  }

  return 'Review the available tracks for this event.'
})

function normalizedText(value: string | null | undefined) {
  return value?.trim() ?? ''
}

function sortedResources(track: PublicEventTrack) {
  return [...(track.resources ?? [])].sort((left, right) =>
    left.displayOrder - right.displayOrder || left.title.localeCompare(right.title)
  )
}
</script>

<template>
  <section
    v-if="sortedTracks.length > 0"
    class="!border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60 relative overflow-hidden rounded-[1.75rem] p-5 sm:p-7"
    data-testid="public-event-tracks"
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
          {{ panelDescription }}
        </p>
      </div>
    </div>

    <div class="divide-y divide-black/8 dark:divide-white/[0.08]">
      <article
        v-for="track in sortedTracks"
        :key="track.displayOrder"
        class="py-5 first:pt-0 last:pb-0"
      >
        <details
          open
          class="group"
        >
          <summary class="list-none cursor-pointer">
            <div class="sm:flex sm:items-start sm:gap-4">
              <div class="hidden w-20 shrink-0 items-start justify-center pt-0.5 sm:flex">
                <span class="flex size-11 items-center justify-center rounded-full border border-black/8 bg-white/80 text-sky-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-sky-300">
                  <AppIcon
                    name="i-lucide-arrow-right"
                    class="size-4"
                  />
                </span>
              </div>

              <div class="flex min-w-0 flex-1 items-center justify-between gap-3">
                <div class="flex min-w-0 items-center gap-2">
                  <AppIcon
                    name="i-lucide-arrow-right"
                    class="size-3.5 shrink-0 text-sky-700 dark:text-sky-300 sm:hidden"
                    aria-hidden="true"
                  />
                  <h3 class="min-w-0 text-[16px] font-semibold text-highlighted dark:text-white">
                    {{ track.name }}
                  </h3>
                </div>
                <AppIcon
                  name="i-lucide-chevron-down"
                  class="size-4 shrink-0 text-neutral-500 transition-transform group-open:rotate-180 dark:text-[#A3A3A3]"
                />
              </div>
            </div>
          </summary>

          <div class="mt-2 min-w-0 space-y-2 sm:ml-24">
            <AppMarkdownRenderer
              :source="track.shortDescription"
              class="max-w-[62ch]"
            />

            <div
              v-if="normalizedText(track.fullDescription) || sortedResources(track).length > 0"
              class="mt-5 space-y-5 border-t border-black/8 pt-5 dark:border-white/[0.08]"
            >
              <AppMarkdownRenderer
                v-if="normalizedText(track.fullDescription)"
                :source="track.fullDescription ?? ''"
                class="max-w-[72ch]"
              />

              <div
                v-if="sortedResources(track).length > 0"
                class="grid gap-3"
              >
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Resources
                </p>

                <div class="flex flex-wrap gap-2">
                  <a
                    v-for="resource in sortedResources(track)"
                    :key="`${track.displayOrder}-${resource.displayOrder}-${resource.title}`"
                    :href="resource.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex max-w-full items-center gap-2 rounded-lg border border-black/8 bg-white/78 px-3 py-2 text-[13px] font-medium text-highlighted transition hover:border-sky-500/40 hover:text-sky-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:hover:border-sky-300/35 dark:hover:text-sky-200"
                  >
                    <AppIcon
                      name="i-lucide-link"
                      class="size-3.5 shrink-0 text-sky-700 dark:text-sky-300"
                    />
                    <span class="min-w-0 truncate">
                      {{ resource.title }}
                    </span>
                    <AppIcon
                      name="i-lucide-external-link"
                      class="size-3 shrink-0 text-neutral-500 dark:text-[#A3A3A3]"
                    />
                  </a>
                </div>

                <div
                  v-if="sortedResources(track).some(resource => resource.description)"
                  class="grid gap-2"
                >
                  <p
                    v-for="resource in sortedResources(track).filter(item => item.description)"
                    :key="`${track.displayOrder}-${resource.displayOrder}-description`"
                    class="text-[13px] leading-relaxed text-neutral-500 dark:text-[#A3A3A3]"
                  >
                    <span class="font-medium text-toned">{{ resource.title }}:</span>
                    {{ resource.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </details>
      </article>
    </div>
  </section>
</template>
