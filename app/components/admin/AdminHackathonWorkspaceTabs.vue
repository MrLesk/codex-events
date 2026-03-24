<script setup lang="ts">
defineProps<{
  hackathonId: string
  currentSurface: 'setup' | 'operations' | 'competition'
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-default/70 bg-elevated/80 px-4 py-3">
    <span class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
      Workspace
    </span>

    <div class="flex flex-wrap gap-2">
      <AppButton
        :variant="currentSurface === 'setup' ? 'solid' : 'soft'"
        :color="currentSurface === 'setup' ? 'primary' : 'neutral'"
        :to="`/admin/hackathons/${hackathonId}`"
        label="Setup"
      />
      <AppButton
        :variant="currentSurface === 'operations' ? 'solid' : 'soft'"
        :color="currentSurface === 'operations' ? 'primary' : 'neutral'"
        :to="`/admin/hackathons/${hackathonId}/operations`"
        label="Operations"
      />
      <AppButton
        :variant="currentSurface === 'competition' ? 'solid' : 'soft'"
        :color="currentSurface === 'competition' ? 'primary' : 'neutral'"
        :to="`/admin/hackathons/${hackathonId}/competition`"
        label="Competition"
      />
    </div>
  </div>
</template>
