<script setup lang="ts">
import type { HackathonParticipationRecord } from '~/utils/hackathon-participation'

import HackathonParticipationCard from '~/components/hackathons/HackathonParticipationCard.vue'
import { buildAccountOnboardingHref, buildTermsOnboardingHref } from '~/utils/auth-navigation'
import { requireAuthNavigationGuard } from '~/utils/auth-guards'

definePageMeta({
  middleware: [requireAuthNavigationGuard]
})

interface WorkspaceActionCard {
  id: string
  title: string
  description: string
  to: string
  actionLabel: string
  icon: string
  color: 'primary' | 'warning' | 'success'
}

const {
  actor,
  hasAdminAccess,
  hasJudgeAccess,
  hasPrizeRecipientAccess,
  isResolvingActor,
  prizeRedemptionsErrorMessage,
  roleChips
} = useShellNavigation()
const participationWorkspace = useHackathonParticipationWorkspace()

const currentHackathons = computed(() => participationWorkspace.currentHackathons.value)
const pastHackathons = computed(() => participationWorkspace.pastHackathons.value)
const spotlightHackathons = computed(() => currentHackathons.value.slice(0, 2))
const hasMoreCurrentHackathons = computed(() => currentHackathons.value.length > spotlightHackathons.value.length)
const visibleRoleChips = computed(() => roleChips.value.filter(chip => chip !== 'Platform user'))

function resolveParticipationPrimaryAction(record: HackathonParticipationRecord) {
  const hackathonHref = `/hackathons/${record.hackathon.slug}`
  const teamsHref = `${hackathonHref}/teams`

  if (record.activeTeam) {
    return {
      label: 'Open team workspace',
      to: `${teamsHref}/${record.activeTeam.id}`,
      icon: 'i-lucide-arrow-right'
    }
  }

  if (record.application?.status === 'approved') {
    return {
      label: 'Browse teams',
      to: teamsHref,
      icon: 'i-lucide-arrow-right'
    }
  }

  return {
    label: 'Open hackathon',
    to: hackathonHref,
    icon: 'i-lucide-arrow-right'
  }
}

const heroDescription = computed(() => {
  if (actor.value.kind === 'authenticated_identity') {
    return 'Accept the current platform documents to unlock applications, teams, submissions, and participant workspaces.'
  }

  if (actor.value.onboardingState === 'profile_pending') {
    return 'Finish your platform profile so eligibility checks and participant workflows can use the right baseline.'
  }

  if (currentHackathons.value.length > 0) {
    return currentHackathons.value.length === 1
      ? 'You have one active hackathon in flight. Continue from the current application, team, or submission state below.'
      : `You have ${currentHackathons.value.length} active hackathons in flight. Continue from the current application, team, or submission state below.`
  }

  if (pastHackathons.value.length > 0) {
    return 'Your current workspace is quiet, but your participation history and role-specific workspaces remain available.'
  }

  if (hasAdminAccess.value && hasJudgeAccess.value) {
    return 'Your workspace is configured for participant activity as well as judge and admin responsibilities.'
  }

  if (hasAdminAccess.value) {
    return 'Your workspace is configured for program operations, participant oversight, and lifecycle controls.'
  }

  if (hasJudgeAccess.value) {
    return 'Your workspace is configured for blind judging and assignment review.'
  }

  return 'Your workspace is ready. Join a hackathon or return to previous participation history whenever you need it.'
})

const primaryAction = computed(() => {
  if (actor.value.kind === 'authenticated_identity') {
    return {
      label: 'Accept platform documents',
      to: buildTermsOnboardingHref('/dashboard'),
      icon: 'i-lucide-file-check'
    }
  }

  if (actor.value.onboardingState === 'profile_pending') {
    return {
      label: 'Finish profile setup',
      to: buildAccountOnboardingHref('/dashboard'),
      icon: 'i-lucide-user-round-pen'
    }
  }

  if (currentHackathons.value.length > 0) {
    return resolveParticipationPrimaryAction(currentHackathons.value[0]!)
  }

  return {
    label: 'Browse public hackathons',
    to: '/',
    icon: 'i-lucide-arrow-up-right'
  }
})

const summaryRows = computed(() => {
  const workspaceAccess: string[] = ['Hackathons']

  if (hasJudgeAccess.value) {
    workspaceAccess.push('Judging')
  }

  if (hasAdminAccess.value) {
    workspaceAccess.push('Admin')
  }

  if (hasPrizeRecipientAccess.value) {
    workspaceAccess.push('Prize redemptions')
  }

  return [{
    label: 'Current programs',
    value: String(currentHackathons.value.length)
  }, {
    label: 'Past programs',
    value: String(pastHackathons.value.length)
  }, {
    label: 'Workspace access',
    value: workspaceAccess.join(', ')
  }]
})

