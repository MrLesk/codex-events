<script setup lang="ts">
import type { HackathonPhotoRecord } from '../../../../shared/hackathon-photos'

import HackathonGalleryPanel from '~/components/hackathons/HackathonGalleryPanel.vue'
import { normalizeApiError } from '~/utils/admin-workspace'

type ApiListResponse<T> = {
  data: T
  meta?: {
    total?: number
  }
}

const props = defineProps<{
  hackathonId: string
  canManage: boolean
}>()

const toast = useToast()
const hackathonId = computed(() => props.hackathonId.trim())
const canManage = computed(() => props.canManage)
const mutationErrorMessage = ref('')
const pendingDeletePhotoId = ref<string | null>(null)
const pendingPublicVisibilityPhotoId = ref<string | null>(null)
const isUploading = ref(false)

const {
  data: photosResponse,
  status: photosStatus,
  error: photosError,
  refresh: refreshPhotos
} = useFetch<ApiListResponse<HackathonPhotoRecord[]>>(
  () => `/api/hackathons/${hackathonId.value}/photos`,
  {
    key: () => `hackathon-photos:${hackathonId.value}`,
    watch: [hackathonId]
  }
)

const photos = computed(() => photosResponse.value?.data ?? [])
const loadErrorMessage = computed(() => photosError.value?.message ?? '')
const panelDescription = computed(() => canManage.value
  ? 'Capture the atmosphere of the hackathon in one gallery. Upload new images, remove outdated ones, and choose which images also appear on the public page.'
  : 'Browse the protected gallery for this hackathon. Open any image to see it at full size.'
)
const emptyStateDescription = computed(() => canManage.value
  ? 'Upload the first JPEG or PNG image to start the hackathon gallery.'
  : 'Gallery photos will appear here once the hackathon team adds them.'
)

async function uploadPhotos(files: File[]) {
  if (!canManage.value || files.length === 0) {
    return
  }

  mutationErrorMessage.value = ''
  isUploading.value = true

  try {
    const formData = new FormData()

    for (const file of files) {
      formData.append('file', file)
    }

    await $fetch(`/api/hackathons/${hackathonId.value}/photos`, {
      method: 'POST',
      body: formData
    })

    await refreshPhotos()
    toast.add({
      title: files.length === 1 ? 'Photo added' : 'Photos added',
      description: files.length === 1
        ? 'The gallery now includes the new photo.'
        : `The gallery now includes ${files.length} new photos.`,
      color: 'success'
    })
  } catch (error) {
    mutationErrorMessage.value = normalizeApiError(error).message
  } finally {
    isUploading.value = false
  }
}

async function deletePhoto(photo: HackathonPhotoRecord) {
  if (!canManage.value || pendingDeletePhotoId.value || pendingPublicVisibilityPhotoId.value) {
    return
  }

  const confirmed = window.confirm(`Delete ${photo.fileName ?? 'this photo'} from the hackathon gallery?`)

  if (!confirmed) {
    return
  }

  mutationErrorMessage.value = ''
  pendingDeletePhotoId.value = photo.id

  try {
    await $fetch(`/api/hackathons/${hackathonId.value}/photos/${photo.id}`, {
      method: 'DELETE'
    })

    await refreshPhotos()
    toast.add({
      title: 'Photo removed',
      description: 'The gallery was updated.',
      color: 'success'
    })
  } catch (error) {
    mutationErrorMessage.value = normalizeApiError(error).message
  } finally {
    pendingDeletePhotoId.value = null
  }
}

async function togglePublicVisibility(payload: { photo: HackathonPhotoRecord, value: boolean }) {
  if (!canManage.value || pendingDeletePhotoId.value || pendingPublicVisibilityPhotoId.value) {
    return
  }

  mutationErrorMessage.value = ''
  pendingPublicVisibilityPhotoId.value = payload.photo.id

  try {
    await $fetch(`/api/hackathons/${hackathonId.value}/photos/${payload.photo.id}/public-visibility`, {
      method: 'PATCH',
      body: {
        isPubliclyVisible: payload.value
      }
    })

    await refreshPhotos()
    toast.add({
      title: payload.value ? 'Added to public gallery' : 'Removed from public gallery',
      description: payload.value
        ? 'The image now appears on the public hackathon page.'
        : 'The image is now visible only in the protected gallery.',
      color: 'success'
    })
  } catch (error) {
    mutationErrorMessage.value = normalizeApiError(error).message
  } finally {
    pendingPublicVisibilityPhotoId.value = null
  }
}
</script>

<template>
  <HackathonGalleryPanel
    :description="panelDescription"
    :photos="photos"
    :can-manage="canManage"
    :can-toggle-public-visibility="canManage"
    :show-uploader="true"
    :is-loading="photosStatus === 'pending'"
    :load-error-message="photosStatus === 'error' ? loadErrorMessage : ''"
    :mutation-error-message="mutationErrorMessage"
    :is-uploading="isUploading"
    :pending-delete-photo-id="pendingDeletePhotoId"
    :pending-public-visibility-photo-id="pendingPublicVisibilityPhotoId"
    add-button-label="Add photos"
    empty-state-title="No gallery photos yet"
    :empty-state-description="emptyStateDescription"
    @upload-photos="uploadPhotos"
    @delete-photo="deletePhoto"
    @toggle-public-visibility="togglePublicVisibility"
  />
</template>
