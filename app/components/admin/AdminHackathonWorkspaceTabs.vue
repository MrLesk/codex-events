<script setup lang="ts">
defineProps<{
  hackathonSlug: string
  currentSurface: 'settings' | 'operations' | 'judging'
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-default/70 bg-elevated/80 px-4 py-3">
    <span class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
      Workspace
    </span>

    <div class="flex flex-wrap gap-2">
      <AppButton
        :variant="currentSurface === 'settings' ? 'solid' : 'soft'"
        :color="currentSurface === 'settings' ? 'primary' : 'neutral'"
        :to="`/hackathons/${hackathonSlug}/admin`"
        label="Settings"
      />
      <AppButton
        :variant="currentSurface === 'operations' ? 'solid' : 'soft'"
        :color="currentSurface === 'operations' ? 'primary' : 'neutral'"
        :to="`/hackathons/${hackathonSlug}/admin/operations`"
        label="Operations"
      />
      <AppButton
        :variant="currentSurface === 'judging' ? 'solid' : 'soft'"
        :color="currentSurface === 'judging' ? 'primary' : 'neutral'"
        :to="`/hackathons/${hackathonSlug}/admin/competition`"
        label="Judging"
      />
    </div>
  </div>
</template>
