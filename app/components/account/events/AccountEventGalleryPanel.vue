<script setup lang="ts">
import type { EventPhotoRecord } from '#shared/domains/events/photos'
import type { ApiListResponse } from '~/lib/api'

import EventGalleryPanel from '~/components/events/EventGalleryPanel.vue'
import { normalizeApiError } from '~/lib/api'
import { createEventGalleryUploadBatches, createEventGalleryUploadItems } from '~/domains/events/gallery'

type AccountEventGalleryFilter = 'all' | 'highlighted' | 'not-highlighted' | 'public'

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
const pendingHighlightPhotoId = ref<string | null>(null)
const isUploading = ref(false)
const uploadingItems = ref(createEventGalleryUploadItems([]))
const galleryFilter = shallowRef<AccountEventGalleryFilter>('highlighted')
const hasResolvedInitialFilter = shallowRef(false)

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
const highlightedPhotoCount = computed(() => photos.value.filter(photo => photo.isHighlighted === true).length)
const notHighlightedPhotoCount = computed(() => photos.value.length - highlightedPhotoCount.value)
const publicPhotoCount = computed(() => photos.value.filter(photo => photo.isPubliclyVisible).length)
const galleryFilterOptions = computed<Array<{
  label: string
  value: AccountEventGalleryFilter
  count: number
}>>(() => {
  if (canManage.value) {
    return [
      { label: 'All', value: 'all', count: photos.value.length },
      { label: 'Highlighted', value: 'highlighted', count: highlightedPhotoCount.value },
      { label: 'Not highlighted', value: 'not-highlighted', count: notHighlightedPhotoCount.value },
      { label: 'Public', value: 'public', count: publicPhotoCount.value }
    ]
  }

  if (highlightedPhotoCount.value > 0 || galleryFilter.value === 'highlighted') {
    return [
      { label: 'Highlights', value: 'highlighted', count: highlightedPhotoCount.value },
      { label: 'All photos', value: 'all', count: photos.value.length }
    ]
  }

  return [
    { label: 'All photos', value: 'all', count: photos.value.length }
  ]
})
const visiblePhotos = computed(() => {
  if (galleryFilter.value === 'highlighted') {
    return photos.value.filter(photo => photo.isHighlighted === true)
  }

  if (galleryFilter.value === 'not-highlighted') {
    return photos.value.filter(photo => photo.isHighlighted !== true)
  }

  if (galleryFilter.value === 'public') {
    return photos.value.filter(photo => photo.isPubliclyVisible)
  }

  return photos.value
})
const loadErrorMessage = computed(() => photosError.value?.message ?? '')
const panelDescription = computed(() => canManage.value
  ? 'Upload the full event archive, mark the strongest photos as highlights, and choose which images also appear on the public page.'
  : 'Browse the protected gallery for this event. Highlights show the curated set, and all photos keeps the full archive available.'
)
const emptyStateDescription = computed(() => canManage.value
  ? 'Upload the first JPEG or PNG image to start the event gallery.'
  : 'Gallery photos will appear here once the event team adds them.'
)

watch([photosStatus, canManage, highlightedPhotoCount], () => {
  if (photosStatus.value !== 'success') {
    return
  }

  if (!hasResolvedInitialFilter.value) {
    galleryFilter.value = canManage.value
      ? 'all'
      : highlightedPhotoCount.value > 0 ? 'highlighted' : 'all'
    hasResolvedInitialFilter.value = true
    return
  }

  const validFilters = new Set(galleryFilterOptions.value.map(option => option.value))

  if (!validFilters.has(galleryFilter.value)) {
    galleryFilter.value = galleryFilterOptions.value[0]?.value ?? 'all'
  }
}, {
  immediate: true
})

watch(eventId, () => {
  hasResolvedInitialFilter.value = false
  galleryFilter.value = canManage.value ? 'all' : 'highlighted'
})

