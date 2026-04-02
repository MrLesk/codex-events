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
const filteredCountLabel = computed(() => {
  if (status.value === 'idle' || status.value === 'pending') {
    return 'Loading...'
  }

  if (status.value === 'error') {
    return 'Unavailable'
  }

  if (participantView.value === 'approved') {
    const count = applications.value.filter(application => application.status === 'approved').length
    return `${count} approved participants`
  }

  if (participantView.value === 'rejected') {
    const count = applications.value.filter(application => application.status === 'rejected').length
    return `${count} rejected participants`
  }

  const count = applications.value.filter(application => application.status === 'submitted').length
  return `${count} applications`
})

function selectParticipantView(nextView: ParticipantView) {
  participantView.value = nextView
}
</script>

<template>
  <div class="space-y-6">
    <section class="grid gap-4 md:grid-cols-3">
      <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Awaiting review
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ submittedCount }}
        </p>
      </div>

      <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Approved
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ approvedCount }}
        </p>
      </div>

      <div class="rounded-xl hackathon-workspace-detail-inset px-5 py-5">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Rejected
        </p>
        <p class="mt-2 text-xl font-semibold text-highlighted">
          {{ rejectedCount }}
        </p>
      </div>
    </section>

    <div class="hackathon-workspace-detail-inset flex flex-col gap-4 rounded-xl p-2">
      <div class="flex min-w-0 flex-wrap items-center gap-1">
        <button
          class="rounded-lg px-4 py-1.5 text-[13px] transition-colors"
          :class="participantView === 'applications' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'text-neutral-700 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
          @click="selectParticipantView('applications')"
        >
          Applications
        </button>
        <button
          class="rounded-lg px-4 py-1.5 text-[13px] transition-colors"
          :class="participantView === 'approved' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'text-neutral-700 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
          @click="selectParticipantView('approved')"
        >
          Approved
        </button>
        <button
          class="rounded-lg px-4 py-1.5 text-[13px] transition-colors"
          :class="participantView === 'rejected' ? 'bg-black text-white font-medium dark:bg-white dark:text-black' : 'text-neutral-700 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
          @click="selectParticipantView('rejected')"
        >
          Rejected
        </button>
        <span class="ml-4 border-l border-black/8 pl-4 text-[13px] text-neutral-700 dark:border-white/[0.08] dark:text-[#8C8C8C]">
          {{ filteredCountLabel }}
        </span>
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
