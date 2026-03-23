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
  <UCard class="border border-default/70 bg-elevated/90">
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
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        title="Application records unavailable"
        :description="errorMessage"
      />

      <UAlert
        v-else-if="isLoading"
        color="neutral"
        variant="soft"
        title="Loading applications"
        description="Admin application records are still loading."
      />

      <template v-else>
        <div class="grid gap-4 md:grid-cols-3">
          <div class="rounded-2xl border border-default bg-default px-4 py-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Awaiting review
            </p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
              {{ submittedCount }}
            </p>
          </div>

          <div class="rounded-2xl border border-default bg-default px-4 py-4">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Approved
            </p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
              {{ approvedCount }}
            </p>
          </div>

          <div class="rounded-2xl border border-default bg-default px-4 py-4">
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
            class="rounded-[1.5rem] border border-default bg-default px-5 py-5"
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
                  <a
                    v-if="application.user?.githubProfileUrl"
                    :href="application.user.githubProfileUrl"
                    target="_blank"
                    rel="noreferrer"
                    class="rounded-full border border-default px-3 py-1 transition hover:border-primary/50 hover:text-highlighted"
                  >
                    GitHub
                  </a>
                  <a
                    v-if="application.user?.linkedinProfileUrl"
                    :href="application.user.linkedinProfileUrl"
                    target="_blank"
                    rel="noreferrer"
                    class="rounded-full border border-default px-3 py-1 transition hover:border-primary/50 hover:text-highlighted"
                  >
                    LinkedIn
                  </a>
                  <a
                    v-if="application.user?.xProfileUrl"
                    :href="application.user.xProfileUrl"
                    target="_blank"
                    rel="noreferrer"
                    class="rounded-full border border-default px-3 py-1 transition hover:border-primary/50 hover:text-highlighted"
                  >
                    X
                  </a>
                </div>
              </div>

              <UBadge
                :color="getApplicationStatusColor(application.status)"
                variant="soft"
                class="self-start"
              >
                {{ formatApplicationStatus(application.status) }}
              </UBadge>
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
              <UButton
                color="success"
                :data-testid="`admin-application-approve-${application.id}`"
                :loading="pendingActionKey === `approve:${application.id}`"
                :disabled="pendingActionKey !== null && pendingActionKey !== `approve:${application.id}`"
                @click="emit('approve', application)"
              >
                Approve application
              </UButton>

              <UButton
                color="error"
                variant="soft"
                :data-testid="`admin-application-reject-${application.id}`"
                :loading="pendingActionKey === `reject:${application.id}`"
                :disabled="pendingActionKey !== null && pendingActionKey !== `reject:${application.id}`"
                @click="emit('reject', application)"
              >
                Reject application
              </UButton>
            </div>
          </article>
        </div>

        <UAlert
          v-else
          color="neutral"
          variant="soft"
          title="No applications yet"
          description="This hackathon does not currently have application records to review."
        />
      </template>
    </div>
  </UCard>
</template>