async function uploadPhotos(files: File[]) {
  if (!canManage.value || files.length === 0 || isUploading.value) {
    return
  }

  mutationErrorMessage.value = ''
  uploadingItems.value = createEventGalleryUploadItems(files)
  isUploading.value = true
  const targetEventId = eventId.value
  const uploadBatches = createEventGalleryUploadBatches(files)
  let uploadedCount = 0

  try {
    for (const batch of uploadBatches) {
      const formData = new FormData()

      for (const file of batch) {
        formData.append('file', file)
      }

      await $fetch(`/api/events/${targetEventId}/photos`, {
        method: 'POST',
        body: formData
      })

      uploadedCount += batch.length
      uploadingItems.value = createEventGalleryUploadItems(files.slice(uploadedCount))
    }

    await refreshPhotos()
    toast.add({
      title: files.length === 1 ? 'Photo added' : 'Photos added',
      description: files.length === 1
        ? 'The gallery now includes the new photo.'
        : `The gallery now includes ${files.length} new photos.`,
      color: 'success'
    })
  } catch (error) {
    const errorMessage = normalizeApiError(error).message
    mutationErrorMessage.value = uploadedCount > 0
      ? `${uploadedCount} ${uploadedCount === 1 ? 'photo was' : 'photos were'} added before the upload stopped. ${errorMessage}`
      : errorMessage

    if (uploadedCount > 0) {
      await refreshPhotos()
    }
  } finally {
    isUploading.value = false
    uploadingItems.value = []
  }
}

async function deletePhoto(photo: EventPhotoRecord) {
  if (!canManage.value || pendingDeletePhotoId.value || pendingPublicVisibilityPhotoId.value || pendingHighlightPhotoId.value) {
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
  if (!canManage.value || pendingDeletePhotoId.value || pendingPublicVisibilityPhotoId.value || pendingHighlightPhotoId.value) {
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

async function toggleHighlight(payload: { photo: EventPhotoRecord, value: boolean }) {
  if (!canManage.value || pendingDeletePhotoId.value || pendingPublicVisibilityPhotoId.value || pendingHighlightPhotoId.value) {
    return
  }

  mutationErrorMessage.value = ''
  pendingHighlightPhotoId.value = payload.photo.id

  try {
    await $fetch(`/api/events/${eventId.value}/photos/${payload.photo.id}/highlight`, {
      method: 'PATCH',
      body: {
        isHighlighted: payload.value
      }
    })

    await refreshPhotos()
    toast.add({
      title: payload.value ? 'Photo highlighted' : 'Highlight removed',
      description: payload.value
        ? 'The image now appears in the highlighted gallery view.'
        : 'The image remains available in all photos.',
      color: 'success'
    })
  } catch (error) {
    mutationErrorMessage.value = normalizeApiError(error).message
  } finally {
    pendingHighlightPhotoId.value = null
  }
}
</script>

<template>
  <EventGalleryPanel
    v-model:active-filter="galleryFilter"
    :description="panelDescription"
    :photos="visiblePhotos"
    :total-photo-count="photos.length"
    :filter-options="galleryFilterOptions"
    :can-manage="canManage"
    :can-toggle-public-visibility="canManage"
    :can-toggle-highlight="canManage"
    :show-curation-badges="true"
    :show-uploader="true"
    :is-loading="photosStatus === 'pending'"
    :load-error-message="photosStatus === 'error' ? loadErrorMessage : ''"
    :mutation-error-message="mutationErrorMessage"
    :is-uploading="isUploading"
    :uploading-items="uploadingItems"
    :pending-delete-photo-id="pendingDeletePhotoId"
    :pending-public-visibility-photo-id="pendingPublicVisibilityPhotoId"
    :pending-highlight-photo-id="pendingHighlightPhotoId"
    add-button-label="Add photos"
    empty-state-title="No gallery photos yet"
    :empty-state-description="emptyStateDescription"
    empty-filtered-state-title="No photos in this view"
    empty-filtered-state-description="Switch filters to keep browsing the event gallery."
    @upload-photos="uploadPhotos"
    @delete-photo="deletePhoto"
    @toggle-public-visibility="togglePublicVisibility"
    @toggle-highlight="toggleHighlight"
  />
</template>
