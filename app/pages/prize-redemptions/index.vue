<script setup lang="ts">
import {
  describePrizeRedemptionRecipient,
  formatPrizeRedemptionStatus,
  getPrizeRedemptionAvailability,
  getPrizeRedemptionStatusColor,
  summarizePrizeRedemptionTask
} from '~/utils/prize-redemptions'
import { requireAuthNavigationGuard } from '~/utils/auth-guards'

definePageMeta({
  middleware: [requireAuthNavigationGuard]
})

const toast = useToast()
const workspace = usePrizeRedemptionWorkspace()

const isWorkspaceLoading = computed(() =>
  workspace.pendingStatus.value === 'idle'
  || workspace.pendingStatus.value === 'pending'
  || (workspace.tasks.value.length > 0
    && (workspace.currentTermsStatus.value === 'idle' || workspace.currentTermsStatus.value === 'pending'))
)

const availabilityById = computed(() =>
  Object.fromEntries(
    workspace.tasks.value.map(task => [task.id, getPrizeRedemptionAvailability(task)] as const)
  )
)

async function submitPrizeRedemption(redemptionId: string) {
  const redeemed = await workspace.redeemPrize(redemptionId)

  if (!redeemed) {
    return
  }

  toast.add({
    title: 'Prize redemption submitted',
    description: 'The winner details and exact winner-terms acceptance were recorded successfully.',
    color: 'success'
  })
}

useSeoMeta({
  title: 'Prize Redemptions | Codex Hackathons',
  description: 'Complete pending winner-facing prize redemption tasks across visible hackathons.'
})
</script>