const workspaceActions = computed<WorkspaceActionCard[]>(() => {
  const actions: WorkspaceActionCard[] = []

  if (hasJudgeAccess.value) {
    actions.push({
      id: 'judge',
      title: 'Judging assignments',
      description: 'Continue blind review work and monitor assignment progress.',
      to: '/judging',
      actionLabel: 'Open judging',
      icon: 'i-lucide-scale',
      color: 'warning'
    })
  }

  if (hasAdminAccess.value) {
    actions.push({
      id: 'admin',
      title: 'Admin operations',
      description: 'Manage lifecycle transitions, setup, and participant oversight.',
      to: '/admin',
      actionLabel: 'Open admin',
      icon: 'i-lucide-shield-check',
      color: 'primary'
    })
  }

  if (hasPrizeRecipientAccess.value) {
    actions.push({
      id: 'prizes',
      title: 'Prize redemptions',
      description: 'Resolve winner-facing redemption steps from recent results.',
      to: '/prize-redemptions',
      actionLabel: 'Review redemptions',
      icon: 'i-lucide-gift',
      color: 'success'
    })
  }

  return actions
})

const participationSectionTitle = computed(() => currentHackathons.value.length > 0 ? 'Current Participation' : 'Participation')
const participationSectionDescription = computed(() => {
  if (currentHackathons.value.length > 0) {
    return 'Continue from the program states that are active right now. Use the dedicated hackathons page for your full history.'
  }

  if (pastHackathons.value.length > 0) {
    return 'No active programs are attached to this account right now. Past participation remains available from your hackathons workspace.'
  }

  return 'This account does not have hackathon participation yet.'
})

const emptyParticipationMessage = computed(() => pastHackathons.value.length > 0
  ? 'Your past participation is still available from the hackathons workspace.'
  : 'Join a public hackathon to start tracking applications, teams, and submissions here.'
)

useSeoMeta({
  title: 'Dashboard | Codex Hackathons',
  description: 'Role-aware entry hub for current participation and specialized workspaces.'
})
</script>

