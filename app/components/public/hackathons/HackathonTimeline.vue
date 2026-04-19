<script setup lang="ts">
import type { PublicHackathon } from '~/composables/useHackathonPresentation'

const props = defineProps<{
  hackathon: PublicHackathon
  discordServerUrl?: string | null
  showAddress?: boolean
}>()

function formatAttendanceLabel(hackathon: Pick<PublicHackathon, 'inPersonEvent'>) {
  return hackathon.inPersonEvent ? 'In person' : 'No in-person attendance required'
}

const eventDetailRows = computed(() => {
  const rows: Array<{
    label: string
    value: string
    href?: string
  }> = [
    {
      label: 'Team size',
      value: `1-${props.hackathon.maxTeamMembers} members`
    },
    {
      label: 'Attendance',
      value: formatAttendanceLabel(props.hackathon)
    }
  ]

  if (props.hackathon.inPersonEvent) {
    rows.push({
      label: 'Location',
      value: formatHackathonLocation(props.hackathon)
    })
  }

  const address = props.hackathon.address.trim()

  if (props.showAddress && address) {
    rows.push({
      label: 'Address',
      value: address
    })
  }

  const lumaEventUrl = props.hackathon.lumaEventUrl?.trim()

  if (lumaEventUrl) {
    rows.push({
      label: 'Luma event',
      value: 'Open event page',
      href: lumaEventUrl
    })
  }

  const discordServerUrl = props.discordServerUrl?.trim()

  if (discordServerUrl) {
    rows.push({
      label: 'Discord server',
      value: 'Open server',
      href: discordServerUrl
    })
  }

  return rows
})

const registrationStart = computed(() => getHackathonDateTimePresentation(props.hackathon.registrationOpensAt))
const registrationEnd = computed(() => getHackathonDateTimePresentation(props.hackathon.registrationClosesAt))

const timelineEntries = computed(() => [
  {
    id: 'registration',
    eyebrow: 'Registration Window',
    title: null,
    status: describeHackathonWindowStatus(props.hackathon.registrationOpensAt, props.hackathon.registrationClosesAt),
    note: describeHackathonWindowNote(props.hackathon.registrationOpensAt, props.hackathon.registrationClosesAt),
    progress: getHackathonWindowProgress(props.hackathon.registrationOpensAt, props.hackathon.registrationClosesAt),
    accent: 'bg-green-500',
    start: registrationStart.value,
    end: registrationEnd.value
  },
  {
    id: 'details',
    eyebrow: 'Event Details',
    title: null,
    rows: eventDetailRows.value
  }
])
</script>

<template>
  <section
    data-testid="public-hackathon-timeline"
    class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
  >
    <div
      v-for="entry in timelineEntries"
      :key="entry.id"
      class="hackathon-workspace-detail-panel rounded-xl p-6"
    >
      <template v-if="entry.start && entry.end">
        <div class="mb-3 flex items-start justify-between gap-4">
          <h3 class="text-[14px] font-medium text-neutral-500 dark:text-[#A3A3A3]">
            {{ entry.eyebrow }}
          </h3>
          <span class="rounded-full border border-black/8 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-[#C9C9C9]">
            {{ entry.status }}
          </span>
        </div>

        <div
          class="hackathon-workspace-detail-inset rounded-[1rem] px-3.5 py-3"
          :title="`${entry.start.metaLabel} -> ${entry.end.metaLabel}`"
        >
          <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-4">
            <div class="min-w-0">
              <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-[#8C8C8C]">
                Opens
              </p>
              <p class="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
                {{ entry.start.timeLabel }}
              </p>
              <p class="mt-1 text-[12px] leading-4 text-neutral-500 dark:text-[#A3A3A3]">
                {{ entry.start.dayLabel }}, {{ entry.start.dateLabel }}
              </p>
            </div>

            <div
              class="flex items-center justify-center text-neutral-500 dark:text-[#A3A3A3]"
              aria-hidden="true"
            >
              <span class="inline-flex size-7 items-center justify-center rounded-full border border-black/8 bg-white/78 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <AppIcon
                  name="i-lucide-arrow-right"
                  class="size-3.5"
                />
              </span>
            </div>

            <div class="min-w-0 text-right">
              <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-[#8C8C8C]">
                Closes
              </p>
              <p class="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
                {{ entry.end.timeLabel }}
              </p>
              <p class="mt-1 text-[12px] leading-4 text-neutral-500 dark:text-[#A3A3A3]">
                {{ entry.end.dayLabel }}, {{ entry.end.dateLabel }}
              </p>
            </div>
          </div>
        </div>

        <div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/6 dark:bg-white/[0.05]">
          <div
            class="h-full"
            :class="entry.accent"
            :style="{ width: `${entry.progress}%` }"
          />
        </div>
        <p class="mt-2 text-[12px] text-neutral-500 dark:text-[#8C8C8C]">
          {{ entry.note }}
        </p>
      </template>

      <template v-else>
        <h3 class="mb-4 text-[14px] font-medium text-neutral-500 dark:text-[#A3A3A3]">
          {{ entry.eyebrow }}
        </h3>
        <div class="space-y-3">
          <div
            v-for="row in entry.rows"
            :key="row.label"
            class="flex items-start justify-between gap-5 text-[13px]"
          >
            <span class="text-neutral-500 dark:text-[#8C8C8C]">
              {{ row.label }}
            </span>
            <a
              v-if="row.href"
              :href="row.href"
              target="_blank"
              rel="noreferrer"
              class="inline-flex max-w-[16rem] items-center justify-end gap-1.5 text-right font-medium text-highlighted transition-colors hover:text-black dark:text-white dark:hover:text-white/80"
            >
              <span>{{ row.value }}</span>
              <AppIcon
                name="i-lucide-arrow-up-right"
                class="size-3.5 shrink-0"
              />
            </a>
            <span
              v-else
              class="max-w-[16rem] text-right font-medium leading-5 text-highlighted dark:text-white"
            >
              {{ row.value }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
