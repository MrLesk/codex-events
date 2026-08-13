<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

import type { ApiDataResponse } from '~/lib/api'
import type { TalkProposalRecord } from '~/domains/talk-proposals'
import { normalizeApiError } from '~/lib/api'
import {
  isTalkProposalWindowOpen,
  talkProposalFormSchema,
  talkProposalStatusLabels
} from '~/domains/talk-proposals'

const props = defineProps<{
  eventId: string
  applicationStatus: 'submitted' | 'approved' | 'rejected' | 'withdrawn' | null
  opensAt: string | null
  closesAt: string | null
}>()
const emit = defineEmits<{
  hasProposalChange: [hasProposal: boolean]
}>()

const proposal = ref<TalkProposalRecord | null>(null)
const pending = ref(true)
const actionPending = ref(false)
const errorMessage = ref('')
const toast = useToast()

const { errors, defineField, handleSubmit, resetForm, submitCount } = useForm({
  validationSchema: toTypedSchema(talkProposalFormSchema),
  initialValues: {
    title: '',
    abstract: '',
    demoOrSlidesUrl: ''
  }
})
const [title] = defineField('title')
const [abstract] = defineField('abstract')
const [demoOrSlidesUrl] = defineField('demoOrSlidesUrl')

const hasEligibleRegistration = computed(() => props.applicationStatus === 'submitted' || props.applicationStatus === 'approved')
const windowOpen = computed(() => isTalkProposalWindowOpen(props.opensAt, props.closesAt))
const canMutate = computed(() => hasEligibleRegistration.value && windowOpen.value)
const canEdit = computed(() => canMutate.value && (!proposal.value || proposal.value.status === 'draft'))
const statusLabel = computed(() => proposal.value ? talkProposalStatusLabels[proposal.value.status] : '')

function applyProposal(nextProposal: TalkProposalRecord | null) {
  proposal.value = nextProposal
  emit('hasProposalChange', Boolean(nextProposal))
  resetForm({
    values: {
      title: nextProposal?.title ?? '',
      abstract: nextProposal?.abstract ?? '',
      demoOrSlidesUrl: nextProposal?.demoOrSlidesUrl ?? ''
    }
  })
}

async function loadProposal() {
  pending.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<ApiDataResponse<TalkProposalRecord | null>>(`/api/events/${props.eventId}/talk-proposals/me`)
    applyProposal(response.data)
  } catch (error) {
    errorMessage.value = normalizeApiError(error).message
  } finally {
    pending.value = false
  }
}

const saveDraft = handleSubmit(async (values) => {
  actionPending.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<ApiDataResponse<TalkProposalRecord>>(`/api/events/${props.eventId}/talk-proposals/me`, {
      method: proposal.value ? 'PATCH' : 'POST',
      body: values
    })
    applyProposal(response.data)
    toast.add({ title: 'Draft saved', color: 'success' })
  } catch (error) {
    errorMessage.value = normalizeApiError(error).message
  } finally {
    actionPending.value = false
  }
})

async function runAction(action: 'submit' | 'withdraw' | 'revise') {
  actionPending.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<ApiDataResponse<TalkProposalRecord>>(
      `/api/events/${props.eventId}/talk-proposals/me/actions/${action}`,
      { method: 'POST' }
    )
    applyProposal(response.data)
    toast.add({
      title: action === 'submit' ? 'Talk proposal submitted' : action === 'withdraw' ? 'Talk proposal withdrawn' : 'Talk proposal ready to revise',
      color: 'success'
    })
  } catch (error) {
    errorMessage.value = normalizeApiError(error).message
  } finally {
    actionPending.value = false
  }
}

onMounted(loadProposal)
</script>

