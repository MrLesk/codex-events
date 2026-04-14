<script setup lang="ts">
import { formatHackathonDate } from '~/composables/useHackathonPresentation'
import type {
  AdminHackathonCreditOffer,
  HackathonCreditApiDataResponse,
  HackathonCreditApiListResponse,
  ParticipantHackathonCreditOffer
} from '~/utils/hackathon-credits'
import {
  isHackathonCreditLink,
  normalizeHackathonCreditApiError
} from '~/utils/hackathon-credits'

const props = defineProps<{
  hackathonId: string
  canManage: boolean
  canClaim: boolean
}>()

const apiFetch = import.meta.server ? useRequestFetch() : $fetch
const toast = useToast()

const participantCreditsRequest = useAsyncData<ParticipantHackathonCreditOffer[]>(
  () => `hackathon-credits:participant:${props.hackathonId}:${props.canClaim}`,
  async () => {
    if (!props.canClaim) {
      return []
    }

    const response = await apiFetch<HackathonCreditApiListResponse<ParticipantHackathonCreditOffer>>(
      `/api/hackathons/${props.hackathonId}/credits`
    )

    return response.data
  },
  {
    watch: [computed(() => props.hackathonId), computed(() => props.canClaim)],
    default: () => []
  }
)

const adminCreditsRequest = useAsyncData<AdminHackathonCreditOffer[]>(
  () => `hackathon-credits:admin:${props.hackathonId}:${props.canManage}`,
  async () => {
    if (!props.canManage) {
      return []
    }

    const response = await apiFetch<HackathonCreditApiListResponse<AdminHackathonCreditOffer>>(
      `/api/hackathons/${props.hackathonId}/admin/credits`
    )

    return response.data
  },
  {
    watch: [computed(() => props.hackathonId), computed(() => props.canManage)],
    default: () => []
  }
)

const participantCredits = computed(() => participantCreditsRequest.data.value)
const adminCredits = computed(() => adminCreditsRequest.data.value)
const createForm = reactive({
  name: '',
  description: ''
})
const editById = reactive<Record<string, { name: string, description: string }>>({})
const createError = ref('')
const createPending = ref(false)
const claimPendingById = reactive<Record<string, boolean>>({})
const claimErrorById = reactive<Record<string, string>>({})
const savePendingById = reactive<Record<string, boolean>>({})
const saveErrorById = reactive<Record<string, string>>({})
const importPendingById = reactive<Record<string, boolean>>({})
const importErrorById = reactive<Record<string, string>>({})

watch(adminCredits, (offers) => {
  const nextIds = new Set(offers.map(offer => offer.id))

  for (const key of Object.keys(editById)) {
    if (!nextIds.has(key)) {
      Reflect.deleteProperty(editById, key)
    }
  }

  for (const offer of offers) {
    const existing = editById[offer.id]

    if (!existing) {
      editById[offer.id] = {
        name: offer.name,
        description: offer.description
      }
      continue
    }

    if (existing.name === offer.name && existing.description === offer.description) {
      continue
    }

    if (savePendingById[offer.id]) {
      continue
    }

    editById[offer.id] = {
      name: offer.name,
      description: offer.description
    }
  }
}, {
  immediate: true
})

function getEditState(offer: AdminHackathonCreditOffer) {
  return editById[offer.id] ?? {
    name: offer.name,
    description: offer.description
  }
}

async function refreshCredits() {
  await Promise.all([
    props.canClaim ? participantCreditsRequest.refresh() : Promise.resolve(),
    props.canManage ? adminCreditsRequest.refresh() : Promise.resolve()
  ])
}

async function createOffer() {
  createError.value = ''

  const name = createForm.name.trim()
  const description = createForm.description.trim()

  if (!name || !description) {
    createError.value = 'Enter a name and description before creating a credit offer.'
    return
  }

  createPending.value = true

  try {
    await apiFetch<HackathonCreditApiDataResponse<AdminHackathonCreditOffer>>(
      `/api/hackathons/${props.hackathonId}/credits`,
      {
        method: 'POST',
        body: {
          name,
          description
        }
      }
    )

    createForm.name = ''
    createForm.description = ''
    await refreshCredits()
    toast.add({
      title: 'Credit offer created',
      description: 'The new credit offer is ready for inventory uploads.',
      color: 'success'
    })
  } catch (error) {
    createError.value = normalizeHackathonCreditApiError(error).message
  } finally {
    createPending.value = false
  }
}

