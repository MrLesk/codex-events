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
      @submit="submitForm"
      @upload-background-image="emit('uploadBackgroundImage', $event)"
      @remove-background-image="emit('removeBackgroundImage')"
      @upload-banner-image="emit('uploadBannerImage', $event)"
      @remove-banner-image="emit('removeBannerImage')"
    />
  </div>
</template>
