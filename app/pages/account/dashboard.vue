<script setup lang="ts">
import HackathonParticipationCard from '~/components/hackathons/HackathonParticipationCard.vue'
import {
  canCreateHackathon,
  formatHackathonState,
  getHackathonStateColor
} from '~/utils/admin-workspace'

definePageMeta({
  layout: 'profile',
  middleware: ['require-auth']
})

interface WorkspaceLink {
  id: string
  label: string
  description: string
  to: string
}

const workspace = useHackathonParticipationWorkspace()
const adminWorkspace = useAdminWorkspace()
const {
  hasAdminAccess,
  hasJudgeAccess,
  hasPrizeRecipientAccess
} = useShellNavigation()

const isLoading = computed(() =>
  workspace.status.value === 'idle' || workspace.status.value === 'pending'
)
const hasParticipation = computed(() =>
  workspace.currentHackathons.value.length > 0 || workspace.pastHackathons.value.length > 0
)
const manageableHackathons = computed(() => adminWorkspace.manageableHackathons.value)
const canCreateManagedHackathons = computed(() => canCreateHackathon(adminWorkspace.actor.value))
const activeOperationsCount = computed(() =>
  manageableHackathons.value.filter(hackathon => hackathon.state !== 'draft' && hackathon.state !== 'completed').length
)
const judgingFlowCount = computed(() =>
  manageableHackathons.value.filter(hackathon =>
    ['judging_preparation', 'judge_review', 'shortlist'].includes(hackathon.state)
  ).length
)
const draftCount = computed(() =>
  manageableHackathons.value.filter(hackathon => hackathon.state === 'draft').length
)
const recentManageableHackathons = computed(() =>
  [...manageableHackathons.value]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, 3)
)
const isAdminSummaryLoading = computed(() => hasAdminAccess.value
  && (adminWorkspace.session.status.value === 'pending' || adminWorkspace.hackathons.status.value === 'pending'))
const adminSummaryErrorMessage = computed(() => {
  if (!hasAdminAccess.value) {
    return ''
  }

  return adminWorkspace.hackathons.error.value?.statusMessage
    ?? adminWorkspace.hackathons.error.value?.message
    ?? adminWorkspace.session.error.value?.statusMessage
    ?? adminWorkspace.session.error.value?.message
    ?? ''
})

const workspaceLinks = computed<WorkspaceLink[]>(() => {
  const links: WorkspaceLink[] = []

  if (hasJudgeAccess.value) {
    links.push({
      id: 'judge',
      label: 'Judge workspace',
      description: 'Review submissions assigned to you.',
      to: '/account/judging'
    })
  }

  if (hasAdminAccess.value) {
    links.push({
      id: 'admin',
      label: 'Admin operations',
      description: 'Run setup, scheduling, and operations.',
      to: '/account/admin'
    })
  }

  if (hasPrizeRecipientAccess.value) {
    links.push({
      id: 'prizes',
      label: 'Prize redemptions',
      description: 'Process winner redemption requests.',
      to: '/prize-redemptions'
    })
  }

  return links
})

