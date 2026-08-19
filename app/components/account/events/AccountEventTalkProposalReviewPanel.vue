<script setup lang="ts">
import type { ApiDataResponse, ApiListResponse } from '~/lib/api'
import type { PublicEventState } from '~/domains/events/presentation'
import type { TalkProposalReviewEntry, TalkProposalStatus } from '~/domains/talk-proposals'
import { normalizeApiError } from '~/lib/api'
import { talkProposalStatusLabels } from '~/domains/talk-proposals'
import { useApiClient } from '~/composables/useApiClient'

const props = defineProps<{
  eventId: string
  eventState: PublicEventState
  canDecide: boolean
}>()

const entries = ref<TalkProposalReviewEntry[]>([])
const selectedId = ref('')
const statusFilter = ref<'all' | TalkProposalStatus>('all')
const page = ref(1)
const totalPages = ref(1)
const decisionMessage = ref('')
const pending = ref(true)
const actionPending = ref(false)
const errorMessage = ref('')
const toast = useToast()
const apiFetch = useApiClient()

const selectedEntry = computed(() => entries.value.find(entry => entry.proposal.id === selectedId.value) ?? null)

function ownerName(entry: TalkProposalReviewEntry) {
  return entry.owner.displayName.trim()
    || `${entry.owner.firstName} ${entry.owner.familyName}`.trim()
    || entry.owner.email
}

async function loadProposals() {
  pending.value = true
  errorMessage.value = ''
  try {
    const response = await apiFetch<ApiListResponse<TalkProposalReviewEntry>>(`/api/events/${props.eventId}/talk-proposals`, {
      query: {
        page: page.value,
        page_size: 20,
        ...(statusFilter.value === 'all' ? {} : { status: statusFilter.value })
      }
    })
    entries.value = response.data
    totalPages.value = Number(response.meta?.totalPages ?? 1)
    if (!entries.value.some(entry => entry.proposal.id === selectedId.value)) {
      selectedId.value = entries.value[0]?.proposal.id ?? ''
    }
  } catch (error) {
    errorMessage.value = normalizeApiError(error).message
  } finally {
    pending.value = false
  }
}

async function decide(decision: 'accept' | 'reject') {
  if (!selectedEntry.value) return
  actionPending.value = true
  errorMessage.value = ''
  try {
    const response = await apiFetch<ApiDataResponse<{ proposal: TalkProposalReviewEntry['proposal'] }>>(
      `/api/events/${props.eventId}/talk-proposals/${selectedEntry.value.proposal.id}/actions/${decision}`,
      {
        method: 'POST',
        body: { message: decisionMessage.value.trim() || null }
      }
    )
    selectedEntry.value.proposal = response.data.proposal
    decisionMessage.value = ''
    toast.add({ title: decision === 'accept' ? 'Talk proposal accepted' : 'Talk proposal not accepted', color: 'success' })
  } catch (error) {
    errorMessage.value = normalizeApiError(error).message
  } finally {
    actionPending.value = false
  }
}

watch(selectedId, () => {
  decisionMessage.value = selectedEntry.value?.proposal.decisionMessage ?? ''
})

watch(statusFilter, () => {
  page.value = 1
  void loadProposals()
})

onMounted(loadProposals)
</script>

