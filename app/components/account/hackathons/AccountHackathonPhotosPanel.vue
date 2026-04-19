<script setup lang="ts">
import type { HackathonPhotoRecord } from '../../../../shared/hackathon-photos'

import 'photoswipe/style.css'

import { formatTimestamp } from '~/utils/date-formatting'
import { normalizeApiError } from '~/utils/admin-workspace'

type ApiListResponse<T> = {
  data: T
  meta?: {
    total?: number
  }
}

type PhotoSwipeLightboxInstance = {
  init: () => void
  destroy: () => void
}

type PhotoSwipeLightboxCtor = new (options: Record<string, unknown>) => PhotoSwipeLightboxInstance

const props = defineProps<{
  hackathonId: string
  canManage: boolean
}>()

const toast = useToast()
const hackathonId = computed(() => props.hackathonId.trim())
const canManage = computed(() => props.canManage)
const fileInput = ref<HTMLInputElement | null>(null)
const galleryElement = ref<HTMLElement | null>(null)
const uploadErrorMessage = ref('')
const pendingDeletePhotoId = ref<string | null>(null)
const isUploading = ref(false)
let photoLightbox: PhotoSwipeLightboxInstance | null = null
let photoSwipeLightboxCtor: PhotoSwipeLightboxCtor | null = null

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
const photoCountLabel = computed(() => `${photos.value.length} ${photos.value.length === 1 ? 'photo' : 'photos'}`)
const panelDescription = computed(() => canManage.value
  ? 'Capture the atmosphere of the hackathon in one protected gallery. Upload new images, remove outdated ones, and open any frame in the lightbox.'
  : 'Browse the protected gallery for this hackathon. Open any image to see it at full size.'
)
const photosErrorMessage = computed(() => photosError.value?.message ?? '')

async function uploadPhotos(files: File[]) {
  if (!canManage.value || files.length === 0) {
    return
  }

  uploadErrorMessage.value = ''
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
      title: files.length === 1 ? 'Photo uploaded' : 'Photos uploaded',
      description: files.length === 1
        ? 'The gallery now includes the new photo.'
        : `The gallery now includes ${files.length} new photos.`,
      color: 'success'
    })
  } catch (error) {
    uploadErrorMessage.value = normalizeApiError(error).message
  } finally {
    isUploading.value = false

    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

async function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const files = Array.from(input?.files ?? [])
  await uploadPhotos(files)
}

function openFilePicker() {
  fileInput.value?.click()
}

async function deletePhoto(photo: HackathonPhotoRecord) {
  if (!canManage.value || pendingDeletePhotoId.value) {
    return
  }

  const confirmed = window.confirm(
    `Delete ${photo.fileName ?? 'this photo'} from the hackathon gallery?`
  )

  if (!confirmed) {
    return
  }

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
    uploadErrorMessage.value = normalizeApiError(error).message
  } finally {
    pendingDeletePhotoId.value = null
  }
}

function formatPhotoTimestamp(value: string) {
  return formatTimestamp(value, 'Unknown upload time')
}

async function ensurePhotoLightbox() {
  if (!import.meta.client || !galleryElement.value || photos.value.length === 0) {
    photoLightbox?.destroy()
    photoLightbox = null
    return
  }

  if (!photoSwipeLightboxCtor) {
    const module = await import('photoswipe/lightbox')
    photoSwipeLightboxCtor = module.default as PhotoSwipeLightboxCtor
  }

  photoLightbox?.destroy()
  photoLightbox = new photoSwipeLightboxCtor!({
    gallery: galleryElement.value,
    children: 'a[data-photoswipe-photo]',
    loop: true,
    showHideAnimationType: 'zoom',
    pswpModule: async () => await import('photoswipe')
  })
  photoLightbox.init()
}

onMounted(async () => {
  await ensurePhotoLightbox()
})

watch([galleryElement, photos], async () => {
  await ensurePhotoLightbox()
}, {
  flush: 'post'
})

onBeforeUnmount(() => {
  photoLightbox?.destroy()
  photoLightbox = null
})
</script>

