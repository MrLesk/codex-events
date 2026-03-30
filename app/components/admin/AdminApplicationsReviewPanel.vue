<script setup lang="ts">
import type { AdminApplicationRecord } from '~/utils/admin-workspace'
import type {
  AdminApplicationReviewGroup,
  AdminApplicationReviewPendingTeammate,
  AdminApplicationReviewView
} from '~/utils/admin-application-review'

import {
  buildAdminApplicationReviewGroups,
  filterAdminApplicationReviewGroups
} from '~/utils/admin-application-review'
import { parseProofOfExecutionLinks } from '~/utils/participant-application'
import {
  getApplicationStatusColor
} from '~/utils/admin-workspace'

const props = defineProps<{
  applications: AdminApplicationRecord[]
  view: AdminApplicationReviewView
  isLoading?: boolean
  errorMessage?: string
  pendingActionKey?: string | null
  readOnly?: boolean
}>()

const emit = defineEmits<{
  approve: [application: AdminApplicationRecord]
  approveTeam: [applications: AdminApplicationRecord[]]
  reject: [application: AdminApplicationRecord]
  saveDecisions: []
}>()

const stagedCount = computed(() =>
  props.applications.filter(application => application.status === 'submitted' && Boolean(application.preApprovalStatus)).length
)
const whyThisHackathonPreviewCharacterLimit = 280
const proofLinksPreviewCount = 2
const expandedApplicationSectionKeys = ref(new Set<string>())
const applicationReviewGroups = computed(() =>
  filterAdminApplicationReviewGroups(
    buildAdminApplicationReviewGroups(props.applications),
    props.view
  )
)

function getApplicationSectionKey(applicationId: string, section: 'motivation' | 'proof') {
  return `${applicationId}:${section}`
}

function isApplicationSectionExpanded(sectionKey: string) {
  return expandedApplicationSectionKeys.value.has(sectionKey)
}

function toggleApplicationSection(sectionKey: string) {
  const nextExpandedKeys = new Set(expandedApplicationSectionKeys.value)

  if (nextExpandedKeys.has(sectionKey)) {
    nextExpandedKeys.delete(sectionKey)
  } else {
    nextExpandedKeys.add(sectionKey)
  }

  expandedApplicationSectionKeys.value = nextExpandedKeys
}

function stageDecisionActionKey(applicationId: string, decision: 'approved' | 'rejected') {
  return `stage:${decision}:${applicationId}`
}

function stageGroupApprovalActionKey(group: AdminApplicationReviewGroup) {
  const sortedApplicationIds = group.applicants
    .map(applicant => applicant.application.id)
    .sort((left, right) => left.localeCompare(right))

  return `stage:approved-team:${sortedApplicationIds.join('__')}`
}

function formatPendingTeammateLabel(pendingTeammate: AdminApplicationReviewPendingTeammate) {
  return pendingTeammate.fullName ?? pendingTeammate.email ?? 'Unnamed teammate hint'
}

function canApproveTeam(group: AdminApplicationReviewGroup) {
  return group.applicants.length > 1 || group.pendingTeammates.length > 0
}

function hasGroupApprovalSelected(group: AdminApplicationReviewGroup) {
  return canApproveTeam(group)
    && group.applicants.every(applicant => applicant.application.preApprovalStatus === 'approved')
}

function hasApplicantApprovalSelected(applicant: AdminApplicationReviewGroup['applicants'][number], group: AdminApplicationReviewGroup) {
  return applicant.application.preApprovalStatus === 'approved' && !hasGroupApprovalSelected(group)
}

function hasApplicantRejectionSelected(applicant: AdminApplicationReviewGroup['applicants'][number]) {
  return applicant.application.preApprovalStatus === 'rejected'
}

function getWhyThisHackathonValue(applicant: AdminApplicationReviewGroup['applicants'][number]) {
  return applicant.registrationDetails.whyThisHackathon.trim()
}