<template>
  <AppCard data-testid="talk-proposal-review-panel">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-highlighted">
          Talk proposals
        </h2>
        <label class="flex items-center gap-2 text-sm text-muted">
          Status
          <select
            v-model="statusFilter"
            class="rounded-lg border border-black/10 bg-default px-3 py-2 text-sm text-highlighted dark:border-white/[0.12]"
          >
            <option value="all">All</option>
            <option
              v-for="(label, status) in talkProposalStatusLabels"
              :key="status"
              :value="status"
            >{{ label }}</option>
          </select>
        </label>
      </div>
    </template>

    <AppAlert
      v-if="errorMessage"
      class="mb-5"
      color="error"
      variant="soft"
      title="Unable to load Talk proposals"
      :description="errorMessage"
    />

    <div
      v-if="pending"
      class="py-6 text-sm text-muted"
    >
      Loading Talk proposals…
    </div>
    <div
      v-else-if="entries.length === 0"
      class="py-6 text-sm text-muted"
    >
      No Talk proposals yet.
    </div>

    <div
      v-else
      class="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]"
    >
      <div class="divide-y divide-black/8 border-y border-black/8 dark:divide-white/[0.08] dark:border-white/[0.08]">
        <button
          v-for="entry in entries"
          :key="entry.proposal.id"
          type="button"
          class="grid w-full gap-1 px-3 py-3 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
          :class="selectedId === entry.proposal.id ? 'bg-black/[0.04] dark:bg-white/[0.06]' : ''"
          @click="selectedId = entry.proposal.id"
        >
          <span class="truncate text-sm font-medium text-highlighted">{{ entry.proposal.title }}</span>
          <span class="flex items-center justify-between gap-2 text-xs text-muted">
            <span class="truncate">{{ ownerName(entry) }}</span>
            <span>{{ talkProposalStatusLabels[entry.proposal.status] }}</span>
          </span>
        </button>
        <div
          v-if="totalPages > 1"
          class="flex items-center justify-between gap-3 px-3 py-3"
        >
          <AppButton
            color="neutral"
            variant="soft"
            size="sm"
            :disabled="page === 1"
            @click="page -= 1; loadProposals()"
          >
            Previous
          </AppButton>
          <span class="text-xs text-muted">Page {{ page }} of {{ totalPages }}</span>
          <AppButton
            color="neutral"
            variant="soft"
            size="sm"
            :disabled="page === totalPages"
            @click="page += 1; loadProposals()"
          >
            Next
          </AppButton>
        </div>
      </div>

      <article
        v-if="selectedEntry"
        class="min-w-0 space-y-5"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 class="text-xl font-semibold text-highlighted">
              {{ selectedEntry.proposal.title }}
            </h3>
            <p class="mt-1 text-sm text-muted">
              {{ ownerName(selectedEntry) }} · {{ selectedEntry.owner.email }}
            </p>
          </div>
          <AppBadge
            variant="soft"
            color="neutral"
          >
            {{ talkProposalStatusLabels[selectedEntry.proposal.status] }}
          </AppBadge>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-medium text-highlighted">
            Abstract
          </h4>
          <p class="whitespace-pre-wrap text-sm leading-6 text-toned">
            {{ selectedEntry.proposal.abstract }}
          </p>
        </div>

        <AppButton
          v-if="selectedEntry.proposal.demoOrSlidesUrl"
          :to="selectedEntry.proposal.demoOrSlidesUrl"
          external
          color="neutral"
          variant="soft"
        >
          Open demo or slides
        </AppButton>

        <p class="text-sm text-muted">
          Registration: {{ selectedEntry.applicationStatus ?? 'Not available' }}
        </p>

        <div
          v-if="selectedEntry.proposal.decisionMessage && selectedEntry.proposal.status !== 'submitted'"
          class="space-y-2 border-t border-black/8 pt-5 dark:border-white/[0.08]"
        >
          <h4 class="text-sm font-medium text-highlighted">
            Message to speaker
          </h4>
          <p class="whitespace-pre-wrap text-sm text-toned">
            {{ selectedEntry.proposal.decisionMessage }}
          </p>
        </div>

        <div
          v-if="props.canDecide && selectedEntry.proposal.status === 'submitted' && props.eventState !== 'completed'"
          class="space-y-4 border-t border-black/8 pt-5 dark:border-white/[0.08]"
        >
          <AppFormField
            name="talk-proposal-decision-message"
            label="Message to speaker"
          >
            <AppTextarea
              id="talk-proposal-decision-message"
              v-model="decisionMessage"
              :rows="4"
            />
          </AppFormField>
          <div class="flex flex-wrap gap-3">
            <AppButton
              :loading="actionPending"
              :disabled="actionPending"
              @click="decide('accept')"
            >
              Accept talk
            </AppButton>
            <AppButton
              color="error"
              variant="soft"
              :loading="actionPending"
              :disabled="actionPending"
              @click="decide('reject')"
            >
              Do not accept
            </AppButton>
          </div>
        </div>
      </article>
    </div>
  </AppCard>
</template>