<template>
  <AppContainer class="space-y-8 py-10 lg:py-14">
    <PageSection
      title="Prize redemptions"
      description="Complete pending winner-facing prize redemption tasks with the exact current winner terms for each hackathon."
    >
      <template #links>
        <AppButton
          to="/dashboard"
          label="Return to dashboard"
          color="neutral"
          variant="soft"
          icon="i-lucide-arrow-left"
          class="rounded-full"
        />
      </template>
    </PageSection>

    <AppAlert
      v-if="workspace.pendingErrorMessage.value"
      color="error"
      variant="soft"
      title="Prize redemptions unavailable"
      :description="workspace.pendingErrorMessage.value"
    />

    <AppAlert
      v-else-if="workspace.currentTermsErrorMessage.value"
      color="error"
      variant="soft"
      title="Winner terms unavailable"
      :description="workspace.currentTermsErrorMessage.value"
    />

    <AppAlert
      v-else-if="isWorkspaceLoading"
      color="neutral"
      variant="soft"
      title="Loading prize redemptions"
      description="Resolving pending redemption tasks and the exact current winner terms for each hackathon."
    />

    <template v-else>
      <div
        v-if="workspace.recentlyRedeemed.value.length > 0"
        class="grid gap-4"
      >
        <article
          v-for="redemption in workspace.recentlyRedeemed.value"
          :key="redemption.id"
          :data-testid="`prize-redemption-complete-${redemption.hackathon.slug}-${redemption.prize.id}`"
          class="rounded-[1.75rem] border border-success/30 bg-success/10 px-6 py-6 shadow-[0_24px_54px_-42px_rgba(16,110,66,0.55)]"
        >
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-success-700 dark:text-success-300">
                Recently submitted
              </p>
              <h2 class="text-xl font-semibold text-highlighted">
                {{ redemption.prize.name }}
              </h2>
              <p class="text-sm text-toned">
                {{ redemption.hackathon.name }}
              </p>
            </div>

            <AppBadge
              color="success"
              variant="soft"
            >
              {{ formatPrizeRedemptionStatus(redemption.status) }}
            </AppBadge>
          </div>
        </article>
      </div>

      <AppAlert
        v-if="workspace.tasks.value.length === 0"
        color="neutral"
        variant="soft"
        :title="workspace.recentlyRedeemed.value.length > 0 ? 'All prize redemptions are complete' : 'No pending prize redemptions'"
        :description="workspace.recentlyRedeemed.value.length > 0
          ? 'There are no remaining pending redemption tasks for the current account.'
          : 'This route becomes actionable only when the current account has an eligible pending prize redemption.'"
      />

      <div
        v-else
        class="grid gap-6"
      >
        <article
          v-for="task in workspace.tasks.value"
          :key="task.id"
          :data-testid="`prize-redemption-card-${task.hackathon.slug}-${task.prize.id}`"
          class="rounded-[1.9rem] border border-default/75 bg-elevated/90 px-6 py-6 shadow-[0_32px_72px_-52px_rgba(15,20,34,0.6)]"
        >
          <div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div class="space-y-5 xl:max-w-[22rem]">
              <div class="space-y-2">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  {{ task.hackathon.name }}
                </p>
                <div class="flex flex-wrap items-center gap-3">
                  <h2 class="text-2xl font-semibold text-highlighted">
                    {{ task.prize.name }}
                  </h2>
                  <AppBadge
                    :data-testid="`prize-redemption-status-${task.hackathon.slug}-${task.prize.id}`"
                    :color="getPrizeRedemptionStatusColor(task.status)"
                    variant="soft"
                  >
                    {{ formatPrizeRedemptionStatus(task.status) }}
                  </AppBadge>
                </div>
              </div>

              <p class="text-sm leading-6 text-toned">
                {{ summarizePrizeRedemptionTask(task) }}
              </p>

              <div class="grid gap-3 sm:grid-cols-2">
                <div class="app-inset-card-tight px-4 py-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Prize scope
                  </p>
                  <p class="mt-2 text-sm text-toned">
                    {{ describePrizeRedemptionRecipient(task) }}
                  </p>
                </div>

                <div class="app-inset-card-tight px-4 py-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Reward
                  </p>
                  <p class="mt-2 text-sm text-toned">
                    {{ task.prize.rewardValue }}<span v-if="task.prize.rewardCurrency"> {{ task.prize.rewardCurrency }}</span>
                  </p>
                </div>
              </div>
            </div>

            <div class="flex-1 space-y-5">
              <div class="app-inset-card px-5 py-5">
                <div class="space-y-2">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Current winner terms
                  </p>
                  <h3 class="text-lg font-semibold text-highlighted">
                    {{ task.currentWinnerTerms?.title ?? 'Unavailable' }}
                  </h3>
                  <p class="text-sm text-toned">
                    <template v-if="task.currentWinnerTerms">
                      Version {{ task.currentWinnerTerms.version }} published {{ task.currentWinnerTerms.publishedAt }}.
                    </template>
                    <template v-else>
                      The current winner terms could not be resolved for this hackathon.
                    </template>
                  </p>
                </div>

                <div
                  v-if="task.currentWinnerTerms"
                  class="mt-4 rounded-[1.25rem] border border-default/80 bg-elevated/70 px-4 py-4"
                >
                  <p class="text-sm leading-7 whitespace-pre-wrap text-toned">
                    {{ task.currentWinnerTerms.content }}
                  </p>
                </div>
              </div>

              <div class="app-inset-card px-5 py-5">
                <div class="space-y-4">
                  <AppFormField
                    :name="`legal-name-${task.id}`"
                    label="Legal name"
                    description="The submitted legal name is stored on the prize redemption record."
                  >
                    <AppInput
                      v-model="workspace.legalNameById[task.id]"
                      :disabled="!availabilityById[task.id]?.isEnabled || workspace.submittingById[task.id]"
                      placeholder="Enter the legal recipient name"
                      size="xl"
                    />
                  </AppFormField>

                  <AppCheckbox
                    v-model="workspace.termsAcceptedById[task.id]"
                    :disabled="!availabilityById[task.id]?.isEnabled || workspace.submittingById[task.id]"
                    :label="task.currentWinnerTerms
                      ? `I accept winner terms version ${task.currentWinnerTerms.version} exactly as shown above.`
                      : 'Current winner terms are unavailable.'"
                  />

                  <AppAlert
                    v-if="workspace.submissionErrorById[task.id]"
                    color="error"
                    variant="soft"
                    title="Prize redemption failed"
                    :description="workspace.submissionErrorById[task.id]"
                  />

                  <AppAlert
                    v-else-if="availabilityById[task.id]?.reason"
                    color="warning"
                    variant="soft"
                    title="Submission blocked"
                    :description="availabilityById[task.id]?.reason"
                  />

                  <div class="flex flex-wrap items-center gap-3">
                    <AppButton
                      :data-testid="`prize-redemption-submit-${task.hackathon.slug}-${task.prize.id}`"
                      color="primary"
                      :loading="workspace.submittingById[task.id]"
                      :disabled="!availabilityById[task.id]?.isEnabled || workspace.submittingById[task.id]"
                      @click="submitPrizeRedemption(task.id)"
                    >
                      Submit redemption
                    </AppButton>

                    <p class="text-sm text-muted">
                      The exact current winner terms version is submitted automatically with this action.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </template>
  </AppContainer>
</template>
