<script setup lang="ts">
import type { DashboardEntry } from '~/composables/useShellNavigation'

const props = defineProps<{
  entry: DashboardEntry
}>()

const accentClass = computed(() => {
  switch (props.entry.accent) {
    case 'primary':
      return 'from-primary/18 via-primary/8 to-transparent'
    case 'secondary':
      return 'from-secondary/18 via-secondary/8 to-transparent'
    case 'success':
      return 'from-success/18 via-success/8 to-transparent'
    case 'warning':
      return 'from-warning/18 via-warning/8 to-transparent'
    default:
      return 'from-neutral/14 via-neutral/6 to-transparent'
  }
})
</script>

<template>
  <UCard
    variant="subtle"
    :ui="{ root: 'overflow-hidden rounded-[1.85rem] border border-default/75 bg-elevated/82 shadow-[0_30px_72px_-52px_rgba(15,20,34,0.65)] backdrop-blur' }"
  >
    <div class="relative">
      <div
        class="absolute inset-x-0 top-0 h-28 rounded-b-[1.5rem] bg-gradient-to-br opacity-90"
        :class="accentClass"
      />

      <div class="relative space-y-6">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-3">
            <UBadge
              color="neutral"
              variant="soft"
              class="rounded-full px-3 py-1 font-semibold tracking-[0.16em] uppercase"
            >
              {{ props.entry.badge ?? 'Workspace' }}
            </UBadge>

            <div>
              <h3 class="text-xl font-semibold tracking-[-0.03em] text-highlighted">
                {{ props.entry.label }}
              </h3>
              <p class="mt-3 text-sm leading-7 text-toned">
                {{ props.entry.description }}
              </p>
            </div>
          </div>

          <div class="flex size-12 shrink-0 items-center justify-center rounded-full border border-default/70 bg-bg/82 text-primary shadow-[0_18px_40px_-28px_rgba(15,20,34,0.45)]">
            <UIcon
              :name="props.entry.icon"
              class="size-5"
            />
          </div>
        </div>

        <div class="flex items-center justify-between gap-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Role-aware entry point
          </p>

          <UButton
            :to="props.entry.to"
            color="primary"
            variant="soft"
            trailing-icon="i-lucide-arrow-right"
            :label="`Open ${props.entry.label}`"
            class="rounded-full"
          />
        </div>
      </div>
    </div>
  </UCard>
</template>
