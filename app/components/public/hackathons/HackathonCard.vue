<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'

const props = defineProps<{
  hackathon: PublicHackathon
}>()

const heroImage = computed(() => props.hackathon.bannerImageUrl ?? props.hackathon.backgroundImageUrl)
const requiredProfiles = computed(() => listRequiredProfiles(props.hackathon))
const displayStatus = computed(() => {
  if (props.hackathon.state === 'completed') {
    return 'PAST'
  }

  if (new Date(props.hackathon.registrationOpensAt).getTime() > Date.now()) {
    return 'UPCOMING'
  }

  return 'ACTIVE'
})
const timelineTags = computed(() => {
  const tags = []

  if (requiredProfiles.value.length > 0) {
    tags.push(...requiredProfiles.value.map(profile => `${profile}`))
  }

  tags.push(`Up to ${props.hackathon.maxTeamMembers}`)

  return tags.slice(0, 3)
})
const programDateLabel = computed(() =>
  formatHackathonWindow(props.hackathon.registrationOpensAt, props.hackathon.submissionClosesAt)
)
</script>

<template>
  <div class="relative">
    <div class="absolute bottom-0 left-0 top-0 hidden w-px bg-white/[0.08] lg:block" />
    <div class="absolute left-[-5px] top-6 hidden h-2 w-2 rounded-full border-2 border-black bg-[#8C8C8C] lg:block" />

    <div class="absolute left-[-78px] top-5 hidden text-[11px] font-bold tracking-widest text-[#8C8C8C] uppercase lg:block">
      {{ displayStatus }}
    </div>

    <NuxtLink
      :to="`/hackathons/${hackathon.slug}`"
      class="group block lg:ml-8"
      :data-testid="`public-hackathon-card-${hackathon.slug}`"
    >
      <div class="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111111] transition-colors group-hover:border-white/[0.2]">
        <div class="relative h-[240px] overflow-hidden">
          <div class="absolute inset-0 z-10 bg-black/20 transition-colors group-hover:bg-black/5" />
          <img
            v-if="heroImage"
            :src="heroImage"
            :alt="hackathon.name"
            class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          >
          <div
            v-else
            class="h-full w-full bg-[linear-gradient(135deg,#2d3b68_0%,#523a77_34%,#246b76_68%,#233f7a_100%)]"
          />

          <div class="absolute bottom-6 left-6 z-20">
            <div
              v-if="timelineTags.length > 0"
              class="mb-3 flex flex-wrap gap-2"
            >
              <span
                v-for="tag in timelineTags"
                :key="tag"
                class="rounded bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-md border border-white/10"
              >
                {{ tag }}
              </span>
            </div>
            <h2 class="text-[28px] font-semibold tracking-[-0.01em] text-white">
              {{ hackathon.name }}
            </h2>
          </div>
        </div>

        <div class="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="mb-1 text-[15px] font-medium text-white">
              {{ programDateLabel }}
            </p>
            <p class="text-[13px] text-[#A3A3A3]">
              {{ hackathon.city }} • {{ hackathon.address }}
            </p>
          </div>

          <div class="flex items-center gap-3">
            <div class="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black transition-colors hover:bg-[#ECECEC]">
              Register
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