function shouldShowWhyThisHackathon(applicant: AdminApplicationReviewGroup['applicants'][number]) {
  return getWhyThisHackathonValue(applicant).length > 0
}

function shouldShowWhyThisHackathonToggle(applicant: AdminApplicationReviewGroup['applicants'][number]) {
  return getWhyThisHackathonValue(applicant).length > whyThisHackathonPreviewCharacterLimit
}

function getVisibleWhyThisHackathon(applicant: AdminApplicationReviewGroup['applicants'][number]) {
  const whyThisHackathon = getWhyThisHackathonValue(applicant)
  const sectionKey = getApplicationSectionKey(applicant.application.id, 'motivation')

  if (
    isApplicationSectionExpanded(sectionKey)
    || whyThisHackathon.length <= whyThisHackathonPreviewCharacterLimit
  ) {
    return whyThisHackathon
  }

  return `${whyThisHackathon.slice(0, whyThisHackathonPreviewCharacterLimit).trimEnd()}…`
}

function getProofOfExecutionLinks(applicant: AdminApplicationReviewGroup['applicants'][number]) {
  return parseProofOfExecutionLinks(applicant.registrationDetails.proofOfExecutionUrl)
}

function shouldShowProofOfExecutionLinks(applicant: AdminApplicationReviewGroup['applicants'][number]) {
  return getProofOfExecutionLinks(applicant).length > 0
}

function shouldShowProofOfExecutionToggle(applicant: AdminApplicationReviewGroup['applicants'][number]) {
  return getProofOfExecutionLinks(applicant).length > proofLinksPreviewCount
}

function getVisibleProofOfExecutionLinks(applicant: AdminApplicationReviewGroup['applicants'][number]) {
  const proofLinks = getProofOfExecutionLinks(applicant)
  const sectionKey = getApplicationSectionKey(applicant.application.id, 'proof')

  if (
    isApplicationSectionExpanded(sectionKey)
    || proofLinks.length <= proofLinksPreviewCount
  ) {
    return proofLinks
  }

  return proofLinks.slice(0, proofLinksPreviewCount)
}

function getDecisionButtonClass(tone: 'approve' | 'approve_team' | 'reject', isActive: boolean) {
  const baseClass = 'inline-flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45'

  if (isActive) {
    switch (tone) {
      case 'approve':
        return `${baseClass} border-success/30 bg-success/12 text-success hover:bg-success/16`
      case 'approve_team':
        return `${baseClass} border-success/35 bg-success/16 text-success hover:bg-success/20`
      case 'reject':
        return `${baseClass} border-error/30 bg-error/12 text-error hover:bg-error/16`
    }
  }

  return `${baseClass} border-black/8 bg-transparent text-toned hover:border-black/20 hover:text-highlighted dark:border-white/[0.08] dark:hover:border-white/[0.18] dark:hover:text-white`
}

const reviewContent = computed(() => {
  if (props.view === 'approved') {
    return {
      title: 'Approved Participants',
      description: props.readOnly
        ? 'Browse approved participants and inferred teammate groupings.'
        : 'Browse approved participants and inferred teammate groupings.'
    }
  }

  return {
    title: props.readOnly ? 'Participant Directory' : 'Participant Review',
    description: props.readOnly
      ? 'Browse hackathon participants and teammate hints without review actions.'
      : 'Review incoming applications, then save once to apply decisions and trigger participant emails.'
  }
})

const emptyState = computed(() => {
  if (props.applications.length === 0) {
    return {
      title: 'No participant records yet',
      description: 'This hackathon does not currently have participant records to review.'
    }
  }

  if (props.view === 'approved') {
    return {
      title: 'No approved participants yet',
      description: 'Approved participants will appear here after staged decisions are saved.'
    }
  }

  return {
    title: 'No applications awaiting review',
    description: props.readOnly
      ? 'Visible participant application records will appear here.'
      : 'Submitted applications will appear here until they are approved or rejected.'
  }
})
</script>

