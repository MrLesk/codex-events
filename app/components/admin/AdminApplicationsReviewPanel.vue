<script setup lang="ts">
import type { AdminApplicationRecord } from '~/utils/admin-workspace'

import {
  formatApplicationStatus,
  getApplicationStatusColor
} from '~/utils/admin-workspace'

const props = defineProps<{
  applications: AdminApplicationRecord[]
  isLoading?: boolean
  errorMessage?: string
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  approve: [application: AdminApplicationRecord]
  reject: [application: AdminApplicationRecord]
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
</script>

<template>
  <AppCard class="rounded-xl border border-black/8 bg-white/70 shadow-none dark:border-white/[0.08] dark:bg-black/36">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Application Review
        </h2>
        <p class="text-sm text-muted">
          Review submitted applications using the canonical admin transitions only.
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
        <div class="grid gap-4 md:grid-cols-3">
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
                    class="rounded-full border border-black/10 px-3 py-1 transition hover:border-black/20 hover:text-highlighted dark:border-white/[0.12] dark:hover:border-white/[0.22]"
                  >
                    GitHub
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
                    class="rounded-full border border-black/10 px-3 py-1 transition hover:border-black/20 hover:text-highlighted dark:border-white/[0.12] dark:hover:border-white/[0.22]"
                  >
                    LinkedIn
                  </a>
                  <a
                    v-if="application.user?.xProfileUrl"
                    :href="application.user.xProfileUrl"
                    target="_blank"
                    rel="noreferrer"
                    class="rounded-full border border-black/10 px-3 py-1 transition hover:border-black/20 hover:text-highlighted dark:border-white/[0.12] dark:hover:border-white/[0.22]"
                  >
                    X
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
                :loading="pendingActionKey === `approve:${application.id}`"
                :disabled="pendingActionKey !== null && pendingActionKey !== `approve:${application.id}`"
                @click="emit('approve', application)"
              >
                Approve application
              </AppButton>

              <AppButton
                color="error"
                variant="soft"
                :data-testid="`admin-application-reject-${application.id}`"
                :loading="pendingActionKey === `reject:${application.id}`"
                :disabled="pendingActionKey !== null && pendingActionKey !== `reject:${application.id}`"
                @click="emit('reject', application)"
              >
                Reject application
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
