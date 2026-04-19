<script setup lang="ts">
import type { HackathonPhotoRecord } from '../../../shared/hackathon-photos'

import 'photoswipe/style.css'

import { Switch as UiSwitch } from '~/components/ui/switch'
import { formatTimestamp } from '~/utils/date-formatting'

type PhotoSwipeLightboxInstance = {
  init: () => void
  destroy: () => void
}

type PhotoSwipeLightboxCtor = new (options: Record<string, unknown>) => PhotoSwipeLightboxInstance

const props = withDefaults(defineProps<{
  description: string
  photos: HackathonPhotoRecord[]
  canManage?: boolean
  canTogglePublicVisibility?: boolean
  showUploader?: boolean
  isLoading?: boolean
  loadErrorMessage?: string
  mutationErrorMessage?: string
  isUploading?: boolean
  pendingDeletePhotoId?: string | null
  pendingPublicVisibilityPhotoId?: string | null
  addButtonLabel?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
}>(), {
  canManage: false,
  canTogglePublicVisibility: false,
  showUploader: false,
  isLoading: false,
  loadErrorMessage: '',
  mutationErrorMessage: '',
  isUploading: false,
  pendingDeletePhotoId: null,
  pendingPublicVisibilityPhotoId: null,
  addButtonLabel: 'Add photos',
  emptyStateTitle: 'No gallery photos yet',
  emptyStateDescription: 'Gallery photos will appear here once they are available.'
})

const emit = defineEmits<{
  uploadPhotos: [files: File[]]
  deletePhoto: [photo: HackathonPhotoRecord]
  togglePublicVisibility: [payload: { photo: HackathonPhotoRecord, value: boolean }]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const galleryElement = ref<HTMLElement | null>(null)
const photoCountLabel = computed(() => `${props.photos.length} ${props.photos.length === 1 ? 'photo' : 'photos'}`)
const showInitialLoadingState = computed(() => props.isLoading && props.photos.length === 0)
const hasPendingMutation = computed(() =>
  props.pendingDeletePhotoId !== null || props.pendingPublicVisibilityPhotoId !== null
)

let photoLightbox: PhotoSwipeLightboxInstance | null = null
let photoSwipeLightboxCtor: PhotoSwipeLightboxCtor | null = null

function formatPhotoTimestamp(value: string) {
  return formatTimestamp(value, 'Unknown upload time')
}

function publicVisibilitySwitchId(photoId: string) {
  return `hackathon-gallery-public-visibility-${photoId}`
}

function publicVisibilityStatusLabel(photo: HackathonPhotoRecord) {
  return photo.isPubliclyVisible ? 'Visible on the public page' : 'Only in the protected gallery'
}

function openFilePicker() {
  fileInput.value?.click()
}

function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const files = Array.from(input?.files ?? [])

  if (files.length > 0) {
    emit('uploadPhotos', files)
  }

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function ensurePhotoLightbox() {
  if (!import.meta.client || !galleryElement.value || props.photos.length === 0) {
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

watch([galleryElement, () => props.photos], async () => {
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
              Gallery
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
            {{ description }}
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
            icon="i-lucide-upload"
            :loading="isUploading"
            @click="openFilePicker"
          >
            {{ addButtonLabel }}
          </AppButton>
        </div>
      </div>
    </template>

    <div class="space-y-5">
      <AppAlert
        v-if="mutationErrorMessage"
        color="error"
        variant="soft"
        title="Unable to update the gallery"
        :description="mutationErrorMessage"
      />

      <AppAlert
        v-if="loadErrorMessage"
        color="error"
        variant="soft"
        title="Unable to load the gallery"
        :description="loadErrorMessage"
      />

      <div
        v-if="showInitialLoadingState"
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
          {{ emptyStateTitle }}
        </p>
        <p class="mt-2 text-sm text-muted">
          {{ emptyStateDescription }}
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
          class="group overflow-hidden rounded-2xl border border-black/8 bg-white/80 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)] dark:border-white/[0.08] dark:bg-[#111111]"
        >
          <a
            :href="photo.originalUrl"
            :data-photoswipe-photo="photo.id"
            :data-pswp-width="photo.width"
            :data-pswp-height="photo.height"
            :aria-label="`Open ${photo.fileName ?? 'gallery photo'}`"
            class="block"
          >
            <div
              class="overflow-hidden bg-black/[0.04] dark:bg-white/[0.04]"
              :style="{ aspectRatio: `${photo.width} / ${photo.height}` }"
            >
              <img
                :src="photo.previewUrl"
                :alt="photo.fileName ?? 'Gallery photo'"
                loading="lazy"
                class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              >
            </div>
          </a>

          <div class="space-y-4 p-4">
            <div class="space-y-1">
              <p class="truncate text-sm font-semibold text-highlighted dark:text-white">
                {{ photo.fileName ?? 'Gallery photo' }}
              </p>
              <p class="text-xs text-muted">
                {{ formatPhotoTimestamp(photo.createdAt) }}
              </p>
              <p
                v-if="showUploader && photo.uploadedBy"
                class="truncate text-xs text-muted"
              >
                Added by {{ photo.uploadedBy.displayName }}
              </p>
            </div>

            <div
              v-if="canTogglePublicVisibility || canManage"
              class="flex flex-col gap-4 border-t border-black/8 pt-4 dark:border-white/[0.08]"
            >
              <div
                v-if="canTogglePublicVisibility"
                class="flex items-start justify-between gap-4"
              >
                <div class="space-y-1">
                  <label
                    :for="publicVisibilitySwitchId(photo.id)"
                    class="text-sm font-medium text-highlighted dark:text-white"
                  >
                    Show on the public page
                  </label>
                  <p class="text-sm text-muted">
                    Selected images appear in the public Gallery tab for this hackathon.
                  </p>
                  <p class="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                    {{ publicVisibilityStatusLabel(photo) }}
                  </p>
                </div>

                <UiSwitch
                  :id="publicVisibilitySwitchId(photo.id)"
                  :model-value="photo.isPubliclyVisible"
                  :disabled="hasPendingMutation"
                  @update:model-value="emit('togglePublicVisibility', { photo, value: Boolean($event) })"
                />
              </div>

              <div
                v-if="canManage"
                class="flex justify-end"
              >
                <AppButton
                  color="error"
                  variant="soft"
                  size="sm"
                  :loading="pendingDeletePhotoId === photo.id"
                  :disabled="hasPendingMutation"
                  @click.prevent="emit('deletePhoto', photo)"
                >
                  Delete
                </AppButton>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </AppCard>
</template>