<template>
  <AppCard data-testid="participant-talk-proposal-panel">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-highlighted">
          Talk proposal
        </h2>
        <AppBadge
          v-if="proposal"
          :color="proposal.status === 'accepted' ? 'success' : proposal.status === 'rejected' ? 'error' : 'neutral'"
          variant="soft"
        >
          {{ statusLabel }}
        </AppBadge>
      </div>
    </template>

    <AppAlert
      v-if="errorMessage"
      class="mb-5"
      color="error"
      variant="soft"
      title="Unable to update your Talk proposal"
      :description="errorMessage"
    />

    <div
      v-if="pending"
      class="py-6 text-sm text-muted"
    >
      Loading your Talk proposal…
    </div>

    <template v-else>
      <AppAlert
        v-if="!hasEligibleRegistration"
        class="mb-5"
        color="warning"
        variant="soft"
        title="Changes are paused"
        description="Your event registration must be submitted or approved before you can change this Talk proposal."
      />
      <AppAlert
        v-else-if="!windowOpen && proposal?.status !== 'accepted' && proposal?.status !== 'rejected'"
        class="mb-5"
        color="info"
        variant="soft"
        title="The Call for talks is closed"
        description="Your Talk proposal remains available here, but it can no longer be changed."
      />

      <AppAlert
        v-if="proposal?.status === 'accepted' || proposal?.status === 'rejected'"
        class="mb-5"
        :color="proposal.status === 'accepted' ? 'success' : 'neutral'"
        variant="soft"
        :title="proposal.status === 'accepted' ? 'Your talk was accepted' : 'Your talk was not accepted'"
        :description="proposal.decisionMessage || undefined"
      />

      <form
        class="space-y-5"
        @submit.prevent="saveDraft"
      >
        <AppFormField
          name="talk-proposal-title"
          label="Title"
        >
          <AppInput
            id="talk-proposal-title"
            v-model="title"
            :disabled="!canEdit"
          />
          <p
            v-if="submitCount > 0 && errors.title"
            class="text-xs text-error"
          >
            {{ errors.title }}
          </p>
        </AppFormField>

        <AppFormField
          name="talk-proposal-abstract"
          label="Abstract"
        >
          <AppTextarea
            id="talk-proposal-abstract"
            v-model="abstract"
            :disabled="!canEdit"
            :rows="8"
          />
          <p
            v-if="submitCount > 0 && errors.abstract"
            class="text-xs text-error"
          >
            {{ errors.abstract }}
          </p>
        </AppFormField>

        <AppFormField
          name="talk-proposal-url"
          label="Demo or slides URL"
        >
          <AppInput
            id="talk-proposal-url"
            v-model="demoOrSlidesUrl"
            type="url"
            :disabled="!canEdit"
          />
          <p
            v-if="submitCount > 0 && errors.demoOrSlidesUrl"
            class="text-xs text-error"
          >
            {{ errors.demoOrSlidesUrl }}
          </p>
        </AppFormField>

        <div class="flex flex-wrap gap-3 border-t border-black/8 pt-5 dark:border-white/[0.08]">
          <AppButton
            v-if="canEdit"
            type="submit"
            :loading="actionPending"
            :disabled="actionPending"
          >
            {{ proposal ? 'Save draft' : 'Create draft' }}
          </AppButton>
          <AppButton
            v-if="proposal?.status === 'draft' && canMutate"
            type="button"
            color="primary"
            :loading="actionPending"
            :disabled="actionPending"
            @click="runAction('submit')"
          >
            Submit proposal
          </AppButton>
          <AppButton
            v-if="proposal?.status === 'submitted' && canMutate"
            type="button"
            color="error"
            variant="soft"
            :loading="actionPending"
            :disabled="actionPending"
            @click="runAction('withdraw')"
          >
            Withdraw proposal
          </AppButton>
          <AppButton
            v-if="proposal?.status === 'withdrawn' && canMutate"
            type="button"
            color="neutral"
            variant="soft"
            :loading="actionPending"
            :disabled="actionPending"
            @click="runAction('revise')"
          >
            Revise proposal
          </AppButton>
        </div>
      </form>
    </template>
  </AppCard>
</template>