useSeoMeta({
  title: 'Account Dashboard | Codex Hackathons',
  description: 'See your active and past hackathons, then jump into the tools tied to your account.'
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
                Dashboard
              </h1>
              <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
                See your active hackathons, revisit past ones, and jump into the tools you need.
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
      <section
        v-if="workspaceLinks.length > 0"
        class="space-y-4"
      >
        <div class="border-b border-black/8 pb-3 dark:border-white/[0.08]">
          <p class="text-[20px] font-medium text-highlighted dark:text-white">
            Specialized workspaces
          </p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <NuxtLink
            v-for="workspaceLink in workspaceLinks"
            :key="workspaceLink.id"
            :to="workspaceLink.to"
            class="rounded-xl border border-black/8 bg-white p-4 transition-colors hover:border-black/20 dark:border-white/[0.08] dark:bg-[#111111] dark:hover:border-white/[0.2]"
          >
            <p class="text-[15px] font-semibold text-highlighted dark:text-white">
              {{ workspaceLink.label }}
            </p>
            <p class="mt-1 text-[13px] text-muted">
              {{ workspaceLink.description }}
            </p>
          </NuxtLink>
        </div>
      </section>

      <section
        v-if="hasAdminAccess"
        class="space-y-4"
      >
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 pb-3 dark:border-white/[0.08]">
          <p class="text-[20px] font-medium text-highlighted dark:text-white">
            Admin at a glance
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <AppButton
              to="/account/admin"
              color="neutral"
              variant="soft"
              class="rounded-lg px-3 py-1.5 text-[13px] font-medium"
            >
              Open admin workspace
            </AppButton>
            <AppButton
              v-if="canCreateManagedHackathons"
              to="/admin/hackathons/new"
              color="neutral"
              variant="solid"
              class="rounded-lg px-3 py-1.5 text-[13px] font-medium"
            >
              Create hackathon
            </AppButton>
          </div>
        </div>

        <AppAlert
          v-if="adminSummaryErrorMessage"
          color="error"
          variant="soft"
          title="Admin overview unavailable"
          :description="adminSummaryErrorMessage"
        />

        <AppAlert
          v-else-if="isAdminSummaryLoading"
          color="neutral"
          variant="soft"
          title="Loading admin overview"
          description="Fetching your manageable hackathons."
        />

        <template v-else>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
              <p class="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
                Manageable hackathons
              </p>
              <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
                {{ manageableHackathons.length }}
              </p>
            </div>

            <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
              <p class="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
                Active operations
              </p>
              <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
                {{ activeOperationsCount }}
              </p>
            </div>

            <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
              <p class="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
                In judging flow
              </p>
              <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
                {{ judgingFlowCount }}
              </p>
              <p class="mt-2 text-[12px] text-muted">
                {{ draftCount }} drafts still in setup
              </p>
            </div>
          </div>

          <div
            v-if="recentManageableHackathons.length === 0"
            class="rounded-xl border border-dashed border-black/10 bg-white p-6 text-center dark:border-white/[0.08] dark:bg-[#111111]"
          >
            <p class="text-[15px] font-medium text-highlighted dark:text-white">
              No manageable hackathons yet
            </p>
            <p class="mt-2 text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
              Create your first hackathon to start operating the platform.
            </p>
          </div>

          <div
            v-else
            class="grid gap-3"
          >
            <NuxtLink
              v-for="hackathon in recentManageableHackathons"
              :key="hackathon.id"
              :to="`/account/hackathons/${hackathon.slug}/admin`"
              class="rounded-xl border border-black/8 bg-white p-4 transition-colors hover:border-black/20 dark:border-white/[0.08] dark:bg-[#111111] dark:hover:border-white/[0.2]"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-[15px] font-semibold text-highlighted dark:text-white">
                  {{ hackathon.name }}
                </p>
                <AppBadge
                  :color="getHackathonStateColor(hackathon.state)"
                  variant="soft"
                  class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                >
                  {{ formatHackathonState(hackathon.state) }}
                </AppBadge>
              </div>
              <p class="mt-2 text-[12px] text-muted">
                {{ hackathon.city }} · {{ hackathon.maxTeamMembers }} max/team
              </p>
            </NuxtLink>
          </div>
        </template>
      </section>

      <AppAlert
        v-if="workspace.errorMessage.value"
        color="error"
        variant="soft"
        title="Hackathon participation unavailable"
        :description="workspace.errorMessage.value"
      />

      <AppAlert
        v-else-if="isLoading"
        color="neutral"
        variant="soft"
        title="Loading your hackathon activity"
        description="This only takes a moment."
      />

      <template v-else>
        <div
          v-if="!hasParticipation"
          class="rounded-xl border border-dashed border-black/10 bg-white p-10 text-center dark:border-white/[0.08] dark:bg-[#111111]"
        >
          <p class="text-[11px] font-semibold tracking-[0.18em] text-muted uppercase">
            Participant workspace
          </p>
          <p class="mt-3 text-lg font-semibold text-highlighted dark:text-white">
            No hackathons yet
          </p>
          <p class="mt-2 text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
            Join a hackathon and your activity will appear here.
          </p>
        </div>

        <section
          v-if="workspace.currentHackathons.value.length > 0"
          class="space-y-5"
        >
          <div class="flex items-center justify-between border-b border-black/8 pb-3 dark:border-white/[0.08]">
            <h2 class="text-[24px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              Current
            </h2>
            <AppBadge
              color="primary"
              variant="soft"
              class="rounded-full px-3 py-1 font-semibold"
            >
              {{ workspace.currentHackathons.value.length }}
            </AppBadge>
          </div>

          <div class="grid gap-6">
            <HackathonParticipationCard
              v-for="record in workspace.currentHackathons.value"
              :key="record.hackathon.id"
              :record="record"
            />
          </div>
        </section>

        <section
          v-if="workspace.pastHackathons.value.length > 0"
          class="space-y-5"
        >
          <div class="flex items-center justify-between border-b border-black/8 pb-3 dark:border-white/[0.08]">
            <h2 class="text-[24px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              Past
            </h2>
            <AppBadge
              color="neutral"
              variant="soft"
              class="rounded-full px-3 py-1 font-semibold"
            >
              {{ workspace.pastHackathons.value.length }}
            </AppBadge>
          </div>

          <div class="grid gap-6">
            <HackathonParticipationCard
              v-for="record in workspace.pastHackathons.value"
              :key="record.hackathon.id"
              :record="record"
            />
          </div>
        </section>
      </template>
    </AppContainer>
  </div>
</template>
