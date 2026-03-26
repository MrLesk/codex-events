<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'

const props = defineProps<{
  hackathon: PublicHackathon
}>()

const heroImage = computed(() => props.hackathon.bannerImageUrl ?? props.hackathon.backgroundImageUrl)
const timelineDateLabel = computed(() => formatHackathonCompactDate(props.hackathon.registrationOpensAt))
const statusLabel = computed(() => {
  if (props.hackathon.state === 'completed') {
    return 'Past'
  }

  if (new Date(props.hackathon.registrationOpensAt).getTime() > Date.now()) {
    return `Upcoming · ${timelineDateLabel.value}`
  }

  return 'Active now'
})
const programDateLabel = computed(() =>
  formatHackathonWindow(props.hackathon.registrationOpensAt, props.hackathon.submissionClosesAt)
)
const locationLabel = computed(() => [props.hackathon.city, props.hackathon.address].filter(Boolean).join(' • '))
</script>

<template>
  <div class="relative">
    <div class="absolute bottom-0 left-0 top-0 hidden w-px bg-black/10 dark:bg-white/[0.08] lg:block" />
    <div class="absolute left-[-5px] top-6 hidden h-2 w-2 rounded-full border-2 border-background bg-neutral-500 dark:bg-[#8C8C8C] lg:block" />

    <div class="absolute left-[-66px] top-4 hidden text-[12px] font-medium text-neutral-500 dark:text-[#8C8C8C] lg:block">
      {{ timelineDateLabel }}
    </div>

    <NuxtLink
      :to="`/hackathons/${hackathon.slug}`"
      class="group block lg:ml-8"
      :data-testid="`public-hackathon-card-${hackathon.slug}`"
    >
      <div class="overflow-hidden rounded-3xl border border-black/8 bg-white transition-colors group-hover:border-black/20 dark:border-white/[0.08] dark:bg-[#111111] dark:group-hover:border-white/[0.2]">
        <div class="relative h-[300px] overflow-hidden md:h-[340px]">
          <div class="absolute inset-0 z-10 bg-gradient-to-b from-black/20 via-black/30 to-black/65 transition-colors group-hover:from-black/15 group-hover:to-black/55 dark:from-black/25 dark:via-black/35 dark:to-black/72" />
          <img
            v-if="heroImage"
            :src="heroImage"
            :alt="hackathon.name"
            class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          >
          <div
            v-else
            class="h-full w-full bg-neutral-200 dark:bg-[#1A1A1A]"
          />

          <div class="absolute left-6 top-6 z-20 flex flex-wrap gap-2">
            <span class="rounded-full border border-white/25 bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
              {{ statusLabel }}
            </span>
            <span class="rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
              Codex hackathon
            </span>
          </div>

          <div class="absolute bottom-8 left-6 z-20">
            <div
              class="mb-3 inline-flex rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[11px] font-medium text-white/85 backdrop-blur-md"
            >
              Up to {{ hackathon.maxTeamMembers }}
            </div>
            <h2 class="text-[32px] font-semibold tracking-[-0.01em] text-white">
              {{ hackathon.city }}
            </h2>
          </div>
        </div>

        <div class="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="mb-1 text-[15px] font-medium text-highlighted dark:text-white">
              {{ programDateLabel }}
            </p>
            <p class="text-[13px] text-neutral-500 dark:text-[#A3A3A3]">
              {{ hackathon.name }}
            </p>
            <p class="mt-1 text-[13px] text-neutral-500 dark:text-[#A3A3A3]">
              {{ locationLabel }}
            </p>
          </div>

          <div class="flex items-center gap-3">
            <div class="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]">
              Register now
              <AppIcon
                name="i-lucide-arrow-up-right"
                class="size-3.5"
              />
            </div>
          </div>
        </div>
      </div>
    </NuxtLink>
  </div>
</template>
