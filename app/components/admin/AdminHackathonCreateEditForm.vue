<script setup lang="ts">
import HackathonConfigForm from '~/components/admin/HackathonConfigForm.vue'

import type {
  HackathonFormState,
  HackathonRecord
} from '~/utils/admin-workspace'
import type { HackathonProgramSettingsMode } from '~/utils/hackathon-program-settings'

import {
  createEmptyHackathonFormState,
  createHackathonFormState
} from '~/utils/admin-workspace'
import { cloneFormValues } from '~/utils/form-values'

const emit = defineEmits<{
  submit: [form: HackathonFormState]
  uploadBackgroundImage: [file: File]
  removeBackgroundImage: []
  uploadBannerImage: [file: File]
  removeBannerImage: []
}>()

const props = defineProps<{
  initialHackathon?: HackathonRecord | null
  autoGenerateSlug?: boolean
  mode?: HackathonProgramSettingsMode
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

const form = reactive(createEmptyHackathonFormState())

function applyInitialHackathon() {
  if (!props.initialHackathon) {
    Object.assign(form, createEmptyHackathonFormState())
    return
  }

  Object.assign(form, createHackathonFormState(props.initialHackathon))
}

watch(() => props.initialHackathon, applyInitialHackathon, {
  immediate: true
})

function submitForm() {
  emit('submit', cloneFormValues(form))
}
</script>

<template>
  <div class="space-y-4">
    <AppAlert
      v-if="submitError"
      color="error"
      variant="soft"
      :title="initialHackathon ? 'Unable to save hackathon' : 'Unable to create hackathon'"
      :description="submitError"
    />

    <HackathonConfigForm
      v-model:form="form"
      :is-submitting="isSubmitting"
      :mode="mode"
      :submit-label="submitLabel"
      :helper-text="helperText"
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
