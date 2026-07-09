<script setup lang="ts">
import EventConfigForm from '~/components/admin/EventConfigForm.vue'

import type {
  EventFormState
} from '~/domains/events/admin-event'
import type {
  EventRecord
} from '~/domains/events/records'
import type { EventProgramSettingsMode } from '~/domains/events/program-settings'

import {
  createEmptyEventFormState,
  createEventFormState
} from '~/domains/events/admin-event'
import { cloneFormValues } from '~/utils/form-values'

const emit = defineEmits<{
  submit: [form: EventFormState]
  uploadBackgroundImage: [file: File]
  removeBackgroundImage: []
  uploadBannerImage: [file: File]
  removeBannerImage: []
  retryLumaConfiguration: []
}>()

const props = defineProps<{
  initialEvent?: EventRecord | null
  autoGenerateSlug?: boolean
  mode?: EventProgramSettingsMode
  submitLabel: string
  helperText?: string
  submitError?: string
  isSubmitting?: boolean
  canUploadManagedImages?: boolean
  backgroundImageUploadPending?: boolean
  backgroundImageUploadError?: string
  bannerImageUploadPending?: boolean
  bannerImageUploadError?: string
  imageVersion?: string | null
  isRetryingLumaConfiguration?: boolean
}>()

const form = reactive(createEmptyEventFormState())
const submitErrorTitle = computed(() => props.initialEvent ? 'Unable to save event' : 'Unable to create event')

function applyInitialEvent() {
  if (!props.initialEvent) {
    Object.assign(form, createEmptyEventFormState())
    return
  }

  Object.assign(form, createEventFormState(props.initialEvent))
}

watch(() => props.initialEvent, applyInitialEvent, {
  immediate: true
})

function submitForm() {
  emit('submit', cloneFormValues(form))
}
</script>

<template>
  <div class="space-y-4">
    <EventConfigForm
      v-model:form="form"
      :is-submitting="isSubmitting"
      :mode="mode"
      :submit-label="submitLabel"
      :helper-text="helperText"
      :submit-error="submitError"
      :submit-error-title="submitErrorTitle"
      :auto-generate-slug="autoGenerateSlug"
      :can-upload-managed-images="canUploadManagedImages"
      :background-image-upload-pending="backgroundImageUploadPending"
      :background-image-upload-error="backgroundImageUploadError"
      :banner-image-upload-pending="bannerImageUploadPending"
      :banner-image-upload-error="bannerImageUploadError"
      :image-version="imageVersion"
      :event-id="initialEvent?.id ?? null"
      :persisted-simplified-claiming-enabled="initialEvent?.simplifiedClaimingEnabled ?? false"
      :luma-webhook-url="initialEvent?.lumaWebhookUrl ?? null"
      :luma-webhook-status="initialEvent?.lumaWebhookStatus ?? null"
      :luma-webhook-error="initialEvent?.lumaWebhookError ?? null"
      :luma-webhook-registered-at="initialEvent?.lumaWebhookRegisteredAt ?? null"
      :is-retrying-luma-configuration="isRetryingLumaConfiguration"
      track-description-field-type="markdown"
      @submit="submitForm"
      @upload-background-image="emit('uploadBackgroundImage', $event)"
      @remove-background-image="emit('removeBackgroundImage')"
      @upload-banner-image="emit('uploadBannerImage', $event)"
      @remove-banner-image="emit('removeBannerImage')"
      @retry-luma-configuration="emit('retryLumaConfiguration')"
    />
  </div>
</template>
