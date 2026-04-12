<script setup lang="ts">
import type {
  AdminApplicationRecord,
  ApiListResponse
} from '~/utils/admin-workspace'

type ParticipantView = 'applications' | 'approved' | 'rejected'

const props = defineProps<{
  hackathonId: string
}>()

const participantView = ref<ParticipantView>('applications')

const {
  data,
  error,
  status
} = useFetch<ApiListResponse<AdminApplicationRecord>>(
  () => `/api/hackathons/${props.hackathonId}/applications`,
  {
    key: () => `hackathon-participant-visibility:${props.hackathonId}`
  }
)

const applications = computed(() => data.value?.data ?? [])

function formatMetricValue(value: number) {
  if (status.value === 'idle' || status.value === 'pending') {
    return 'Loading...'
  }

  if (status.value === 'error') {
    return 'Unavailable'
  }

  return `${value}`
}

const submittedCount = computed(() =>
  formatMetricValue(applications.value.filter(application => application.status === 'submitted').length)
)
const approvedCount = computed(() =>
  formatMetricValue(applications.value.filter(application => application.status === 'approved').length)
)
const rejectedCount = computed(() =>
  formatMetricValue(applications.value.filter(application => application.status === 'rejected').length)
)
function selectParticipantView(nextView: ParticipantView) {
  participantView.value = nextView
}
</script>

<template>
  <div class="space-y-6">
    <section class="grid grid-cols-3 gap-3 sm:gap-4">
      <div class="rounded-xl hackathon-workspace-detail-inset px-4 py-4 sm:px-5 sm:py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Awaiting review
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ submittedCount }}
        </p>
      </div>

      <div class="rounded-xl hackathon-workspace-detail-inset px-4 py-4 sm:px-5 sm:py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Approved
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ approvedCount }}
        </p>
      </div>

      <div class="rounded-xl hackathon-workspace-detail-inset px-4 py-4 sm:px-5 sm:py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Rejected
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ rejectedCount }}
        </p>
      </div>
    </section>

    <div class="hackathon-workspace-detail-inset flex flex-col gap-4 rounded-xl p-2">
      <div class="grid w-full min-w-0 grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-2">
        <button
          class="inline-flex w-full items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:w-auto sm:justify-start"
          :class="participantView === 'applications' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
          @click="selectParticipantView('applications')"
        >
          <span>Applications</span>
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
            :class="participantView === 'applications' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
          >
            {{ submittedCount }}
          </span>
        </button>
        <button
          class="inline-flex w-full items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:w-auto sm:justify-start"
          :class="participantView === 'approved' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
          @click="selectParticipantView('approved')"
        >
          <span>Approved</span>
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
            :class="participantView === 'approved' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
          >
            {{ approvedCount }}
          </span>
        </button>
        <button
          class="inline-flex w-full items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:w-auto sm:justify-start"
          :class="participantView === 'rejected' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
          @click="selectParticipantView('rejected')"
        >
          <span>Rejected</span>
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
            :class="participantView === 'rejected' ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
          >
            {{ rejectedCount }}
          </span>
        </button>
      </div>
    </div>

    <AdminApplicationsReviewPanel
      :hackathon-id="props.hackathonId"
      :applications="applications"
      :view="participantView"
      :is-loading="status === 'pending'"
      :error-message="error?.message ?? ''"
      read-only
    />
  </div>
</template>