<template>
  <div class="pb-14">
    <section class="border-b border-black/8 dark:border-white/[0.08]">
      <div class="space-y-2 pb-4">
        <div
          v-if="visibleRoleChips.length > 0"
          class="flex flex-wrap gap-2"
        >
          <AppBadge
            v-for="chip in visibleRoleChips"
            :key="chip"
            color="primary"
            variant="soft"
            class="rounded-full px-3 py-1 font-semibold tracking-[0.16em] uppercase"
          >
            {{ chip }}
          </AppBadge>
        </div>

        <div class="flex flex-wrap items-end justify-between gap-5">
          <div class="space-y-2">
            <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              Dashboard
            </h1>
            <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
              {{ heroDescription }}
            </p>
          </div>

          <AppButton
            color="neutral"
            variant="solid"
            :to="primaryAction.to"
            class="h-auto rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
          >
            {{ primaryAction.label }}
            <template #trailing>
              <AppIcon
                :name="primaryAction.icon"
                class="size-3.5"
              />
            </template>
          </AppButton>
        </div>
      </div>
    </section>

    <div class="space-y-8 pt-6">
      <AppAlert
        v-if="isResolvingActor"
        color="primary"
        variant="soft"
        icon="i-lucide-loader-circle"
        title="Preparing your workspace"
        description="Loading role access and participant state for this authenticated identity."
      />

      <section
        v-else
        class="space-y-6"
      >
        <div class="grid gap-3 sm:grid-cols-3">
          <div
            v-for="row in summaryRows"
            :key="row.label"
            class="rounded-xl border border-black/8 bg-[#F7F7F8] p-6 dark:border-white/[0.08] dark:bg-[#171717]"
          >
            <p class="text-[11px] font-semibold tracking-[0.16em] text-neutral-500 uppercase dark:text-[#A3A3A3]">
              {{ row.label }}
            </p>
            <p class="mt-3 text-[30px] leading-none font-semibold tracking-[-0.03em] text-highlighted dark:text-white">
              {{ row.value }}
            </p>
          </div>
        </div>
      </section>

      <section class="space-y-6">
        <div class="flex items-center justify-between border-b border-black/8 pb-4 dark:border-white/[0.08]">
          <div>
            <h2 class="text-[24px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              {{ participationSectionTitle }}
            </h2>
            <p class="mt-1 text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
              {{ participationSectionDescription }}
            </p>
          </div>
          <AppButton
            v-if="currentHackathons.length > 0 || pastHackathons.length > 0"
            to="/hackathons"
            color="neutral"
            variant="ghost"
            class="rounded-lg"
            label="Open all hackathons"
            trailing-icon="i-lucide-arrow-right"
          />
        </div>

        <AppAlert
          v-if="participationWorkspace.errorMessage.value"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Participation status unavailable"
          :description="participationWorkspace.errorMessage.value"
          class="mb-6"
        />

        <div
          v-if="participationWorkspace.status.value === 'idle' || participationWorkspace.status.value === 'pending'"
          class="grid gap-6 xl:grid-cols-2"
        >
          <div class="h-72 rounded-xl border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111]" />
          <div class="h-72 rounded-xl border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111]" />
        </div>

        <div
          v-else-if="spotlightHackathons.length > 0"
          class="space-y-6"
        >
          <div class="grid gap-6">
            <HackathonParticipationCard
              v-for="record in spotlightHackathons"
              :key="record.hackathon.id"
              :record="record"
            />
          </div>

          <AppAlert
            v-if="hasMoreCurrentHackathons"
            color="info"
            variant="soft"
            icon="i-lucide-sparkles"
            :title="`${currentHackathons.length - spotlightHackathons.length} more active program${currentHackathons.length - spotlightHackathons.length === 1 ? '' : 's'} available`"
            description="Use the hackathons workspace to review the rest of your current participation history."
          />
        </div>

        <AppCard
          v-else
          variant="subtle"
          :ui="{ root: 'rounded-xl border border-dashed border-black/10 bg-white dark:border-white/[0.08] dark:bg-[#111111]' }"
        >
          <div class="space-y-4 p-6 text-center sm:text-left">
            <div class="mx-auto flex size-14 items-center justify-center rounded-full border border-black/8 bg-[#F7F7F8] text-primary sm:mx-0 dark:border-white/[0.08] dark:bg-[#171717]">
              <AppIcon
                name="i-lucide-sparkles"
                class="size-5"
              />
            </div>
            <div class="space-y-2">
              <p class="text-lg font-semibold text-highlighted">
                No active hackathons yet
              </p>
              <p class="text-sm leading-7 text-toned">
                {{ emptyParticipationMessage }}
              </p>
            </div>
            <div class="flex flex-wrap justify-center gap-3 sm:justify-start">
              <AppButton
                to="/"
                color="neutral"
                variant="solid"
                class="rounded-lg bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                label="Browse public hackathons"
                trailing-icon="i-lucide-arrow-up-right"
              />
              <AppButton
                v-if="pastHackathons.length > 0"
                to="/hackathons"
                color="neutral"
                variant="ghost"
                class="rounded-lg"
                label="View participation history"
              />
            </div>
          </div>
        </AppCard>
      </section>

      <section
        v-if="workspaceActions.length > 0 || prizeRedemptionsErrorMessage"
        class="space-y-6"
      >
        <div class="border-b border-black/8 pb-4 dark:border-white/[0.08]">
          <h2 class="text-[24px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
            Role-specific work
          </h2>
          <p class="mt-1 text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
            These areas appear only when this account has responsibilities beyond participant workflows.
          </p>
        </div>

        <AppAlert
          v-if="prizeRedemptionsErrorMessage"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Prize redemption status unavailable"
          :description="prizeRedemptionsErrorMessage"
          class="mb-6"
        />

        <div
          v-if="workspaceActions.length > 0"
          class="grid gap-6 xl:grid-cols-3"
        >
          <div
            v-for="item in workspaceActions"
            :key="item.id"
            class="rounded-xl border border-black/8 bg-white p-6 dark:border-white/[0.08] dark:bg-[#111111]"
          >
            <div class="space-y-5">
              <div class="flex items-start justify-between gap-4">
                <div class="space-y-2">
                  <p class="text-[18px] font-medium text-highlighted dark:text-white">
                    {{ item.title }}
                  </p>
                  <p class="text-[14px] leading-relaxed text-neutral-500 dark:text-[#A3A3A3]">
                    {{ item.description }}
                  </p>
                </div>

                <div class="flex size-10 shrink-0 items-center justify-center rounded-full border border-black/8 bg-[#F7F7F8] text-primary dark:border-white/[0.08] dark:bg-[#171717]">
                  <AppIcon
                    :name="item.icon"
                    class="size-4"
                  />
                </div>
              </div>

              <AppButton
                :to="item.to"
                color="neutral"
                variant="solid"
                class="rounded-lg bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
                :label="item.actionLabel"
                trailing-icon="i-lucide-arrow-up-right"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
