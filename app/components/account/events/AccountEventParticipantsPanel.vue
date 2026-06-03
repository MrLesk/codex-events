<script setup lang="ts">
import type { AdminApplicationReviewView } from '~/domains/applications/admin-application-review'
import type { AdminApplicationRecord } from '~/domains/applications/admin-application-record'

import { LazyApplicationsAdminApplicationsReviewPanel as LazyAdminApplicationsReviewPanel } from '#components'
import {
  formatApprovedParticipantRegistrationSummary,
  getApprovedParticipantAttendanceSummary,
  getParticipantApplicationStatusSummary,
  getParticipantsLimitSummary
} from '~/domains/applications/admin-application-record'

const props = withDefaults(defineProps<{
  eventId: string
  applications: AdminApplicationRecord[]
  isLoading?: boolean
  errorMessage?: string
  pendingActionKey?: string | null
  readOnly?: boolean
  showAttendance?: boolean
  showAiKnowledge?: boolean
  participantsLimit?: number | null
  autoApproveApplications?: boolean
}>(), {
  isLoading: false,
  errorMessage: '',
  pendingActionKey: null,
  readOnly: false,
  showAttendance: false,
  showAiKnowledge: false,
  participantsLimit: null,
  autoApproveApplications: false
})

const emit = defineEmits<{
  approve: [application: AdminApplicationRecord]
  approveTeam: [applications: AdminApplicationRecord[]]
  reject: [application: AdminApplicationRecord]
  withdraw: [application: AdminApplicationRecord]
  saveDecisions: []
}>()

const participantView = ref<AdminApplicationReviewView>('applications')

function formatParticipantMetricValue(value: string | number) {
  if (props.isLoading) {
    return 'Loading...'
  }

  if (props.errorMessage) {
    return 'Unavailable'
  }

  return `${value}`
}

const participantStatusSummary = computed(() =>
  getParticipantApplicationStatusSummary(props.applications)
)

const submittedParticipantSummaryValue = computed(() =>
  formatParticipantMetricValue(participantStatusSummary.value.submittedCount)
)

const approvedParticipantSummaryValue = computed(() =>
  formatParticipantMetricValue(participantStatusSummary.value.approvedCount)
)

const approvedParticipantRegistrationSummaryValue = computed(() =>
  formatParticipantMetricValue(formatApprovedParticipantRegistrationSummary(props.applications))
)

const checkedInParticipantSummaryValue = computed(() =>
  formatParticipantMetricValue(getApprovedParticipantAttendanceSummary(props.applications).value)
)

const rejectedParticipantSummaryValue = computed(() =>
  formatParticipantMetricValue(participantStatusSummary.value.rejectedCount)
)

const withdrawnParticipantSummaryValue = computed(() =>
  formatParticipantMetricValue(participantStatusSummary.value.withdrawnCount)
)

const participantsLimitSummary = computed(() =>
  getParticipantsLimitSummary(props.applications, props.participantsLimit)
)

const participantSummaryGridClass = computed(() => {
  if (participantsLimitSummary.value && props.showAttendance) {
    return 'xl:grid-cols-6'
  }

  if (participantsLimitSummary.value || props.showAttendance) {
    return 'xl:grid-cols-5'
  }

  return ''
})

function selectParticipantView(nextView: AdminApplicationReviewView) {
  participantView.value = nextView
}
</script>

<template>
  <div class="space-y-4">
    <div
      class="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
      :class="participantSummaryGridClass"
    >
      <div class="rounded-xl !border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 px-4 py-4 sm:px-5 sm:py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Awaiting review
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ submittedParticipantSummaryValue }}
        </p>
      </div>

      <div class="rounded-xl !border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 px-4 py-4 sm:px-5 sm:py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Approved
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ approvedParticipantRegistrationSummaryValue }}
        </p>
        <p class="mt-1 text-xs text-muted">
          Of total registrations
        </p>
      </div>

      <div
        v-if="showAttendance"
        class="rounded-xl !border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 px-4 py-4 sm:px-5 sm:py-5"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Checked in
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ checkedInParticipantSummaryValue }}
        </p>
        <p class="mt-1 text-xs text-muted">
          Of approved participants
        </p>
      </div>

      <div class="rounded-xl !border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 px-4 py-4 sm:px-5 sm:py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Rejected
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ rejectedParticipantSummaryValue }}
        </p>
      </div>

      <div class="rounded-xl !border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 px-4 py-4 sm:px-5 sm:py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Withdrawn
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ withdrawnParticipantSummaryValue }}
        </p>
      </div>

      <div
        v-if="participantsLimitSummary"
        class="col-span-2 rounded-xl !border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 px-4 py-4 sm:col-span-4 sm:px-5 sm:py-5 xl:col-span-1"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Participants limit
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ participantsLimitSummary.participantsLimit }}
        </p>
      </div>
    </div>

    <div class="!border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 flex flex-col gap-4 rounded-xl p-2">
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <button
          class="inline-flex min-w-max grow basis-0 items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:min-w-0 sm:grow-0 sm:basis-auto sm:justify-start"
          :class="participantView === 'applications' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
          @click="selectParticipantView('applications')"
        >
          <span>New</span>
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
            :class="participantView === 'applications' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
          >
            {{ submittedParticipantSummaryValue }}
          </span>
        </button>
        <button
          class="inline-flex min-w-max grow basis-0 items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:min-w-0 sm:grow-0 sm:basis-auto sm:justify-start"
          :class="participantView === 'approved' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
          @click="selectParticipantView('approved')"
        >
          <span>Approved</span>
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
            :class="participantView === 'approved' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
          >
            {{ approvedParticipantSummaryValue }}
          </span>
        </button>
        <button
          class="inline-flex min-w-max grow basis-0 items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:min-w-0 sm:grow-0 sm:basis-auto sm:justify-start"
          :class="participantView === 'rejected' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
          @click="selectParticipantView('rejected')"
        >
          <span>Rejected</span>
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
            :class="participantView === 'rejected' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
          >
            {{ rejectedParticipantSummaryValue }}
          </span>
        </button>
        <button
          class="inline-flex min-w-max grow basis-0 items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:min-w-0 sm:grow-0 sm:basis-auto sm:justify-start"
          :class="participantView === 'withdrawn' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
          @click="selectParticipantView('withdrawn')"
        >
          <span>Withdrawn</span>
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
            :class="participantView === 'withdrawn' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
          >
            {{ withdrawnParticipantSummaryValue }}
          </span>
        </button>
      </div>
    </div>

    <LazyAdminApplicationsReviewPanel
      :event-id="eventId"
      :applications="applications"
      :view="participantView"
      :is-loading="isLoading"
      :error-message="errorMessage"
      :pending-action-key="pendingActionKey"
      :read-only="readOnly"
      search-enabled
      :show-attendance="showAttendance"
      :show-ai-knowledge="showAiKnowledge"
      :auto-approve-applications="autoApproveApplications"
      @approve="emit('approve', $event)"
      @approve-team="emit('approveTeam', $event)"
      @reject="emit('reject', $event)"
      @withdraw="emit('withdraw', $event)"
      @save-decisions="emit('saveDecisions')"
    />
  </div>
</template>
