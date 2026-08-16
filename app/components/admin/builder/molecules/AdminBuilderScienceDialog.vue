<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger
} from 'reka-ui'
import {
  eventBuilderBlockDefinitions,
  eventBuilderBlockTypes,
  eventBuilderTypeProfiles
} from '#shared/domains/events/builder-blocks'
import { getScaledBlockEnergyDelta, getScaledBlockFocusCost } from '#shared/domains/events/builder-scoring'
import { eventBuilderBlockIcons } from '~/domains/events/builder'

// Every block at its default length, same numbers the palette
// and agenda rows show.
const blockValues = eventBuilderBlockTypes
  .filter(type => type !== 'custom')
  .map((type) => {
    const definition = eventBuilderBlockDefinitions[type]
    const focus = Math.round(getScaledBlockFocusCost(definition, definition.defaultDurationMinutes))
    const energy = Math.round(getScaledBlockEnergyDelta(definition, definition.defaultDurationMinutes))

    return {
      type,
      label: definition.label,
      minutes: definition.defaultDurationMinutes,
      focusLabel: focus === 0 ? '±0' : `−${focus}`,
      energy,
      energyLabel: energy === 0 ? '±0' : energy > 0 ? `+${energy}` : `−${Math.abs(energy)}`
    }
  })

const budgets = (Object.keys(eventBuilderTypeProfiles) as Array<keyof typeof eventBuilderTypeProfiles>)
  .map(eventType => ({
    eventType,
    focusBudget: eventBuilderTypeProfiles[eventType].focusBudget
  }))

const sections = [
  {
    icon: 'i-lucide-zap',
    title: 'Audience energy',
    body: 'The room\'s battery across the clock. Sessions drain it, and long passive stretches drain more per minute the longer they run. Real breaks and food recharge it. Attention research shows pauses under about 5 minutes are transitions, not recovery: restore peaks around 20 to 25 minutes and fades once a gap stretches into a hole in the schedule.'
  },
  {
    icon: 'i-lucide-crosshair',
    title: 'Participants focus',
    body: 'The day\'s attention bill. Every session asks for concentration, and one day can only carry so much of it. The bill is one way: coffee does not refund the morning keynote, which is why breaks lift energy but never focus. Psychologists call the leftover thinking from the last task attention residue, and a short pause does not clear it.'
  },
  {
    icon: 'i-lucide-shuffle',
    title: 'Activity variety',
    body: 'Monotony, inverted. Attention habituates to sameness, so several same-type passive sessions in a row get monotonous even when each one is good. Format changes, hands-on time, and social blocks reset the room.'
  },
  {
    icon: 'i-lucide-heart',
    title: 'Return intent',
    body: 'Whether people leave planning to come back. People judge an experience by its peak and its ending (the peak-end rule), so a social or demo close counts most, followed by food, social time spread through the day, and a registration window that leaves room to plan.'
  },
  {
    icon: 'i-lucide-gauge',
    title: 'Event balance',
    body: 'A weighted blend of the four meters, tuned per event type: a meetup is judged as an evening, a hackathon as a full day, so their focus and energy budgets differ. The score never blocks creating the event. It mirrors what the anonymous post-event feedback measures, just before the event instead of after it.'
  }
]
</script>

