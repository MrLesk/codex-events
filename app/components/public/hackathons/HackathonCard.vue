<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'

import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'

const props = defineProps<{
  hackathon: PublicHackathon
}>()

const heroImage = computed(() => {
  const bannerImageUrl = props.hackathon.bannerImageUrl?.trim()

  if (bannerImageUrl) {
    return bannerImageUrl
  }

  const backgroundImageUrl = props.hackathon.backgroundImageUrl?.trim()

  return backgroundImageUrl || null
})
const earliestStartAt = computed(() => getHackathonEarliestStartAt(props.hackathon))
const timelineDateLabel = computed(() => formatHackathonCompactDate(earliestStartAt.value))
const hackathonDayLabel = computed(() => formatHackathonDateWithWeekday(earliestStartAt.value))
const locationLabel = computed(() => formatHackathonLocation(props.hackathon))
const registrationOpensAtTimestamp = computed(() => new Date(props.hackathon.registrationOpensAt).getTime())
const registrationClosesAtTimestamp = computed(() => new Date(props.hackathon.registrationClosesAt).getTime())
const isRegistrationOpen = computed(() => {
  const now = Date.now()
  return now >= registrationOpensAtTimestamp.value && now <= registrationClosesAtTimestamp.value
})
const ctaLabel = computed(() => {
  if (props.hackathon.state === 'completed') {
    return 'View outcomes'
  }

  return isRegistrationOpen.value ? 'Discover' : 'View details'
})
</script>

<template>
  <div class="relative">
    <div class="absolute left-[-10px] top-5 hidden h-5 w-5 rounded-full border-4 border-background bg-neutral-500 dark:bg-[#A3A3A3] lg:block" />

    <div class="absolute left-[-66px] top-[22px] hidden text-[12px] font-medium leading-none text-neutral-500 dark:text-[#8C8C8C] lg:block">
      {{ timelineDateLabel }}
    </div>

    <NuxtLink
      :to="`/hackathons/${hackathon.slug}`"
      class="group block lg:ml-8"
      :data-testid="`public-hackathon-card-${hackathon.slug}`"
    >
      <div class="app-surface-panel overflow-hidden rounded-3xl transition-colors group-hover:border-black/20 dark:group-hover:border-white/[0.2]">
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
            <HackathonStateBadge
              :state="hackathon.state"
              :registration-opens-at="hackathon.registrationOpensAt"
              :registration-closes-at="hackathon.registrationClosesAt"
              class="border border-white/25 bg-black/55 text-white backdrop-blur-md dark:border-white/25 dark:bg-black/55 dark:text-white"
            />
          </div>

          <div class="absolute bottom-8 left-6 z-20">
            <h2 class="text-[32px] font-semibold tracking-[-0.01em] text-white">
              {{ hackathon.name }}
            </h2>
          </div>
        </div>

        <div class="app-surface-panel-elevated flex flex-col gap-5 rounded-none border-0 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="mb-1 text-[15px] font-medium text-highlighted dark:text-white">
              {{ hackathonDayLabel }}
            </p>
            <p class="mt-1 text-[13px] text-neutral-500 dark:text-[#A3A3A3]">
              {{ locationLabel }}
            </p>
          </div>

          <div class="flex items-center gap-3">
            <div class="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]">
              {{ ctaLabel }}
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
