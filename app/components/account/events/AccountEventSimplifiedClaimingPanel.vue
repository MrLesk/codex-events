<script setup lang="ts">
import qrcode from 'qrcode-generator'

import type { ApiDataResponse } from '~/lib/api'
import { normalizeApiError } from '~/lib/api'

interface SimplifiedClaimingStatus {
  enabled: boolean
  ready: boolean
  locked: boolean
  redemptionUrl: string
  issues: Array<{ code: string, message: string }>
  attendeeCount: number
  offerCount: number
  totalInventoryCount: number
  availableInventoryCount: number
  simplifiedClaimCount: number
  offer: { id: string, name: string } | null
}

const props = defineProps<{
  eventId: string
  enabled: boolean
}>()

const toast = useToast()
const isUploading = shallowRef(false)
const uploadError = shallowRef('')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const statusUrl = computed(() => `/api/events/${props.eventId}/simplified-claiming`)
const { data, status, error, refresh } = await useFetch<ApiDataResponse<SimplifiedClaimingStatus>>(statusUrl, {
  key: `simplified-claiming-${props.eventId}`
})
const claimStatus = computed(() => data.value?.data ?? null)
const qrDataUrl = computed(() => {
  if (!claimStatus.value?.redemptionUrl) {
    return ''
  }

  const qr = qrcode(0, 'M')
  qr.addData(claimStatus.value.redemptionUrl)
  qr.make()
  return qr.createDataURL(6, 3)
})

watch(() => props.enabled, async () => {
  await refresh()
})

function chooseFile() {
  fileInput.value?.click()
}

async function importAttendees(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }

  isUploading.value = true
  uploadError.value = ''
  try {
    const body = new FormData()
    body.append('file', file)
    const response = await $fetch<ApiDataResponse<{
      eligibleCount: number
      attendeeCount: number
    }>>(`/api/events/${props.eventId}/simplified-claiming/attendees/import`, {
      method: 'POST',
      body
    })
    toast.add({
      title: 'Luma attendees imported',
      description: `${response.data.eligibleCount} approved attendee${response.data.eligibleCount === 1 ? '' : 's'} added or refreshed.`,
      color: 'success'
    })
    await refresh()
  } catch (caught) {
    uploadError.value = normalizeApiError(caught).message
  } finally {
    isUploading.value = false
  }
}

async function copyRedemptionUrl() {
  if (!claimStatus.value?.redemptionUrl) {
    return
  }
  await navigator.clipboard.writeText(claimStatus.value.redemptionUrl)
  toast.add({ title: 'Redemption link copied', color: 'success' })
}

function downloadQrSvg() {
  if (!claimStatus.value?.redemptionUrl) {
    return
  }

  const qr = qrcode(0, 'M')
  qr.addData(claimStatus.value.redemptionUrl)
  qr.make()
  const blob = new Blob([qr.createSvgTag({ cellSize: 8, margin: 4, scalable: true })], {
    type: 'image/svg+xml'
  })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = 'event-redemption-qr.svg'
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}
</script>

<template>
  <AppCard>
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Attendee claiming
        </h2>
        <p class="text-sm text-muted">
          Import approved Luma guests and prepare the private redemption QR.
        </p>
      </div>
    </template>

    <div class="grid gap-5">
      <AppAlert
        v-if="error"
        color="error"
        variant="soft"
        title="Unable to load attendee claiming"
        :description="error.message"
      />
      <AppAlert
        v-else-if="!props.enabled"
        color="neutral"
        variant="soft"
        title="Simplified claiming is off"
        description="Enable simplified attendee claiming in Participation Rules to prepare the attendee list and QR."
      />
      <template v-else-if="claimStatus">
        <AppAlert
          v-if="claimStatus.locked"
          color="info"
          variant="soft"
          title="Claiming is active"
          description="The event link, credit offer, and claiming setting are locked because at least one attendee has redeemed."
        />
        <AppAlert
          v-else-if="!claimStatus.ready"
          color="warning"
          variant="soft"
          title="Finish setup before sharing the QR"
          :description="claimStatus.issues.map(issue => issue.message).join(' ')"
        />
        <AppAlert
          v-else
          color="success"
          variant="soft"
          title="Ready to share"
          description="Approved attendees can now redeem from this private link."
        />

        <div class="grid gap-4 border-t border-black/8 pt-5 dark:border-white/[0.08] md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div class="grid gap-3">
            <div>
              <p class="text-sm font-medium text-highlighted">
                Approved Luma attendees
              </p>
              <p class="mt-1 text-sm text-muted">
                {{ claimStatus.attendeeCount }} eligible · imports add new guests and refresh names
              </p>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept=".csv,text/csv"
              class="sr-only"
              @change="importAttendees"
            >
            <div>
              <AppButton
                type="button"
                color="neutral"
                variant="outline"
                :loading="isUploading"
                :disabled="claimStatus.locked"
                @click="chooseFile"
              >
                Import Luma CSV
              </AppButton>
            </div>
            <AppAlert
              v-if="uploadError"
              color="error"
              variant="soft"
              title="Import failed"
              :description="uploadError"
            />
          </div>

          <div class="grid gap-2 text-sm text-muted md:text-right">
            <span>{{ claimStatus.offer?.name ?? 'No credit offer' }}</span>
            <span>{{ claimStatus.availableInventoryCount }} of {{ claimStatus.totalInventoryCount }} coupons available</span>
            <span>{{ claimStatus.simplifiedClaimCount }} redeemed</span>
          </div>
        </div>

        <div class="grid gap-4 border-t border-black/8 pt-5 dark:border-white/[0.08] md:grid-cols-[minmax(0,1fr)_12rem] md:items-center">
          <div class="min-w-0">
            <p class="text-sm font-medium text-highlighted">
              Redemption link
            </p>
            <p class="mt-1 break-all text-sm text-muted">
              {{ claimStatus.redemptionUrl }}
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <AppButton
                type="button"
                color="neutral"
                variant="outline"
                @click="copyRedemptionUrl"
              >
                Copy link
              </AppButton>
              <AppButton
                type="button"
                color="neutral"
                variant="outline"
                @click="downloadQrSvg"
              >
                Download QR as SVG
              </AppButton>
            </div>
          </div>
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            alt="Redemption QR code"
            class="mx-auto size-48 rounded-lg bg-white p-2"
          >
        </div>
      </template>
      <p
        v-else-if="status === 'pending'"
        class="text-sm text-muted"
      >
        Loading attendee claiming…
      </p>
    </div>
  </AppCard>
</template>
