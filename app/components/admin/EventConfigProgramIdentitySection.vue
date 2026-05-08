<script setup lang="ts">
import type { EventFormState } from '~/domains/events/admin-event'

import { getCountryOptions } from '~/utils/country-options'

const form = defineModel<EventFormState>('form', {
  required: true
})

const props = defineProps<{
  description: string
  canUploadManagedImages?: boolean
  backgroundImageUploadPending?: boolean
  backgroundImageUploadError?: string
  bannerImageUploadPending?: boolean
  bannerImageUploadError?: string
}>()

const emit = defineEmits<{
  uploadBackgroundImage: [file: File]
  removeBackgroundImage: []
  uploadBannerImage: [file: File]
  removeBannerImage: []
}>()

const countryOptions = computed(() => getCountryOptions(form.value.country))
const backgroundImageInput = ref<HTMLInputElement | null>(null)
const bannerImageInput = ref<HTMLInputElement | null>(null)
const managedBackgroundImageUrl = computed(() => form.value.backgroundImageUrl.trim())
const managedBannerImageUrl = computed(() => form.value.bannerImageUrl.trim())
const showBackgroundImageSection = computed(() =>
  Boolean(props.canUploadManagedImages || managedBackgroundImageUrl.value)
)
const showBannerImageSection = computed(() =>
  Boolean(props.canUploadManagedImages || managedBannerImageUrl.value)
)

function uploadBackgroundImage(event: Event) {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.item(0) ?? null

  if (!file) {
    return
  }

  emit('uploadBackgroundImage', file)

  if (target) {
    target.value = ''
  }
}

function uploadBannerImage(event: Event) {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.item(0) ?? null

  if (!file) {
    return
  }

  emit('uploadBannerImage', file)

  if (target) {
    target.value = ''
  }
}

function promptBackgroundImageUpload() {
  backgroundImageInput.value?.click()
}

function promptBannerImageUpload() {
  bannerImageInput.value?.click()
}
</script>

<template>
  <AppCard
    id="admin-config-identity"
    class="scroll-mt-28 rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60"
  >
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Program Identity
        </h2>
        <p class="text-sm text-muted">
          {{ description }}
        </p>
      </div>
    </template>

    <div class="grid grid-cols-1 gap-5">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.6fr)]">
        <label class="grid gap-2">
          <span class="text-sm font-medium text-toned">City</span>
          <AppInput
            v-model="form.city"
            type="text"
            placeholder="Vienna"
            required
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-medium text-toned">Country</span>
          <div>
            <AppSelect
              v-model="form.country"
              required
            >
              <option
                disabled
                value=""
              >
                Select a country
              </option>
              <option
                v-for="option in countryOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </AppSelect>
          </div>
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-medium text-toned">Address</span>
          <AppInput
            v-model="form.address"
            type="text"
            placeholder="Operngasse 20, 1040 Vienna"
            required
          />
        </label>
      </div>

      <section
        v-if="showBackgroundImageSection"
        class="grid grid-cols-1 gap-3"
      >
        <div class="space-y-1">
          <h3 class="text-sm font-medium text-toned">
            Background image
          </h3>
          <p class="text-xs text-muted">
            Managed image upload only. JPG/PNG up to 5MB.
          </p>
        </div>

        <div class="overflow-hidden rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111]">
          <img
            v-if="managedBackgroundImageUrl"
            :src="managedBackgroundImageUrl"
            alt="Event background preview"
            class="h-36 w-full object-cover"
          >
          <div
            v-else
            class="flex h-36 items-center justify-center px-4 text-center text-sm text-muted"
          >
            No background image uploaded yet.
          </div>
        </div>

        <div
          v-if="props.canUploadManagedImages"
          class="flex flex-wrap items-center gap-2"
        >
          <input
            ref="backgroundImageInput"
            type="file"
            accept="image/jpeg,image/png"
            class="sr-only"
            :disabled="props.backgroundImageUploadPending"
            @change="uploadBackgroundImage"
          >
          <AppButton
            type="button"
            color="neutral"
            variant="soft"
            size="sm"
            :disabled="props.backgroundImageUploadPending"
            @click="promptBackgroundImageUpload"
          >
            {{ managedBackgroundImageUrl ? 'Replace background image' : 'Upload background image' }}
          </AppButton>
          <AppButton
            v-if="managedBackgroundImageUrl"
            type="button"
            color="neutral"
            variant="soft"
            size="sm"
            :disabled="props.backgroundImageUploadPending"
            @click="emit('removeBackgroundImage')"
          >
            Remove uploaded background
          </AppButton>
        </div>
        <p
          v-else
          class="text-xs text-muted"
        >
          Save the draft first to enable managed background uploads.
        </p>

        <p
          v-if="props.backgroundImageUploadError"
          class="text-xs text-error"
        >
          {{ props.backgroundImageUploadError }}
        </p>
      </section>

      <section
        v-if="showBannerImageSection"
        class="grid grid-cols-1 gap-3"
      >
        <div class="space-y-1">
          <h3 class="text-sm font-medium text-toned">
            Banner image
          </h3>
          <p class="text-xs text-muted">
            Managed image upload only. JPG/PNG up to 5MB.
          </p>
        </div>

        <div class="overflow-hidden rounded-lg border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111]">
          <img
            v-if="managedBannerImageUrl"
            :src="managedBannerImageUrl"
            alt="Event banner preview"
            class="h-36 w-full object-cover"
          >
          <div
            v-else
            class="flex h-36 items-center justify-center px-4 text-center text-sm text-muted"
          >
            No banner image uploaded yet.
          </div>
        </div>

        <div
          v-if="props.canUploadManagedImages"
          class="flex flex-wrap items-center gap-2"
        >
          <input
            ref="bannerImageInput"
            type="file"
            accept="image/jpeg,image/png"
            class="sr-only"
            :disabled="props.bannerImageUploadPending"
            @change="uploadBannerImage"
          >
          <AppButton
            type="button"
            color="neutral"
            variant="soft"
            size="sm"
            :disabled="props.bannerImageUploadPending"
            @click="promptBannerImageUpload"
          >
            {{ managedBannerImageUrl ? 'Replace banner image' : 'Upload banner image' }}
          </AppButton>
          <AppButton
            v-if="managedBannerImageUrl"
            type="button"
            color="neutral"
            variant="soft"
            size="sm"
            :disabled="props.bannerImageUploadPending"
            @click="emit('removeBannerImage')"
          >
            Remove uploaded banner
          </AppButton>
        </div>
        <p
          v-else
          class="text-xs text-muted"
        >
          Save the draft first to enable managed banner uploads.
        </p>

        <p
          v-if="props.bannerImageUploadError"
          class="text-xs text-error"
        >
          {{ props.bannerImageUploadError }}
        </p>
      </section>
    </div>
  </AppCard>
</template>
