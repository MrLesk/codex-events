<script setup lang="ts">
import type { EventCertificate } from '#shared/domains/events/certificates'
import {
  buildEventCertificatePath,
  buildEventCertificateSummary,
  eventCertificateTypeLabels
} from '#shared/domains/events/certificates'

import EventCertificateCard from '~/components/public/events/EventCertificateCard.vue'

definePageMeta({
  layout: 'public'
})

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? '').trim())
const userId = computed(() => String(route.params.userId ?? '').trim())
const { actor: accountActor } = await useAccountLifecycleActor()
const toast = useToast()

if (!slug.value || !userId.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Certificate not found.'
  })
}

const { data: certificateData, error: certificateError } = await useApiResponse<EventCertificate>(
  () => `public-event-certificate:${slug.value}:${userId.value}`,
  () => `/api/public/events/${slug.value}/participants/${userId.value}/certificate`,
  {
    watch: [slug, userId]
  }
)

if (certificateError.value || !certificateData.value) {
  throw createError({
    statusCode: certificateError.value?.statusCode ?? 404,
    statusMessage: 'Certificate not found.'
  })
}

const certificate = computed(() => certificateData.value!)
const isSignedIn = computed(() => accountActor.value.isAuthenticated)
const signedInEmail = computed(() => accountActor.value.platformUser?.email ?? accountActor.value.sessionUser?.email ?? '')
const typeLabel = computed(() => eventCertificateTypeLabels[certificate.value.eventType])
const locationLabel = computed(() => [certificate.value.city, certificate.value.country].filter(part => part.trim().length > 0).join(', '))

const requestUrl = useRequestURL()
const certificatePath = computed(() => buildEventCertificatePath(slug.value, userId.value))
const certificateUrl = computed(() => new URL(certificatePath.value, requestUrl.origin).toString())
const certificateApiBasePath = computed(() => `/api/public/events/${slug.value}/participants/${userId.value}`)
const certificateImageUrl = computed(() => new URL(`${certificateApiBasePath.value}/certificate.png`, requestUrl.origin).toString())
const certificateSummary = computed(() => buildEventCertificateSummary(certificate.value))
const certificateHost = computed(() => requestUrl.host)
const stageBackgroundImageStyle = computed(() => certificate.value.backgroundImageUrl
  ? { backgroundImage: `url(${JSON.stringify(certificate.value.backgroundImageUrl)})` }
  : undefined)

async function copyCertificateLink() {
  try {
    await navigator.clipboard.writeText(certificateUrl.value)
    toast.add({
      title: 'Certificate link copied',
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Unable to copy the link',
      description: 'Copy the address from your browser instead.',
      color: 'error'
    })
  }
}

useSeoMeta({
  title: () => `${certificate.value.participantName} - Certificate of Participation | Codex Events`,
  description: () => certificateSummary.value,
  ogTitle: () => `${certificate.value.participantName} · Certificate of Participation`,
  ogDescription: () => certificateSummary.value,
  ogImage: () => certificateImageUrl.value,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageType: 'image/png',
  ogUrl: () => certificateUrl.value,
  ogType: 'website',
  ogSiteName: 'Codex Events',
  twitterCard: 'summary_large_image',
  twitterTitle: () => `${certificate.value.participantName} · Certificate of Participation`,
  twitterDescription: () => certificateSummary.value,
  twitterImage: () => certificateImageUrl.value
})

useHead({
  link: [
    {
      rel: 'canonical',
      href: certificateUrl
    }
  ]
})
</script>

