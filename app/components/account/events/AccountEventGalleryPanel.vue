<script setup lang="ts">
import type { EventPhotoRecord } from '#shared/domains/events/photos'
import type { ApiListResponse } from '~/lib/api'

import EventGalleryPanel from '~/components/events/EventGalleryPanel.vue'
import { normalizeApiError } from '~/lib/api'
import { createEventGalleryUploadItems } from '~/domains/events/gallery'

const props = defineProps<{
  eventId: string
  canManage: boolean
}>()

const toast = useToast()
const eventId = computed(() => props.eventId.trim())
const canManage = computed(() => props.canManage)
const mutationErrorMessage = ref('')
const pendingDeletePhotoId = ref<string | null>(null)
const pendingPublicVisibilityPhotoId = ref<string | null>(null)
const isUploading = ref(false)
const uploadingItems = ref(createEventGalleryUploadItems([]))

const {
  data: photosResponse,
  status: photosStatus,
  error: photosError,
  refresh: refreshPhotos
} = useFetch<ApiListResponse<EventPhotoRecord>>(
  () => `/api/events/${eventId.value}/photos`,
  {
    key: () => `event-photos:${eventId.value}`,
    watch: [eventId]
  }
)

const photos = computed(() => photosResponse.value?.data ?? [])
const loadErrorMessage = computed(() => photosError.value?.message ?? '')
const panelDescription = computed(() => canManage.value
  ? 'Capture the atmosphere of the event in one gallery. Upload new images, remove outdated ones, and choose which images also appear on the public page.'
  : 'Browse the protected gallery for this event. Open any image to see it at full size.'
)
const emptyStateDescription = computed(() => canManage.value
  ? 'Upload the first JPEG or PNG image to start the event gallery.'
  : 'Gallery photos will appear here once the event team adds them.'
)

async function uploadPhotos(files: File[]) {
  if (!canManage.value || files.length === 0 || isUploading.value) {
    return
  }

  mutationErrorMessage.value = ''
  uploadingItems.value = createEventGalleryUploadItems(files)
  isUploading.value = true

  try {
    const formData = new FormData()

    for (const file of files) {
      formData.append('file', file)
    }

    await $fetch(`/api/events/${eventId.value}/photos`, {
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
    uploadingItems.value = []
  }
}

async function deletePhoto(photo: EventPhotoRecord) {
  if (!canManage.value || pendingDeletePhotoId.value || pendingPublicVisibilityPhotoId.value) {
    return
  }

  const confirmed = window.confirm(`Delete ${photo.fileName ?? 'this photo'} from the event gallery?`)

  if (!confirmed) {
    return
  }

  mutationErrorMessage.value = ''
  pendingDeletePhotoId.value = photo.id

  try {
    await $fetch(`/api/events/${eventId.value}/photos/${photo.id}`, {
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

async function togglePublicVisibility(payload: { photo: EventPhotoRecord, value: boolean }) {
  if (!canManage.value || pendingDeletePhotoId.value || pendingPublicVisibilityPhotoId.value) {
    return
  }

  mutationErrorMessage.value = ''
  pendingPublicVisibilityPhotoId.value = payload.photo.id

  try {
    await $fetch(`/api/events/${eventId.value}/photos/${payload.photo.id}/public-visibility`, {
      method: 'PATCH',
      body: {
        isPubliclyVisible: payload.value
      }
    })

    await refreshPhotos()
    toast.add({
      title: payload.value ? 'Added to public gallery' : 'Removed from public gallery',
      description: payload.value
        ? 'The image now appears on the public event page.'
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
  <EventGalleryPanel
    :description="panelDescription"
    :photos="photos"
    :can-manage="canManage"
    :can-toggle-public-visibility="canManage"
    :show-uploader="true"
    :is-loading="photosStatus === 'pending'"
    :load-error-message="photosStatus === 'error' ? loadErrorMessage : ''"
    :mutation-error-message="mutationErrorMessage"
    :is-uploading="isUploading"
    :uploading-items="uploadingItems"
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