<template>
  <AppCard class="rounded-xl hackathon-workspace-detail-panel">
    <template #header>
      <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="text-lg font-semibold text-highlighted">
              Photos
            </h2>
            <AppBadge
              color="neutral"
              variant="soft"
              class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
            >
              {{ photoCountLabel }}
            </AppBadge>
          </div>
          <p class="max-w-3xl text-sm text-muted">
            {{ panelDescription }}
          </p>
        </div>

        <div
          v-if="canManage"
          class="flex shrink-0 flex-wrap items-center gap-3"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png"
            multiple
            class="hidden"
            @change="onFileInputChange"
          >

          <AppButton
            color="primary"
            :loading="isUploading"
            icon="i-lucide-upload"
            @click="openFilePicker"
          >
            Add photos
          </AppButton>
        </div>
      </div>
    </template>

    <div class="space-y-5">
      <AppAlert
        v-if="uploadErrorMessage"
        color="error"
        variant="soft"
        title="Unable to update the gallery"
        :description="uploadErrorMessage"
      />

      <AppAlert
        v-if="photosStatus === 'error' && photosErrorMessage"
        color="error"
        variant="soft"
        title="Unable to load photos"
        :description="photosErrorMessage"
      />

      <div
        v-if="photosStatus === 'pending'"
        class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <div
          v-for="placeholder in 6"
          :key="placeholder"
          class="aspect-[4/3] animate-pulse rounded-2xl bg-black/[0.05] dark:bg-white/[0.06]"
        />
      </div>

      <div
        v-else-if="photos.length === 0"
        class="rounded-2xl border border-dashed border-black/10 px-6 py-10 text-center dark:border-white/[0.08]"
      >
        <p class="text-base font-semibold text-highlighted">
          No photos yet
        </p>
        <p class="mt-2 text-sm text-muted">
          <template v-if="canManage">
            Upload the first JPEG or PNG image to start the hackathon gallery.
          </template>
          <template v-else>
            Photos will appear here once the hackathon team publishes them.
          </template>
        </p>
      </div>

      <div
        v-else
        ref="galleryElement"
        class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <article
          v-for="photo in photos"
          :key="photo.id"
          class="group relative overflow-hidden rounded-2xl border border-black/8 bg-white/70 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)] transition-transform duration-300 hover:-translate-y-0.5 dark:border-white/[0.08] dark:bg-[#111111]"
        >
          <a
            :href="photo.originalUrl"
            :data-photoswipe-photo="photo.id"
            :data-pswp-width="photo.width"
            :data-pswp-height="photo.height"
            :aria-label="`Open ${photo.fileName ?? 'hackathon photo'}`"
            class="block"
          >
            <div
              class="overflow-hidden bg-black/[0.04] dark:bg-white/[0.04]"
              :style="{ aspectRatio: `${photo.width} / ${photo.height}` }"
            >
              <img
                :src="photo.previewUrl"
                :alt="photo.fileName ?? 'Hackathon photo'"
                loading="lazy"
                class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              >
            </div>
          </a>

          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/78 via-black/38 to-transparent px-4 pb-4 pt-10 text-white">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 space-y-1">
                <p class="truncate text-sm font-semibold">
                  {{ photo.fileName ?? 'Hackathon photo' }}
                </p>
                <p class="text-xs text-white/78">
                  {{ formatPhotoTimestamp(photo.createdAt) }}
                </p>
                <p
                  v-if="photo.uploadedBy"
                  class="truncate text-xs text-white/66"
                >
                  Added by {{ photo.uploadedBy.displayName }}
                </p>
              </div>

              <AppButton
                v-if="canManage"
                color="error"
                variant="soft"
                size="sm"
                class="shrink-0"
                :loading="pendingDeletePhotoId === photo.id"
                :disabled="pendingDeletePhotoId !== null"
                @click.prevent="deletePhoto(photo)"
              >
                Delete
              </AppButton>
            </div>
          </div>
        </article>
      </div>
    </div>
  </AppCard>
</template>