<template>
  <DialogRoot>
    <DialogTrigger
      aria-label="Why these numbers"
      title="Why these numbers"
      data-testid="event-builder-science-trigger"
      class="inline-flex size-6 items-center justify-center rounded-md text-muted transition hover:bg-black/5 hover:text-highlighted dark:hover:bg-white/[0.06]"
    >
      <AppIcon
        name="i-lucide-info"
        class="size-3.5"
      />
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]" />
      <DialogContent
        data-testid="event-builder-science-dialog"
        class="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-black/10 bg-white p-7 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.5)] outline-none dark:border-white/[0.12] dark:bg-[#161616]"
      >
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <DialogTitle class="text-base font-semibold text-highlighted">
              Why these numbers
            </DialogTitle>
            <DialogDescription class="mt-1 text-xs text-muted">
              What the meters measure and the research behind them.
            </DialogDescription>
          </div>
          <DialogClose
            aria-label="Close"
            class="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-black/5 hover:text-highlighted dark:hover:bg-white/[0.06]"
          >
            <AppIcon
              name="i-lucide-x"
              class="size-4"
            />
          </DialogClose>
        </div>

        <div class="space-y-4">
          <section
            v-for="section in sections"
            :key="section.title"
            class="flex gap-3"
          >
            <span class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-black/5 text-toned dark:bg-white/[0.06]">
              <AppIcon
                :name="section.icon"
                class="size-4"
              />
            </span>
            <div class="min-w-0">
              <h3 class="text-sm font-semibold text-highlighted">
                {{ section.title }}
              </h3>
              <p class="mt-0.5 text-sm leading-relaxed text-muted">
                {{ section.body }}
              </p>
            </div>
          </section>
        </div>

        <div class="mt-5 border-t border-black/5 pt-4 dark:border-white/[0.06]">
          <h3 class="text-sm font-semibold text-highlighted">
            Block values
          </h3>
          <p class="mt-0.5 text-xs text-muted">
            Every block at its default length. Longer passive sessions cost more per minute; recovery saturates instead of stacking.
          </p>

          <div
            class="mt-3 grid grid-cols-[minmax(0,1fr)_3rem_3rem_3rem] gap-x-2 gap-y-1.5 text-xs"
            data-testid="event-builder-science-block-values"
          >
            <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-dimmed">Block</span>
            <span class="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-dimmed">Length</span>
            <span class="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-dimmed">Focus</span>
            <span class="text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-dimmed">Energy</span>

            <template
              v-for="row in blockValues"
              :key="row.type"
            >
              <span class="inline-flex min-w-0 items-center gap-1.5 text-toned">
                <AppIcon
                  :name="eventBuilderBlockIcons[row.type]"
                  class="size-3.5 shrink-0 text-muted"
                />
                <span class="truncate">{{ row.label }}</span>
              </span>
              <span class="text-right tabular-nums text-muted">{{ row.minutes }}m</span>
              <span class="text-right tabular-nums text-sky-500">{{ row.focusLabel }}</span>
              <span
                class="text-right tabular-nums"
                :class="row.energy >= 0 ? 'text-emerald-500' : 'text-amber-500'"
              >{{ row.energyLabel }}</span>
            </template>

            <span class="inline-flex min-w-0 items-center gap-1.5 text-toned">
              <AppIcon
                :name="eventBuilderBlockIcons.custom"
                class="size-3.5 shrink-0 text-muted"
              />
              <span class="truncate">Custom Session</span>
            </span>
            <span class="col-span-3 self-center text-right text-[11px] text-dimmed">you set the dials</span>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-2">
            <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-dimmed">Focus budget</span>
            <span
              v-for="budget in budgets"
              :key="budget.eventType"
              class="inline-flex items-center gap-1 rounded-md border border-black/8 px-2 py-0.5 text-xs text-toned dark:border-white/[0.08]"
            >
              <span class="capitalize">{{ budget.eventType }}</span>
              <span class="tabular-nums text-sky-500">{{ budget.focusBudget }}</span>
            </span>
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-dimmed">Score bands</span>
            <span class="inline-flex items-center rounded-md border border-black/8 px-2 py-0.5 text-xs text-emerald-500 dark:border-white/[0.08]">80+ Excellent</span>
            <span class="inline-flex items-center rounded-md border border-black/8 px-2 py-0.5 text-xs text-sky-500 dark:border-white/[0.08]">60+ Good</span>
            <span class="inline-flex items-center rounded-md border border-black/8 px-2 py-0.5 text-xs text-amber-500 dark:border-white/[0.08]">40+ Fair</span>
            <span class="inline-flex items-center rounded-md border border-black/8 px-2 py-0.5 text-xs text-rose-500 dark:border-white/[0.08]">Below 40 Needs work</span>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