<template>
  <div class="certificate-stage relative isolate overflow-hidden pb-16 text-white">
    <div
      class="pointer-events-none absolute inset-0 -z-10 bg-[#05060b]"
      aria-hidden="true"
    >
      <div
        v-if="stageBackgroundImageStyle"
        class="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat opacity-60 blur-md saturate-125"
        :style="stageBackgroundImageStyle"
      />
      <div
        v-else
        class="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_110%,rgba(96,60,235,0.4),transparent_70%),radial-gradient(50%_40%_at_15%_0%,rgba(40,80,220,0.25),transparent_70%)]"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-black/72 via-black/62 to-[#05060b]" />
    </div>

    <AppContainer class="max-w-[80rem] pt-5">
      <div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <NuxtLink
          :to="`/events/${slug}`"
          class="inline-flex items-center gap-2 pt-1.5 text-[13px] font-medium text-white/70 transition-colors hover:text-white"
        >
          <AppIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          Back to event
        </NuxtLink>

        <div class="flex items-center gap-3">
          <div
            v-if="isSignedIn && signedInEmail"
            class="hidden flex-col items-end pr-1 text-right sm:flex"
          >
            <span class="text-[12px] text-white/55">Signed in as</span>
            <span class="inline-flex items-center gap-1.5 text-[13px] text-white/90">
              {{ signedInEmail }}
              <AppIcon
                name="i-lucide-circle-check"
                class="size-4 text-emerald-400"
              />
            </span>
          </div>

          <button
            type="button"
            class="certificate-action-button"
            data-testid="certificate-copy-link"
            @click="copyCertificateLink"
          >
            <AppIcon
              name="i-lucide-link"
              class="size-4"
            />
            Link
          </button>

          <template v-if="isSignedIn">
            <a
              :href="`${certificateApiBasePath}/certificate.pdf`"
              class="certificate-action-button"
              data-testid="certificate-download-pdf"
            >
              <AppIcon
                name="i-lucide-file-text"
                class="size-4"
              />
              PDF
            </a>
            <a
              :href="`${certificateApiBasePath}/certificate.png?download=1`"
              class="certificate-action-button"
              data-testid="certificate-download-image"
            >
              <AppIcon
                name="i-lucide-image"
                class="size-4"
              />
              Image
            </a>
          </template>
        </div>
      </div>

      <div class="mx-auto mt-2 flex max-w-[46rem] flex-col items-center text-center">
        <p class="certificate-type-chip">
          {{ typeLabel.toUpperCase() }}
        </p>

        <h1
          data-testid="certificate-title"
          class="mt-3 text-[40px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[56px]"
        >
          {{ certificate.participantName }}
        </h1>
        <p class="mt-1 text-[17px] text-white/65 sm:text-[19px]">
          has participated in
        </p>
        <p class="mt-1.5 text-[24px] font-bold tracking-[-0.01em] text-white sm:text-[30px]">
          {{ certificate.eventName }}
        </p>
        <p class="mt-1.5 text-[17px] font-medium text-[#8b9bff] sm:text-[19px]">
          on {{ certificate.eventDateLabel }}
        </p>
        <p
          v-if="certificate.trackName"
          class="mt-1 text-[15px] text-white/65 sm:text-[16px]"
        >
          with the track <span class="font-semibold text-[#b9a5ff]">{{ certificate.trackName }}</span>
        </p>
      </div>

      <div class="mx-auto mt-7 w-full max-w-[64rem] sm:mt-9">
        <EventCertificateCard :certificate="certificate" />
      </div>

      <div class="mx-auto mt-6 w-full max-w-[64rem]">
        <div class="flex flex-col gap-5 rounded-2xl border border-white/12 bg-black/45 px-6 py-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div class="certificate-fact">
            <AppIcon
              name="i-lucide-box"
              class="certificate-fact__icon"
            />
            <span class="flex flex-col gap-0.5">
              <span class="certificate-fact__label">Event type</span>
              <span class="certificate-fact__value">{{ typeLabel }}</span>
            </span>
          </div>

          <div class="certificate-fact sm:border-l sm:border-white/12 sm:pl-5">
            <AppIcon
              name="i-lucide-calendar-days"
              class="certificate-fact__icon"
            />
            <span class="flex flex-col gap-0.5">
              <span class="certificate-fact__label">Date</span>
              <span class="certificate-fact__value">{{ certificate.eventDateLabel }}</span>
            </span>
          </div>

          <div
            v-if="locationLabel"
            class="certificate-fact sm:border-l sm:border-white/12 sm:pl-5"
          >
            <AppIcon
              name="i-lucide-map-pin"
              class="certificate-fact__icon"
            />
            <span class="flex flex-col gap-0.5">
              <span class="certificate-fact__label">Location</span>
              <span class="certificate-fact__value">{{ locationLabel }}</span>
            </span>
          </div>

          <div
            v-if="certificate.trackName"
            class="certificate-fact sm:border-l sm:border-white/12 sm:pl-5"
          >
            <AppIcon
              name="i-lucide-wrench"
              class="certificate-fact__icon"
            />
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="certificate-fact__label">Track</span>
              <span class="certificate-fact__value truncate text-[#b9a5ff]">{{ certificate.trackName }}</span>
            </span>
          </div>

          <div class="certificate-fact sm:border-l sm:border-white/12 sm:pl-5">
            <AppIcon
              name="i-lucide-shield-check"
              class="certificate-fact__icon"
            />
            <span class="flex flex-col gap-0.5">
              <span class="certificate-fact__label">Certificate ID</span>
              <span class="certificate-fact__value">{{ certificate.certificateId }}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="mx-auto mt-7 flex max-w-[46rem] flex-col items-center gap-1 text-center">
        <p class="inline-flex items-center gap-1.5 text-[13px] text-white/60">
          <AppIcon
            name="i-lucide-lock"
            class="size-3.5"
          />
          This certificate is issued by the Codex Community Events Platform.
        </p>
        <p class="text-[13px] text-white/60">
          Verify authenticity by visiting
          <a
            :href="certificateUrl"
            class="font-medium text-[#8b9bff] transition-colors hover:text-white"
          >{{ certificateHost }}</a>
          and checking the Certificate ID.
        </p>
        <p
          v-if="!isSignedIn"
          class="mt-2 text-[13px] text-white/45"
        >
          Sign in to download this certificate as an image or PDF.
        </p>
      </div>
    </AppContainer>
  </div>
</template>

<style scoped>
.certificate-action-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.08);
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  transition: background-color 150ms ease, border-color 150ms ease;
  backdrop-filter: blur(8px);
}

.certificate-action-button:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.28);
}

.certificate-type-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  border: 1px solid rgba(139, 155, 255, 0.55);
  padding: 5px 18px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.28em;
  color: #aab7ff;
  box-shadow: 0 0 18px -4px rgba(110, 120, 255, 0.55);
}

.certificate-fact {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.certificate-fact__icon {
  width: 21px;
  height: 21px;
  color: #aab7ff;
  flex: none;
}

.certificate-fact__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.certificate-fact__value {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}
</style>
