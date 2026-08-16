<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { parseDateTime } from '@internationalized/date'
import {
  DatePickerCalendar,
  DatePickerCell,
  DatePickerCellTrigger,
  DatePickerContent,
  DatePickerField,
  DatePickerGrid,
  DatePickerGridBody,
  DatePickerGridHead,
  DatePickerGridRow,
  DatePickerHeadCell,
  DatePickerHeader,
  DatePickerHeading,
  DatePickerInput,
  DatePickerNext,
  DatePickerPrev,
  DatePickerRoot,
  DatePickerTrigger
} from 'reka-ui'
import { cn } from '~/lib/utils'

defineOptions({
  inheritAttrs: false
})

const [modelValue] = defineModel<string | undefined>()

const props = withDefaults(defineProps<{
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  pickerAriaLabel?: string
}>(), {
  disabled: false,
  size: 'md',
  pickerAriaLabel: 'Open the calendar'
})

const attrs = useAttrs()

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-4 py-3 text-sm',
    xl: 'px-4 py-3 text-sm'
  }

  return sizes[props.size]
})

// The app stores local datetimes as 'YYYY-MM-DDTHH:mm' strings (the old
// datetime-local convention), so the picker converts at its edge.
const dateModel = computed<DateValue | undefined>({
  get() {
    const value = modelValue.value?.trim()

    if (!value) {
      return undefined
    }

    try {
      return parseDateTime(value)
    } catch {
      return undefined
    }
  },
  set(value) {
    modelValue.value = value ? value.toString().slice(0, 16) : ''
  }
})

const hasDate = computed(() => dateModel.value !== undefined)

// The popover edits the clock in 12h form (hour + minute + AM/PM) while the
// field segments stay 24h; both write the same underlying value.
const hour24 = computed(() => {
  const value = dateModel.value

  return value && 'hour' in value ? value.hour : null
})

const hour12Label = computed(() => {
  if (hour24.value === null) {
    return ''
  }

  const hour = hour24.value % 12

  return String(hour === 0 ? 12 : hour).padStart(2, '0')
})

const minuteLabel = computed(() => {
  const value = dateModel.value

  return value && 'hour' in value ? String(value.minute).padStart(2, '0') : ''
})

const isPm = computed(() => hour24.value !== null && hour24.value >= 12)

function setHour12(raw: string) {
  const value = dateModel.value
  const parsed = Number(raw)

  if (!value || !('hour' in value) || !Number.isFinite(parsed)) {
    return
  }

  const clamped = Math.min(12, Math.max(1, Math.round(parsed)))

  dateModel.value = value.set({ hour: (clamped % 12) + (isPm.value ? 12 : 0) })
}

function setMinute(raw: string) {
  const value = dateModel.value
  const parsed = Number(raw)

  if (!value || !('hour' in value) || !Number.isFinite(parsed)) {
    return
  }

  dateModel.value = value.set({ minute: Math.min(59, Math.max(0, Math.round(parsed))) })
}

function setMeridiem(pm: boolean) {
  const value = dateModel.value

  if (!value || !('hour' in value) || pm === isPm.value) {
    return
  }

  dateModel.value = value.set({ hour: (value.hour + 12) % 24 })
}
</script>