async function saveOffer(offer: AdminHackathonCreditOffer) {
  const edit = getEditState(offer)
  const name = edit.name.trim()
  const description = edit.description.trim()

  saveErrorById[offer.id] = ''

  if (!name || !description) {
    saveErrorById[offer.id] = 'Enter a name and description before saving this offer.'
    return
  }

  savePendingById[offer.id] = true

  try {
    await apiFetch<HackathonCreditApiDataResponse<AdminHackathonCreditOffer>>(
      `/api/hackathons/${props.hackathonId}/credits/${offer.id}`,
      {
        method: 'PATCH',
        body: {
          name,
          description
        }
      }
    )

    await refreshCredits()
    toast.add({
      title: 'Credit offer updated',
      description: 'The participant-facing credit details now match the latest admin changes.',
      color: 'success'
    })
  } catch (error) {
    saveErrorById[offer.id] = normalizeHackathonCreditApiError(error).message
  } finally {
    savePendingById[offer.id] = false
  }
}

async function importCredits(event: Event, offerId: string) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]

  if (!file) {
    return
  }

  importErrorById[offerId] = ''
  importPendingById[offerId] = true

  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiFetch<HackathonCreditApiDataResponse<{ importedCount: number }>>(
      `/api/hackathons/${props.hackathonId}/credits/${offerId}/import`,
      {
        method: 'POST',
        body: formData
      }
    )

    await refreshCredits()
    toast.add({
      title: 'Credits imported',
      description: `${response.data.importedCount} credit value${response.data.importedCount === 1 ? '' : 's'} added to this offer.`,
      color: 'success'
    })
  } catch (error) {
    importErrorById[offerId] = normalizeHackathonCreditApiError(error).message
  } finally {
    importPendingById[offerId] = false

    if (input) {
      input.value = ''
    }
  }
}

async function claimOffer(offerId: string) {
  claimErrorById[offerId] = ''
  claimPendingById[offerId] = true

  try {
    const response = await apiFetch<HackathonCreditApiDataResponse<ParticipantHackathonCreditOffer>>(
      `/api/hackathons/${props.hackathonId}/credits/${offerId}/actions/claim`,
      {
        method: 'POST'
      }
    )

    participantCreditsRequest.data.value = participantCreditsRequest.data.value.map(offer =>
      offer.id === offerId ? response.data : offer
    )

    if (props.canManage) {
      await adminCreditsRequest.refresh()
    }

    toast.add({
      title: 'Credit claimed',
      description: 'Your assigned credit is now available in this tab.',
      color: 'success'
    })
  } catch (error) {
    claimErrorById[offerId] = normalizeHackathonCreditApiError(error).message
  } finally {
    claimPendingById[offerId] = false
  }
}

