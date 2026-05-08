import type { TermsDocument } from '~/domains/events/records'
import type {
  PrizeRedemptionApiDataResponse,
  PrizeRedemptionCurrentTermsResponse,
  PrizeRedemptionRecord,
  PrizeRedemptionTask
} from '~/domains/prize-redemptions'

import { normalizePrizeRedemptionApiError } from '~/domains/prize-redemptions'

export function usePrizeRedemptionWorkspace() {
  const apiFetch = $fetch
  const user = useUser()
  const authSubject = computed(() => user.value?.sub ?? 'anonymous')

  const pendingRedemptionsRequest = useApiData<PrizeRedemptionRecord[]>(
    () => `prize-redemptions:${authSubject.value}`,
    async ({ apiFetch, signal }) => {
      if (!user.value?.sub) {
        return []
      }

      const response = await apiFetch<PrizeRedemptionApiDataResponse<PrizeRedemptionRecord[]>>('/api/prize-redemptions/me', {
        signal
      })
      return response.data
    },
    {
      default: () => [],
      watch: [computed(() => user.value?.sub ?? null)],
      server: false
    }
  )

  const visibleEventIds = computed(() =>
    [...new Set(pendingRedemptionsRequest.data.value.map(redemption => redemption.event.id))]
      .sort((left, right) => left.localeCompare(right))
  )

  const currentTermsRequest = useApiData<Record<string, TermsDocument | null>>(
    () => `prize-redemption-terms:${authSubject.value}:${visibleEventIds.value.join(',')}`,
    async ({ apiFetch, signal }) => {
      if (!user.value?.sub || visibleEventIds.value.length === 0) {
        return {}
      }

      const entries = await Promise.all(
        visibleEventIds.value.map(async (eventId) => {
          const response = await apiFetch<PrizeRedemptionApiDataResponse<PrizeRedemptionCurrentTermsResponse>>(
            `/api/events/${eventId}/terms/current`,
            {
              signal
            }
          )

          return [eventId, response.data.winner_terms ?? null] as const
        })
      )

      return Object.fromEntries(entries)
    },
    {
      default: () => ({}),
      watch: [computed(() => user.value?.sub ?? null), visibleEventIds],
      server: false
    }
  )

  const tasks = computed<PrizeRedemptionTask[]>(() =>
    pendingRedemptionsRequest.data.value.map(redemption => ({
      ...redemption,
      currentWinnerTerms: currentTermsRequest.data.value[redemption.event.id] ?? null
    }))
  )

  const recentlyRedeemed = ref<PrizeRedemptionRecord[]>([])
  const legalNameById = reactive<Record<string, string>>({})
  const termsAcceptedById = reactive<Record<string, boolean>>({})
  const submissionErrorById = reactive<Record<string, string>>({})
  const submissionSuccessById = reactive<Record<string, string>>({})
  const submittingById = reactive<Record<string, boolean>>({})

  watch(tasks, (nextTasks) => {
    for (const task of nextTasks) {
      if (!(task.id in legalNameById)) {
        legalNameById[task.id] = task.legalName ?? ''
      }

      if (!(task.id in termsAcceptedById)) {
        termsAcceptedById[task.id] = false
      }

      if (!(task.id in submissionErrorById)) {
        submissionErrorById[task.id] = ''
      }

      if (!(task.id in submissionSuccessById)) {
        submissionSuccessById[task.id] = ''
      }

      if (!(task.id in submittingById)) {
        submittingById[task.id] = false
      }
    }
  }, {
    immediate: true
  })

  async function refresh() {
    await pendingRedemptionsRequest.refresh()
    await currentTermsRequest.refresh()
  }

  async function redeemPrize(redemptionId: string) {
    const task = tasks.value.find(entry => entry.id === redemptionId)

    if (!task) {
      submissionErrorById[redemptionId] = 'The requested prize redemption could not be resolved.'
      submissionSuccessById[redemptionId] = ''
      return null
    }

    const legalName = legalNameById[redemptionId]?.trim() ?? ''
    const currentWinnerTerms = task.currentWinnerTerms

    if (!currentWinnerTerms) {
      submissionErrorById[redemptionId] = 'The current winner terms are unavailable for this event.'
      submissionSuccessById[redemptionId] = ''
      return null
    }

    if (!legalName) {
      submissionErrorById[redemptionId] = 'Enter the legal name that should be recorded for this redemption.'
      submissionSuccessById[redemptionId] = ''
      return null
    }

    if (!termsAcceptedById[redemptionId]) {
      submissionErrorById[redemptionId] = 'You must accept the exact current winner terms before submitting.'
      submissionSuccessById[redemptionId] = ''
      return null
    }

    submittingById[redemptionId] = true
    submissionErrorById[redemptionId] = ''
    submissionSuccessById[redemptionId] = ''

    try {
      const response = await apiFetch<PrizeRedemptionApiDataResponse<PrizeRedemptionRecord>>(
        `/api/prize-redemptions/${redemptionId}/actions/redeem`,
        {
          method: 'POST',
          body: {
            legalName,
            winnerTermsDocumentId: currentWinnerTerms.id
          }
        }
      )

      recentlyRedeemed.value = [
        response.data,
        ...recentlyRedeemed.value.filter(entry => entry.id !== response.data.id)
      ]
      submissionSuccessById[redemptionId] = 'Prize redemption submitted.'
      await refresh()
      return response.data
    } catch (error) {
      submissionErrorById[redemptionId] = normalizePrizeRedemptionApiError(error).message
      return null
    } finally {
      submittingById[redemptionId] = false
    }
  }

  return {
    currentTermsErrorMessage: computed(() =>
      currentTermsRequest.error.value
        ? normalizePrizeRedemptionApiError(currentTermsRequest.error.value).message
        : ''
    ),
    currentTermsStatus: computed(() => currentTermsRequest.status.value),
    legalNameById,
    pendingErrorMessage: computed(() =>
      pendingRedemptionsRequest.error.value
        ? normalizePrizeRedemptionApiError(pendingRedemptionsRequest.error.value).message
        : ''
    ),
    pendingStatus: computed(() => pendingRedemptionsRequest.status.value),
    recentlyRedeemed,
    redeemPrize,
    refresh,
    submissionErrorById,
    submissionSuccessById,
    submittingById,
    tasks,
    termsAcceptedById
  }
}