<template>
  <DatePickerRoot
    v-model="dateModel"
    granularity="minute"
    :hour-cycle="24"
    locale="en-GB"
    :disabled="props.disabled"
  >
    <DatePickerField
      v-slot="{ segments }"
      v-bind="attrs"
      :class="cn('flex w-full select-none items-center rounded-lg border border-black/8 bg-white tabular-nums text-highlighted transition focus-within:border-black/25 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60 dark:border-white/[0.08] dark:bg-[#111111] dark:focus-within:border-white/[0.25]', sizeClasses)"
    >
      <template
        v-for="(item, index) in segments"
        :key="index"
      >
        <span
          v-if="item.part === 'literal'"
          class="whitespace-pre text-dimmed"
        >{{ item.value }}</span>
        <DatePickerInput
          v-else
          :part="item.part"
          class="rounded px-0.5 outline-none transition focus:bg-black/8 data-[placeholder]:text-dimmed dark:focus:bg-white/[0.14]"
        >
          {{ item.value }}
        </DatePickerInput>
      </template>

      <DatePickerTrigger
        class="ml-auto inline-flex shrink-0 items-center justify-center rounded-md p-1 text-muted transition hover:text-highlighted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-white/[0.14]"
        :aria-label="props.pickerAriaLabel"
      >
        <AppIcon
          name="i-lucide-calendar-range"
          class="size-4"
        />
      </DatePickerTrigger>
    </DatePickerField>

    <DatePickerContent
      :side-offset="6"
      class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 z-50 origin-(--reka-popover-content-transform-origin) rounded-xl border border-black/10 bg-white p-3 shadow-[0_16px_48px_-24px_rgba(15,23,42,0.4)] outline-none dark:border-white/[0.12] dark:bg-[#161616]"
    >
      <DatePickerCalendar
        v-slot="{ weekDays, grid }"
        class="select-none"
      >
        <DatePickerHeader class="mb-2 flex items-center justify-between gap-2">
          <DatePickerPrev
            class="inline-flex size-7 items-center justify-center rounded-md text-toned transition hover:bg-black/5 hover:text-highlighted disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/[0.06]"
            aria-label="Previous month"
          >
            <AppIcon
              name="i-lucide-chevron-left"
              class="size-4"
            />
          </DatePickerPrev>
          <DatePickerHeading class="text-sm font-medium text-highlighted" />
          <DatePickerNext
            class="inline-flex size-7 items-center justify-center rounded-md text-toned transition hover:bg-black/5 hover:text-highlighted disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/[0.06]"
            aria-label="Next month"
          >
            <AppIcon
              name="i-lucide-chevron-right"
              class="size-4"
            />
          </DatePickerNext>
        </DatePickerHeader>

        <DatePickerGrid
          v-for="month in grid"
          :key="month.value.toString()"
          class="w-full border-collapse space-y-1"
        >
          <DatePickerGridHead>
            <DatePickerGridRow class="flex w-full justify-between">
              <DatePickerHeadCell
                v-for="day in weekDays"
                :key="day"
                class="flex size-8 items-center justify-center text-[11px] font-medium text-dimmed"
              >
                {{ day }}
              </DatePickerHeadCell>
            </DatePickerGridRow>
          </DatePickerGridHead>
          <DatePickerGridBody>
            <DatePickerGridRow
              v-for="(weekDates, rowIndex) in month.rows"
              :key="`week-${rowIndex}`"
              class="flex w-full justify-between"
            >
              <DatePickerCell
                v-for="weekDate in weekDates"
                :key="weekDate.toString()"
                :date="weekDate"
              >
                <DatePickerCellTrigger
                  :day="weekDate"
                  :month="month.value"
                  class="flex size-8 items-center justify-center rounded-md text-sm text-toned transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 data-[disabled]:pointer-events-none data-[selected]:bg-primary data-[outside-view]:text-dimmed/50 data-[selected]:text-primary-foreground data-[disabled]:opacity-40 data-[today]:font-semibold data-[selected]:hover:bg-primary dark:hover:bg-white/[0.08] dark:focus-visible:ring-white/[0.2]"
                />
              </DatePickerCell>
            </DatePickerGridRow>
          </DatePickerGridBody>
        </DatePickerGrid>
      </DatePickerCalendar>

      <div class="mt-3 flex items-center gap-2 border-t border-black/5 pt-3 dark:border-white/[0.06]">
        <AppIcon
          name="i-lucide-clock"
          class="size-4 shrink-0 text-muted"
        />
        <input
          type="number"
          min="1"
          max="12"
          :value="hour12Label"
          :disabled="!hasDate"
          placeholder="06"
          aria-label="Hour"
          :title="hasDate ? 'Hour' : 'Pick a date first'"
          class="h-8 w-12 rounded-lg border border-black/8 bg-white text-center text-sm tabular-nums text-highlighted outline-none transition focus:border-black/25 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
          @change="event => setHour12((event.target as HTMLInputElement).value)"
        >
        <span class="text-sm text-dimmed">:</span>
        <input
          type="number"
          min="0"
          max="59"
          step="5"
          :value="minuteLabel"
          :disabled="!hasDate"
          placeholder="30"
          aria-label="Minute"
          :title="hasDate ? 'Minute' : 'Pick a date first'"
          class="h-8 w-12 rounded-lg border border-black/8 bg-white text-center text-sm tabular-nums text-highlighted outline-none transition focus:border-black/25 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[0.08] dark:bg-[#111111] dark:focus:border-white/[0.25]"
          @change="event => setMinute((event.target as HTMLInputElement).value)"
        >
        <div
          class="ml-1 inline-flex overflow-hidden rounded-lg border border-black/8 dark:border-white/[0.08]"
          role="group"
          aria-label="AM or PM"
        >
          <button
            type="button"
            :disabled="!hasDate"
            :aria-pressed="hasDate && !isPm"
            class="h-8 px-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
            :class="hasDate && !isPm
              ? 'bg-primary text-primary-foreground'
              : 'text-muted hover:bg-black/5 hover:text-highlighted dark:hover:bg-white/[0.06]'"
            @click="setMeridiem(false)"
          >
            AM
          </button>
          <button
            type="button"
            :disabled="!hasDate"
            :aria-pressed="isPm"
            class="h-8 px-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
            :class="isPm
              ? 'bg-primary text-primary-foreground'
              : 'text-muted hover:bg-black/5 hover:text-highlighted dark:hover:bg-white/[0.06]'"
            @click="setMeridiem(true)"
          >
            PM
          </button>
        </div>
        <span
          v-if="!hasDate"
          class="text-xs text-dimmed"
        >
          Pick a date first
        </span>
      </div>
    </DatePickerContent>
  </DatePickerRoot>
</template>