async function copyCreditValue(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.add({
      title: 'Code copied',
      description: 'The credit value was copied to your clipboard.',
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Copy failed',
      description: 'This browser could not copy the credit value right now.',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="space-y-8">
    <section
      v-if="props.canManage"
      class="space-y-6"
    >
      <div class="space-y-2">
        <h2 class="text-xl font-semibold text-highlighted">
          Manage credits
        </h2>
        <p class="text-sm text-toned">
          Create participant-facing credit offers, then upload a single-column CSV with no header and one code or link per row.
        </p>
      </div>

      <article class="rounded-[1.8rem] border border-default/75 bg-elevated/90 px-6 py-6 shadow-[0_28px_68px_-48px_rgba(15,20,34,0.55)]">
        <div class="grid gap-4 lg:grid-cols-[1fr_1.4fr_auto] lg:items-end">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Offer name</span>
            <AppInput
              v-model="createForm.name"
              placeholder="OpenAI credits"
            />
          </label>

          <label class="grid gap-2">
            <span class="text-sm font-medium text-toned">Description</span>
            <AppTextarea
              v-model="createForm.description"
              :rows="3"
              placeholder="To redeem this code, go to https://redeem.com"
            />
          </label>

          <AppButton
            color="neutral"
            :loading="createPending"
            @click="createOffer"
          >
            Create offer
          </AppButton>
        </div>

        <AppAlert
          v-if="createError"
          class="mt-4"
          color="error"
          variant="soft"
          title="Credit offer could not be created"
          :description="createError"
        />
      </article>

      <AppAlert
        v-if="adminCreditsRequest.error.value"
        color="error"
        variant="soft"
        title="Credits unavailable"
        :description="normalizeHackathonCreditApiError(adminCreditsRequest.error.value).message"
      />

      <AppAlert
        v-else-if="adminCreditsRequest.status.value === 'idle' || adminCreditsRequest.status.value === 'pending'"
        color="neutral"
        variant="soft"
        title="Loading credit inventory"
        description="Resolving the current offers, coupon values, and claim records for this hackathon."
      />

      <AppAlert
        v-else-if="adminCredits.length === 0"
        color="neutral"
        variant="soft"
        title="No credit offers yet"
        description="Create a credit offer above, then upload a CSV batch into it."
      />

      <div
        v-else
        class="space-y-6"
      >
        <article
          v-for="offer in adminCredits"
          :key="offer.id"
          :data-testid="`admin-credit-offer-${offer.id}`"
          class="rounded-[1.8rem] border border-default/75 bg-elevated/90 px-6 py-6 shadow-[0_28px_68px_-48px_rgba(15,20,34,0.55)]"
        >
          <div class="flex flex-col gap-5">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="space-y-3">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-lg font-semibold text-highlighted">
                    {{ offer.name }}
                  </h3>
                  <AppBadge
                    color="neutral"
                    variant="soft"
                  >
                    {{ offer.availableCount }} available
                  </AppBadge>
                  <AppBadge
                    color="warning"
                    variant="soft"
                  >
                    {{ offer.claimedCount }} claimed
                  </AppBadge>
                  <AppBadge
                    color="neutral"
                    variant="soft"
                  >
                    {{ offer.totalCount }} total
                  </AppBadge>
                </div>

                <p class="text-sm text-toned">
                  {{ offer.description }}
                </p>
              </div>
            </div>

            <div class="grid gap-4 lg:grid-cols-[1fr_1.4fr_auto] lg:items-end">
              <label class="grid gap-2">
                <span class="text-sm font-medium text-toned">Offer name</span>
                <AppInput v-model="getEditState(offer).name" />
              </label>

              <label class="grid gap-2">
                <span class="text-sm font-medium text-toned">Description</span>
                <AppTextarea
                  v-model="getEditState(offer).description"
                  :rows="3"
                />
              </label>

              <AppButton
                color="neutral"
                :loading="savePendingById[offer.id]"
                @click="saveOffer(offer)"
              >
                Save offer
              </AppButton>
            </div>

            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div class="space-y-1">
                <p class="text-sm font-medium text-highlighted">
                  Refill inventory
                </p>
                <p class="text-xs text-muted">
                  Upload a single-column CSV with no header and one code or link per row.
                </p>
              </div>

              <input
                :disabled="importPendingById[offer.id]"
                type="file"
                accept=".csv,text/csv"
                @change="importCredits($event, offer.id)"
              >
            </div>

            <AppAlert
              v-if="saveErrorById[offer.id]"
              color="error"
              variant="soft"
              title="Credit offer could not be saved"
              :description="saveErrorById[offer.id]"
            />

            <AppAlert
              v-else-if="importErrorById[offer.id]"
              color="error"
              variant="soft"
              title="CSV import failed"
              :description="importErrorById[offer.id]"
            />

            <div class="overflow-x-auto">
              <table class="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr class="text-left text-xs uppercase tracking-[0.14em] text-muted">
                    <th class="pr-4 pb-2">
                      Value
                    </th>
                    <th class="pr-4 pb-2">
                      Status
                    </th>
                    <th class="pr-4 pb-2">
                      Claimed by
                    </th>
                    <th class="pb-2">
                      Claimed at
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="code in offer.codes"
                    :key="code.id"
                    class="align-top"
                  >
                    <td class="pr-4 py-2 font-mono text-xs text-toned">
                      <a
                        v-if="isHackathonCreditLink(code.value)"
                        :href="code.value"
                        target="_blank"
                        rel="noreferrer"
                        class="break-all text-primary hover:text-primary/80"
                      >
                        {{ code.value }}
                      </a>
                      <span
                        v-else
                        class="break-all"
                      >
                        {{ code.value }}
                      </span>
                    </td>
                    <td class="pr-4 py-2 text-toned">
                      {{ code.claimedByUser ? 'Claimed' : 'Available' }}
                    </td>
                    <td class="pr-4 py-2 text-toned">
                      {{ code.claimedByUser ? `${code.claimedByUser.displayName} (${code.claimedByUser.email})` : '—' }}
                    </td>
                    <td class="py-2 text-toned">
                      {{ code.claimedAt ? formatHackathonDate(code.claimedAt) : '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section
      v-if="props.canClaim"
      class="space-y-6"
    >
      <div class="space-y-2">
        <h2 class="text-xl font-semibold text-highlighted">
          Claim credits
        </h2>
        <p class="text-sm text-toned">
          Claim one value from each available offer. Once claimed, the assigned code or link stays attached to your account for this hackathon.
        </p>
      </div>

      <AppAlert
        v-if="participantCreditsRequest.error.value"
        color="error"
        variant="soft"
        title="Credits unavailable"
        :description="normalizeHackathonCreditApiError(participantCreditsRequest.error.value).message"
      />

      <AppAlert
        v-else-if="participantCreditsRequest.status.value === 'idle' || participantCreditsRequest.status.value === 'pending'"
        color="neutral"
        variant="soft"
        title="Loading credits"
        description="Resolving your available and already claimed credit offers."
      />

      <AppAlert
        v-else-if="participantCredits.length === 0"
        color="neutral"
        variant="soft"
        title="No credits available yet"
        description="This tab becomes actionable once this hackathon publishes one or more credit offers."
      />

      <div
        v-else
        class="grid gap-6 xl:grid-cols-2"
      >
        <article
          v-for="offer in participantCredits"
          :key="offer.id"
          :data-testid="`participant-credit-offer-${offer.id}`"
          class="rounded-[1.8rem] border border-default/75 bg-elevated/90 px-6 py-6 shadow-[0_28px_68px_-48px_rgba(15,20,34,0.55)]"
        >
          <div class="space-y-5">
            <div class="space-y-3">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-semibold text-highlighted">
                  {{ offer.name }}
                </h3>
                <AppBadge
                  v-if="offer.claimedCode"
                  color="success"
                  variant="soft"
                >
                  Claimed
                </AppBadge>
                <AppBadge
                  v-else-if="offer.availableCount > 0"
                  color="warning"
                  variant="soft"
                >
                  {{ offer.availableCount }} left
                </AppBadge>
                <AppBadge
                  v-else
                  color="neutral"
                  variant="soft"
                >
                  Sold out
                </AppBadge>
              </div>

              <p class="text-sm text-toned">
                {{ offer.description }}
              </p>
            </div>

            <template v-if="offer.claimedCode">
              <div class="space-y-3">
                <p class="text-sm font-medium text-highlighted">
                  Your assigned value
                </p>

                <AppButton
                  v-if="isHackathonCreditLink(offer.claimedCode.value)"
                  :to="offer.claimedCode.value"
                  color="neutral"
                  variant="soft"
                  external
                  trailing-icon="i-lucide-external-link"
                >
                  Open redemption link
                </AppButton>

                <div
                  v-else
                  class="flex flex-col gap-3 rounded-[1.25rem] border border-default/80 bg-default/40 px-4 py-4"
                >
                  <code class="break-all font-mono text-sm text-highlighted">
                    {{ offer.claimedCode.value }}
                  </code>
                  <div>
                    <AppButton
                      color="neutral"
                      variant="soft"
                      size="sm"
                      icon="i-lucide-copy"
                      @click="copyCreditValue(offer.claimedCode.value)"
                    >
                      Copy code
                    </AppButton>
                  </div>
                </div>

                <p
                  v-if="offer.claimedCode.claimedAt"
                  class="text-xs text-muted"
                >
                  Claimed {{ formatHackathonDate(offer.claimedCode.claimedAt) }}.
                </p>
              </div>
            </template>

            <template v-else>
              <AppAlert
                v-if="claimErrorById[offer.id]"
                color="error"
                variant="soft"
                title="Credit could not be claimed"
                :description="claimErrorById[offer.id]"
              />

              <AppAlert
                v-else-if="offer.availableCount === 0"
                color="warning"
                variant="soft"
                title="No credits left"
                description="All uploaded values for this offer have already been claimed."
              />

              <AppButton
                v-else
                color="neutral"
                :loading="claimPendingById[offer.id]"
                @click="claimOffer(offer.id)"
              >
                Redeem
              </AppButton>
            </template>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
