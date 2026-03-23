<script setup lang="ts">
definePageMeta({
  middleware: [to => useUser().value
    ? undefined
    : navigateTo(`/auth/login?returnTo=${encodeURIComponent(to.fullPath)}`)]
})

interface PrizeRedemptionListResponse {
  data: Array<{
    id: string
  }>
}

const {
  data: redemptions,
  error
} = await useFetch<PrizeRedemptionListResponse>('/api/prize-redemptions/me', {
  key: 'shell-prize-redemptions-route'
})

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode ?? error.value.status ?? 500,
    statusMessage: error.value.statusMessage ?? 'Unable to load prize redemptions.'
  })
}

if ((redemptions.value?.data.length ?? 0) === 0) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Prize redemptions are available only when the current account has a pending redemption task.'
  })
}

useSeoMeta({
  title: 'Prize Redemptions | Codex Hackathons',
  description: 'Shared winner-facing entry surface for prize redemption tasks.'
})
</script>

<template>
  <UContainer class="py-10 lg:py-14">
    <UPageSection
      title="Prize redemptions"
      description="This shared route exists so the shell can expose a stable winner-facing entry point before the dedicated redemption workflow lands."
    >
      <UCard
        variant="subtle"
        :ui="{ root: 'rounded-[1.75rem] border border-default/75 bg-elevated/84 shadow-[0_28px_64px_-48px_rgba(15,20,34,0.62)]' }"
      >
        <div class="space-y-4">
          <p class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            Winner-facing route scaffold
          </p>
          <p class="text-base leading-7 text-toned">
            The shell now exposes prize redemption only when the current account actually has pending redemption work. The full legal-name, winner-terms, and admin-visibility workflow follows in the dedicated redemption task.
          </p>
          <UButton
            to="/dashboard"
            label="Return to dashboard"
            color="primary"
            variant="soft"
            icon="i-lucide-arrow-left"
            class="rounded-full"
          />
        </div>
      </UCard>
    </UPageSection>
  </UContainer>
</template>