<template>
  <AppCard class="rounded-xl hackathon-workspace-detail-panel">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          {{ reviewContent.title }}
        </h2>
        <p class="text-sm text-muted">
          {{ reviewContent.description }}
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <AppAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        title="Participant records unavailable"
        :description="errorMessage"
      />

      <AppAlert
        v-else-if="isLoading"
        color="neutral"
        variant="soft"
        title="Loading participants"
        description="Participant records are still loading."
      />

      <template v-else>
        <div
          v-if="view === 'applications' && !readOnly"
          class="hackathon-workspace-detail-inset flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-4"
        >
          <p class="text-sm text-muted">
            Save applies staged decisions and then queues participant emails.
          </p>
          <AppButton
            color="primary"
            :data-testid="'admin-application-save-decisions'"
            :loading="pendingActionKey === 'apply-staged-decisions'"
            :disabled="stagedCount === 0 || (pendingActionKey !== null && pendingActionKey !== 'apply-staged-decisions')"
            @click="emit('saveDecisions')"
          >
            Save staged decisions ({{ stagedCount }})
          </AppButton>
        </div>

        <div
          v-if="applicationReviewGroups.length > 0"
          class="grid gap-5"
        >
          <section
            v-for="group in applicationReviewGroups"
            :key="group.id"
            :data-testid="`admin-application-group-${group.id}`"
            class="hackathon-workspace-detail-inset overflow-hidden rounded-xl"
          >
            <div class="divide-y divide-black/8 dark:divide-white/[0.08]">
              <article
                v-for="applicant in group.applicants"
                :key="applicant.application.id"
                :data-testid="`admin-application-${applicant.application.id}`"
                class="grid gap-5 px-5 py-5"
                :class="view === 'applications' && applicant.application.status === 'submitted' ? 'xl:grid-cols-[minmax(0,1fr)_14rem] xl:items-center' : ''"
              >
                <div class="min-w-0 space-y-3">
                  <div class="space-y-3">
                    <div class="space-y-1">
                      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                        Participant
                      </p>
                      <h4 class="text-lg font-semibold text-highlighted">
                        <template v-if="applicant.application.user?.displayName && applicant.application.user?.email && applicant.application.user.displayName !== applicant.application.user.email">
                          {{ applicant.application.user.displayName }} - {{ applicant.application.user.email }}
                        </template>
                        <template v-else>
                          {{ applicant.application.user?.displayName ?? applicant.application.user?.email ?? applicant.application.userId }}
                        </template>
                      </h4>
                    </div>

                    <div class="flex flex-wrap gap-2 text-xs text-muted">
                      <AppBadge
                        v-if="applicant.application.status === 'approved'"
                        :color="getApplicationStatusColor(applicant.application.status)"
                        variant="soft"
                      >
                        Approved
                      </AppBadge>
                      <AppBadge
                        v-if="applicant.hasFuzzyMatch"
                        color="warning"
                        variant="soft"
                      >
                        Fuzzy teammate match
                      </AppBadge>
                      <a
                        v-if="applicant.application.user?.lumaUsername"
                        :href="`https://luma.com/user/${encodeURIComponent(applicant.application.user.lumaUsername)}`"
                        target="_blank"
                        rel="noreferrer"
                        class="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-sky-700 transition hover:border-black/20 hover:text-sky-800 dark:border-white/[0.12] dark:text-sky-300 dark:hover:border-white/[0.22] dark:hover:text-sky-200"
                      >
                        Luma: @{{ applicant.application.user.lumaUsername }}
                        <AppIcon
                          name="i-lucide-external-link"
                          class="size-3"
                        />
                      </a>
                      <a
                        v-if="applicant.application.user?.githubProfileUrl"
                        :href="applicant.application.user.githubProfileUrl"
                        target="_blank"
                        rel="noreferrer"
                        class="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-sky-700 transition hover:border-black/20 hover:text-sky-800 dark:border-white/[0.12] dark:text-sky-300 dark:hover:border-white/[0.22] dark:hover:text-sky-200"
                      >
                        GitHub
                        <AppIcon
                          name="i-lucide-external-link"
                          class="size-3"
                        />
                      </a>
                      <span
                        v-if="applicant.application.user?.chatgptEmail"
                        class="rounded-full border border-black/10 px-3 py-1 text-highlighted dark:border-white/[0.12]"
                      >
                        ChatGPT: {{ applicant.application.user.chatgptEmail }}
                      </span>
                      <span
                        v-if="applicant.application.user?.openaiOrgId"
                        class="rounded-full border border-black/10 px-3 py-1 text-highlighted dark:border-white/[0.12]"
                      >
                        OpenAI org: {{ applicant.application.user.openaiOrgId }}
                      </span>
                      <a
                        v-if="applicant.application.user?.linkedinProfileUrl"
                        :href="applicant.application.user.linkedinProfileUrl"
                        target="_blank"
                        rel="noreferrer"
                        class="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-sky-700 transition hover:border-black/20 hover:text-sky-800 dark:border-white/[0.12] dark:text-sky-300 dark:hover:border-white/[0.22] dark:hover:text-sky-200"
                      >
                        LinkedIn
                        <AppIcon
                          name="i-lucide-external-link"
                          class="size-3"
                        />
                      </a>
                      <a
                        v-if="applicant.application.user?.xProfileUrl"
                        :href="applicant.application.user.xProfileUrl"
                        target="_blank"
                        rel="noreferrer"
                        class="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-sky-700 transition hover:border-black/20 hover:text-sky-800 dark:border-white/[0.12] dark:text-sky-300 dark:hover:border-white/[0.22] dark:hover:text-sky-200"
                      >
                        X
                        <AppIcon
                          name="i-lucide-external-link"
                          class="size-3"
                        />
                      </a>
                    </div>
                  </div>

                  <div
                    v-if="shouldShowWhyThisHackathon(applicant) || shouldShowProofOfExecutionLinks(applicant)"
                    class="space-y-3"
                  >
                    <div
                      v-if="shouldShowProofOfExecutionLinks(applicant)"
                      class="space-y-2"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                          Proof links
                        </p>
                        <button
                          v-if="shouldShowProofOfExecutionToggle(applicant)"
                          type="button"
                          class="shrink-0 text-[12px] font-medium text-highlighted transition-colors hover:text-toned dark:text-white dark:hover:text-[#D9D9D9]"
                          @click="toggleApplicationSection(getApplicationSectionKey(applicant.application.id, 'proof'))"
                        >
                          {{ isApplicationSectionExpanded(getApplicationSectionKey(applicant.application.id, 'proof')) ? 'Show less' : `Show all ${getProofOfExecutionLinks(applicant).length}` }}
                        </button>
                      </div>
                      <div class="space-y-1.5">
                        <a
                          v-for="link in getVisibleProofOfExecutionLinks(applicant)"
                          :key="link"
                          :href="link"
                          target="_blank"
                          rel="noreferrer"
                          :title="link"
                          class="flex w-full items-start gap-2 text-xs text-sky-700 transition hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                        >
                          <AppIcon
                            name="i-lucide-external-link"
                            class="mt-0.5 size-3 shrink-0"
                          />
                          <span class="min-w-0 break-all leading-5">
                            {{ link }}
                          </span>
                        </a>
                      </div>
                    </div>

                    <section
                      v-if="shouldShowWhyThisHackathon(applicant)"
                      class="rounded-lg border border-black/8 bg-black/[0.02] px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.02]"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                          Why this hackathon
                        </p>
                        <button
                          v-if="shouldShowWhyThisHackathonToggle(applicant)"
                          type="button"
                          class="shrink-0 text-[12px] font-medium text-highlighted transition-colors hover:text-toned dark:text-white dark:hover:text-[#D9D9D9]"
                          @click="toggleApplicationSection(getApplicationSectionKey(applicant.application.id, 'motivation'))"
                        >
                          {{ isApplicationSectionExpanded(getApplicationSectionKey(applicant.application.id, 'motivation')) ? 'Show less' : 'Show more' }}
                        </button>
                      </div>
                      <p class="mt-2 whitespace-pre-line text-sm leading-6 text-toned">
                        {{ getVisibleWhyThisHackathon(applicant) }}
                      </p>
                    </section>
                  </div>
                </div>

                <div
                  v-if="!readOnly && view === 'applications' && applicant.application.status === 'submitted'"
                  class="grid gap-2 self-center xl:pl-2"
                >
                  <button
                    type="button"
                    :data-testid="`admin-application-approve-${applicant.application.id}`"
                    :class="getDecisionButtonClass('approve', hasApplicantApprovalSelected(applicant, group))"
                    :disabled="pendingActionKey !== null && pendingActionKey !== stageDecisionActionKey(applicant.application.id, 'approved')"
                    @click="emit('approve', applicant.application)"
                  >
                    <span>Approve</span>
                    <AppIcon
                      v-if="pendingActionKey === stageDecisionActionKey(applicant.application.id, 'approved')"
                      name="i-lucide-loader-circle"
                      class="size-4 animate-spin"
                    />
                    <AppIcon
                      v-else
                      name="i-lucide-thumbs-up"
                      class="size-4"
                    />
                  </button>

                  <button
                    v-if="canApproveTeam(group)"
                    type="button"
                    :data-testid="`admin-application-approve-team-${applicant.application.id}`"
                    :class="getDecisionButtonClass('approve_team', hasGroupApprovalSelected(group))"
                    :disabled="pendingActionKey !== null && pendingActionKey !== stageGroupApprovalActionKey(group)"
                    @click="emit('approveTeam', group.applicants.map(groupApplicant => groupApplicant.application))"
                  >
                    <span>Approve Team</span>
                    <span
                      v-if="pendingActionKey === stageGroupApprovalActionKey(group)"
                      class="flex items-center gap-1"
                    >
                      <AppIcon
                        name="i-lucide-loader-circle"
                        class="size-4 animate-spin"
                      />
                    </span>
                    <span
                      v-else
                      class="flex items-center gap-1"
                    >
                      <AppIcon
                        name="i-lucide-thumbs-up"
                        class="size-4"
                      />
                      <AppIcon
                        name="i-lucide-thumbs-up"
                        class="size-4"
                      />
                    </span>
                  </button>

                  <button
                    type="button"
                    :data-testid="`admin-application-reject-${applicant.application.id}`"
                    :class="getDecisionButtonClass('reject', hasApplicantRejectionSelected(applicant))"
                    :disabled="pendingActionKey !== null && pendingActionKey !== stageDecisionActionKey(applicant.application.id, 'rejected')"
                    @click="emit('reject', applicant.application)"
                  >
                    <span>Reject</span>
                    <AppIcon
                      v-if="pendingActionKey === stageDecisionActionKey(applicant.application.id, 'rejected')"
                      name="i-lucide-loader-circle"
                      class="size-4 animate-spin"
                    />
                    <AppIcon
                      v-else
                      name="i-lucide-thumbs-down"
                      class="size-4"
                    />
                  </button>
                </div>
              </article>
              <article
                v-for="pendingTeammate in group.pendingTeammates"
                :key="pendingTeammate.id"
                class="px-5 py-5"
              >
                <div class="space-y-1">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Unmatched participant
                  </p>
                  <p class="text-lg font-semibold text-highlighted">
                    {{ formatPendingTeammateLabel(pendingTeammate) }}
                  </p>
                  <p
                    v-if="pendingTeammate.email && pendingTeammate.email !== formatPendingTeammateLabel(pendingTeammate)"
                    class="text-sm text-toned"
                  >
                    {{ pendingTeammate.email }}
                  </p>
                </div>
              </article>
            </div>
          </section>
        </div>

        <AppAlert
          v-else
          color="neutral"
          variant="soft"
          :title="emptyState.title"
          :description="emptyState.description"
        />
      </template>
    </div>
  </AppCard>
</template>
