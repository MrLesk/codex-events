<script setup lang="ts">
import type { AdminApplicationRecord } from '~/utils/admin-workspace'

import {
  formatApplicationStatus,
  getApplicationStatusColor,
  getParticipantsLimitSummary
} from '~/utils/admin-workspace'

const props = defineProps<{
  applications: AdminApplicationRecord[]
  participantsLimit?: number | null
  isLoading?: boolean
  errorMessage?: string
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  approve: [application: AdminApplicationRecord]
  reject: [application: AdminApplicationRecord]
  saveDecisions: []
}>()

const submittedCount = computed(() =>
  props.applications.filter(application => application.status === 'submitted').length
)
const approvedCount = computed(() =>
  props.applications.filter(application => application.status === 'approved').length
)
const rejectedCount = computed(() =>
  props.applications.filter(application => application.status === 'rejected').length
)
const stagedCount = computed(() =>
  props.applications.filter(application => application.status === 'submitted' && Boolean(application.preApprovalStatus)).length
)
const stagedApprovedCount = computed(() =>
  props.applications.filter(
    application => application.status === 'submitted' && application.preApprovalStatus === 'approved'
  ).length
)
const stagedRejectedCount = computed(() =>
  props.applications.filter(
    application => application.status === 'submitted' && application.preApprovalStatus === 'rejected'
  ).length
)
const participantsLimitSummary = computed(() =>
  getParticipantsLimitSummary(props.applications, props.participantsLimit)
)

function stageDecisionActionKey(applicationId: string, decision: 'approved' | 'rejected') {
  return `stage:${decision}:${applicationId}`
}
</script>

<template>
  <AppCard class="rounded-xl hackathon-workspace-detail-panel">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Application Review
        </h2>
        <p class="text-sm text-muted">
          Stage registration decisions, then save once to apply them and trigger participant emails.
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <AppAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        title="Application records unavailable"
        :description="errorMessage"
      />

      <AppAlert
        v-else-if="isLoading"
        color="neutral"
        variant="soft"
        title="Loading applications"
        description="Admin application records are still loading."
      />

      <template v-else>
        <AppAlert
          v-if="participantsLimitSummary"
          color="info"
          variant="soft"
          title="Participants limit"
          :description="`${participantsLimitSummary.description} Staged decisions: ${stagedCount} total (${stagedApprovedCount} approve, ${stagedRejectedCount} reject).`"
        />

        <div class="grid gap-4 md:grid-cols-4">
          <div class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-4 py-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Awaiting review
            </p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
              {{ submittedCount }}
            </p>
          </div>

          <div class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-4 py-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Approved
            </p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
              {{ approvedCount }}
            </p>
          </div>

          <div class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-4 py-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Rejected
            </p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
              {{ rejectedCount }}
            </p>
          </div>

          <div class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-4 py-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Staged
            </p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
              {{ stagedCount }}
            </p>
          </div>
        </div>

        <div class="hackathon-workspace-detail-inset flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-4">
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
          v-if="applications.length > 0"
          class="grid gap-4"
        >
          <article
            v-for="application in applications"
            :key="application.id"
            :data-testid="`admin-application-${application.id}`"
            class="rounded-none border-0 bg-transparent dark:border-0 dark:bg-transparent px-5 py-5"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="space-y-3">
                <div class="space-y-1">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Applicant
                  </p>
                  <h3 class="text-lg font-semibold text-highlighted">
                    {{ application.user?.displayName ?? application.user?.email ?? application.userId }}
                  </h3>
                  <p class="text-sm text-toned">
                    {{ application.user?.email ?? application.userId }}
                  </p>
                </div>

                <div class="flex flex-wrap gap-2 text-xs text-muted">
                  <span
                    v-if="application.user?.lumaUsername"
                    class="rounded-full border border-black/10 px-3 py-1 text-highlighted dark:border-white/[0.12]"
                  >
                    Luma: @{{ application.user.lumaUsername }}
                  </span>
                  <a
                    v-if="application.user?.githubProfileUrl"
                    :href="application.user.githubProfileUrl"
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
                    v-if="application.user?.chatgptEmail"
                    class="rounded-full border border-black/10 px-3 py-1 text-highlighted dark:border-white/[0.12]"
                  >
                    ChatGPT: {{ application.user.chatgptEmail }}
                  </span>
                  <span
                    v-if="application.user?.openaiOrgId"
                    class="rounded-full border border-black/10 px-3 py-1 text-highlighted dark:border-white/[0.12]"
                  >
                    OpenAI org: {{ application.user.openaiOrgId }}
                  </span>
                  <a
                    v-if="application.user?.linkedinProfileUrl"
                    :href="application.user.linkedinProfileUrl"
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
                    v-if="application.user?.xProfileUrl"
                    :href="application.user.xProfileUrl"
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

              <AppBadge
                :color="getApplicationStatusColor(application.status)"
                variant="soft"
                class="self-start"
              >
                {{ formatApplicationStatus(application.status) }}
              </AppBadge>
            </div>

            <div
              v-if="application.status === 'submitted' && application.preApprovalStatus"
              class="mt-4"
            >
              <AppBadge
                :color="getApplicationStatusColor(application.preApprovalStatus)"
                variant="soft"
              >
                Staged: {{ formatApplicationStatus(application.preApprovalStatus) }}
              </AppBadge>
            </div>

            <div class="mt-5 grid gap-3 text-sm text-toned md:grid-cols-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Submitted
                </p>
                <p class="mt-1">
                  {{ application.submittedAt }}
                </p>
              </div>

              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Reviewed
                </p>
                <p class="mt-1">
                  {{ application.reviewedAt ?? 'Not reviewed yet' }}
                </p>
              </div>

              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Terms acceptance
                </p>
                <p class="mt-1 break-all">
                  {{ application.applicationTermsDocumentId }}
                </p>
              </div>
            </div>

            <div
              v-if="application.status === 'submitted'"
              class="mt-5 flex flex-wrap gap-3"
            >
              <AppButton
                color="success"
                :data-testid="`admin-application-approve-${application.id}`"
                :loading="pendingActionKey === stageDecisionActionKey(application.id, 'approved')"
                :disabled="pendingActionKey !== null && pendingActionKey !== stageDecisionActionKey(application.id, 'approved')"
                @click="emit('approve', application)"
              >
                Stage approval
              </AppButton>

              <AppButton
                color="error"
                variant="soft"
                :data-testid="`admin-application-reject-${application.id}`"
                :loading="pendingActionKey === stageDecisionActionKey(application.id, 'rejected')"
                :disabled="pendingActionKey !== null && pendingActionKey !== stageDecisionActionKey(application.id, 'rejected')"
                @click="emit('reject', application)"
              >
                Stage rejection
              </AppButton>
            </div>
          </article>
        </div>

        <AppAlert
          v-else
          color="neutral"
          variant="soft"
          title="No applications yet"
          description="This hackathon does not currently have application records to review."
        />
      </template>
    </div>
  </AppCard>
</template>
