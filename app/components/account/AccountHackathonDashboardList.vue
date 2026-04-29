<script setup lang="ts">
import type { PublicHackathonState } from '~/domains/hackathons/presentation'
import type { HackathonState } from '~/domains/hackathons/states'
import { collapseMarkdownToPlainText } from '~/domains/hackathons/description'

import HackathonStateBadge from '~/components/public/hackathons/HackathonStateBadge.vue'

export interface AccountHackathonDashboardListItem {
  id: string
  name: string
  description: string
  state: HackathonState | PublicHackathonState
  registrationOpensAt: string
  registrationClosesAt: string
  to: string
  actionLabel?: string
  overline?: string
  meta: string[]
}

const props = defineProps<{
  title: string
  description: string
  items: AccountHackathonDashboardListItem[]
  emptyTitle: string
  emptyDescription: string
}>()

const descriptionPreviewCharacterLimit = 280
const expandedIds = ref(new Set<string>())

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

function getNormalizedDescription(value: string) {
  return collapseMarkdownToPlainText(value)
}

function getDescriptionPreview(item: AccountHackathonDashboardListItem) {
  const normalizedDescription = getNormalizedDescription(item.description)

  if (isExpanded(item.id) || normalizedDescription.length <= descriptionPreviewCharacterLimit) {
    return normalizedDescription
  }

  return `${normalizedDescription.slice(0, descriptionPreviewCharacterLimit).trimEnd()}…`
}

function shouldShowDescriptionToggle(item: AccountHackathonDashboardListItem) {
  return getNormalizedDescription(item.description).length > descriptionPreviewCharacterLimit
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
      <NuxtLink
        v-for="item in props.items"
        :key="item.id"
        :to="item.to"
        class="rounded-xl border border-black/8 bg-white p-5 transition-colors hover:border-black/20 dark:border-white/[0.08] dark:bg-[#111111] dark:hover:border-white/[0.2]"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-2">
            <p
              v-if="item.overline"
              class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
            >
              {{ item.overline }}
            </p>

            <div class="flex flex-wrap items-center gap-2">
              <p class="text-[18px] font-semibold text-highlighted dark:text-white">
                {{ item.name }}
              </p>
              <HackathonStateBadge
                :state="item.state"
                :registration-opens-at="item.registrationOpensAt"
                :registration-closes-at="item.registrationClosesAt"
              />
            </div>

            <p class="max-w-3xl break-words text-[14px] text-neutral-600 dark:text-[#B0B0B0]">
              {{ getDescriptionPreview(item) }}
            </p>

            <button
              v-if="shouldShowDescriptionToggle(item)"
              type="button"
              class="inline-flex text-[13px] font-medium text-highlighted transition-colors hover:text-neutral-700 dark:text-white dark:hover:text-[#D9D9D9]"
              @click.stop.prevent="toggleExpanded(item.id)"
            >
              {{ isExpanded(item.id) ? 'Show less' : 'Load more' }}
            </button>

            <div class="flex flex-wrap items-center gap-3 text-[12px] text-muted">
              <span
                v-for="metaItem in item.meta"
                :key="metaItem"
              >
                {{ metaItem }}
              </span>
            </div>
          </div>

          <div class="inline-flex items-center gap-1 text-[13px] font-medium text-highlighted dark:text-white">
            <span>{{ item.actionLabel ?? 'Open' }}</span>
            <AppIcon
              name="i-lucide-arrow-right"
              class="size-3.5"
            />
          </div>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
