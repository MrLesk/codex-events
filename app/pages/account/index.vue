<script setup lang="ts">
import HackathonParticipationCard from '~/components/hackathons/HackathonParticipationCard.vue'

definePageMeta({
  layout: 'profile',
  middleware: ['require-platform-account']
})

const workspace = useHackathonParticipationWorkspace()

function isUpcomingHackathon(registrationOpensAt: string) {
  const startsAt = Date.parse(registrationOpensAt)

  if (Number.isNaN(startsAt)) {
    return false
  }

  return startsAt > Date.now()
}

const isLoading = computed(() =>
  workspace.status.value === 'idle' || workspace.status.value === 'pending'
)
const activeHackathons = computed(() =>
  workspace.currentHackathons.value.filter(record => !isUpcomingHackathon(record.hackathon.registrationOpensAt))
)
const upcomingHackathons = computed(() =>
  [...workspace.currentHackathons.value]
    .filter(record => isUpcomingHackathon(record.hackathon.registrationOpensAt))
    .sort((left, right) =>
      Date.parse(left.hackathon.registrationOpensAt) - Date.parse(right.hackathon.registrationOpensAt)
    )
)
const pastHackathons = computed(() => workspace.pastHackathons.value)
const hasHackathons = computed(() =>
  activeHackathons.value.length > 0
  || upcomingHackathons.value.length > 0
  || pastHackathons.value.length > 0
)

useSeoMeta({
  title: 'My Hackathons | Codex Hackathons',
  description: 'View the hackathons where you are participating now, returning soon, or have participated in before.'
})
</script>

<template>
  <div class="pb-14">
    <section class="border-b border-black/8 dark:border-white/[0.08]">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <div class="space-y-2 pb-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <p class="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
                Account workspace
              </p>
              <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
                My hackathons
              </h1>
              <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
                Pick up your current hackathons, keep track of upcoming ones, and revisit the ones you already finished.
              </p>
            </div>

            <AppButton
              to="/"
              color="neutral"
              variant="solid"
              class="h-auto rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
            >
              Explore hackathons
              <template #trailing>
                <AppIcon
                  name="i-lucide-arrow-up-right"
                  class="size-3.5"
                />
              </template>
            </AppButton>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="max-w-[68rem] space-y-8 pt-6">
      <AppAlert
        v-if="workspace.errorMessage.value"
        color="error"
        variant="soft"
        title="My hackathons are unavailable"
        :description="workspace.errorMessage.value"
      />

      <template v-else-if="isLoading">
        <div class="space-y-6">
          <div class="h-64 rounded-xl border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111]" />
          <div class="h-64 rounded-xl border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111]" />
        </div>
      </template>

      <section
        v-else-if="!hasHackathons"
        class="rounded-[1.75rem] border border-dashed border-black/10 bg-white px-6 py-16 text-center dark:border-white/[0.08] dark:bg-[#111111]"
      >
        <p class="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
          No hackathons yet
        </p>
        <h2 class="mt-3 text-[26px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
          Your workspace is empty
        </h2>
        <p class="mx-auto mt-3 max-w-2xl text-[15px] text-neutral-600 dark:text-[#A3A3A3]">
          Once you apply to or join a hackathon, it will appear here. Start by exploring the open hackathons on the public side of the platform.
        </p>
        <div class="mt-6 flex justify-center">
          <AppButton
            to="/"
            color="neutral"
            variant="solid"
            class="rounded-lg bg-black px-4 py-2 text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
          >
            Explore hackathons
          </AppButton>
        </div>
      </section>

      <template v-else>
        <section
          v-if="activeHackathons.length > 0"
          class="space-y-4"
        >
          <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
            <p class="text-[20px] font-medium text-highlighted dark:text-white">
              Active now
            </p>
            <p class="text-[14px] text-neutral-600 dark:text-[#A3A3A3]">
              Your current hackathons stay at the top so you can get back to work quickly.
            </p>
          </div>

          <div class="grid gap-5">
            <HackathonParticipationCard
              v-for="record in activeHackathons"
              :key="record.hackathon.id"
              :record="record"
            />
          </div>
        </section>

        <section
          v-if="upcomingHackathons.length > 0"
          class="space-y-4"
        >
          <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
            <p class="text-[20px] font-medium text-highlighted dark:text-white">
              Upcoming
            </p>
            <p class="text-[14px] text-neutral-600 dark:text-[#A3A3A3]">
              These hackathons are on your horizon next.
            </p>
          </div>

          <div class="grid gap-5">
            <HackathonParticipationCard
              v-for="record in upcomingHackathons"
              :key="record.hackathon.id"
              :record="record"
            />
          </div>
        </section>

        <section
          v-if="pastHackathons.length > 0"
          class="space-y-4"
        >
          <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
            <p class="text-[20px] font-medium text-highlighted dark:text-white">
              Past
            </p>
            <p class="text-[14px] text-neutral-600 dark:text-[#A3A3A3]">
              Revisit the hackathons you already completed.
            </p>
          </div>

          <div class="grid gap-5">
            <HackathonParticipationCard
              v-for="record in pastHackathons"
              :key="record.hackathon.id"
              :record="record"
            />
          </div>
        </section>
      </template>
    </AppContainer>
  </div>
</template>
