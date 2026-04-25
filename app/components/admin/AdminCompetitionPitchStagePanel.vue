<script setup lang="ts">
type PitchLineupEntry = {
  submissionId: string
  order: number
  projectName: string | null
  teamName: string | null
  rank: number | null
  status: 'upcoming' | 'live' | 'presented'
}

const props = defineProps<{
  entries: PitchLineupEntry[]
  alert: {
    title: string
    description: string
  }
  canAdvance: boolean
  advanceLabel: string
  pendingActionKey?: string | null
}>()

const emit = defineEmits<{
  advance: []
}>()
</script>

<template>
  <AppCard class="rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Pitch
        </h2>
        <p class="text-sm text-muted">
          Finalist teams present live in the saved lineup order. Judge assignments for post-pitch scoring are created only after the full lineup is completed and you start pitch review separately.
        </p>
      </div>
    </template>

    <div class="space-y-5">
      <AppAlert
        color="neutral"
        variant="soft"
        :title="props.alert.title"
        :description="props.alert.description"
      />

      <div
        v-if="props.entries.length > 0"
        class="grid gap-3"
      >
        <article
          v-for="entry in props.entries"
          :key="entry.submissionId"
          class="rounded-xl border p-4 transition"
          :class="entry.status === 'live'
            ? 'border-primary/30 bg-primary/[0.06] dark:border-primary/35 dark:bg-primary/[0.08]'
            : entry.status === 'presented'
              ? 'border-black/8 bg-black/[0.03] dark:border-white/[0.08] dark:bg-white/[0.04]'
              : 'border-black/8 bg-white/80 dark:border-white/[0.08] dark:bg-[#111111]'"
        >
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Presentation #{{ entry.order }}
                </p>

                <AppBadge
                  v-if="entry.status === 'live'"
                  color="primary"
                  variant="soft"
                >
                  Live now
                </AppBadge>

                <AppBadge
                  v-else-if="entry.status === 'presented'"
                  color="success"
                  variant="soft"
                >
                  Presented
                </AppBadge>
              </div>

              <h3 class="text-base font-semibold text-highlighted">
                {{ entry.projectName ?? 'Untitled submission' }}
              </h3>

              <p class="text-sm text-toned">
                {{ entry.teamName ?? 'Team not available' }}
                <span v-if="entry.rank !== null"> • shortlist rank #{{ entry.rank }}</span>
              </p>
            </div>

            <p class="text-sm text-muted">
              {{ entry.status === 'upcoming'
                ? 'Waiting to present'
                : entry.status === 'live'
                  ? 'Currently enabled to present'
                  : 'Presentation completed' }}
            </p>
          </div>
        </article>
      </div>

      <AppAlert
        v-else
        color="warning"
        variant="soft"
        title="Pitch lineup unavailable"
        description="No finalist submissions are currently stored for the live pitch lineup."
      />

      <div class="flex flex-wrap gap-3">
        <AppButton
          color="primary"
          :loading="props.pendingActionKey === 'advance-pitch-presentation'"
          :disabled="!props.canAdvance"
          @click="emit('advance')"
        >
          {{ props.advanceLabel }}
        </AppButton>
      </div>
    </div>
  </AppCard>
</template>
