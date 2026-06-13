<script setup lang="ts">
import type { PublicEventState } from '~/domains/events/presentation'
import type { EventState } from '~/domains/events/states'

export interface AccountEventDashboardListItem {
  id: string
  name: string
  description: string
  state: EventState | PublicEventState
  registrationOpensAt: string
  registrationClosesAt: string
  to: string
  actionLabel?: string
  overline?: string
  meta: string[]
  sortAt?: string
  externalAction?: {
    label: string
    to: string
  }
}

const props = defineProps<{
  title: string
  description: string
  items: AccountEventDashboardListItem[]
  emptyTitle: string
  emptyDescription: string
}>()

const expandedIds = ref(new Set<string>())
const sortedItems = computed(() =>
  props.items
    .map((item, index) => ({
      item,
      index,
      sortTimestamp: Date.parse(item.sortAt ?? '')
    }))
    .sort((left, right) => {
      const leftHasSort = !Number.isNaN(left.sortTimestamp)
      const rightHasSort = !Number.isNaN(right.sortTimestamp)

      if (!leftHasSort && !rightHasSort) {
        return left.index - right.index
      }

      if (!leftHasSort) {
        return 1
      }

      if (!rightHasSort) {
        return -1
      }

      return left.sortTimestamp - right.sortTimestamp || left.index - right.index
    })
    .map(({ item }) => item)
)

function isExpanded(id: string) {
  return expandedIds.value.has(id)
}

function toggleExpanded(id: string) {
  const nextExpandedIds = new Set(expandedIds.value)

  if (nextExpandedIds.has(id)) {
    nextExpandedIds.delete(id)
  } else {
    nextExpandedIds.add(id)
  }

  expandedIds.value = nextExpandedIds
}
</script>

<template>
  <section class="space-y-4">
    <div class="space-y-1 border-b border-black/8 pb-3 dark:border-white/[0.08]">
      <p class="text-[20px] font-medium text-highlighted dark:text-white">
        {{ props.title }}
      </p>
      <p class="max-w-3xl text-[14px] text-neutral-600 dark:text-[#A3A3A3]">
        {{ props.description }}
      </p>
    </div>

    <div
      v-if="props.items.length === 0"
      class="rounded-xl border border-dashed border-black/10 bg-white p-8 text-center dark:border-white/[0.08] dark:bg-[#111111]"
    >
      <p class="text-[15px] font-medium text-highlighted dark:text-white">
        {{ props.emptyTitle }}
      </p>
      <p class="mt-2 text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
        {{ props.emptyDescription }}
      </p>
    </div>

    <div
      v-else
      class="grid gap-4"
    >
      <AccountEventDashboardCard
        v-for="item in sortedItems"
        :key="item.id"
        :item="item"
        :expanded="isExpanded(item.id)"
        @toggle-expanded="toggleExpanded(item.id)"
      />
    </div>
  </section>
</template>
