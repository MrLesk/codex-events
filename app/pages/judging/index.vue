<script setup lang="ts">
definePageMeta({
  middleware: [to => useUser().value
    ? undefined
    : navigateTo(`/auth/login?returnTo=${encodeURIComponent(to.fullPath)}`)]
})

useSeoMeta({
  title: 'Judge Workspace | Codex Hackathons',
  description: 'Shared judge entry surface for blind assignment review.'
})
</script>

<template>
  <UContainer class="py-10 lg:py-14">
    <UPageSection
      title="Judge workspace"
      description="The canonical blind-review workspace is being delivered as part of the dedicated judging task. This route exists now so the shared shell can expose a stable judge entry point without leaking admin or team identity concerns."
    >
      <UCard
        variant="subtle"
        :ui="{ root: 'rounded-[1.75rem] border border-default/75 bg-elevated/84 shadow-[0_28px_64px_-48px_rgba(15,20,34,0.62)]' }"
      >
        <div class="space-y-4">
          <p class="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
            Shared route scaffold
          </p>
          <p class="text-base leading-7 text-toned">
            Use the dashboard to enter this area for now. The full assignment list, blind detail view, and review actions land with the dedicated judge workspace implementation.
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
