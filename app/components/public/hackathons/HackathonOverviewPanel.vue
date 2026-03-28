<script setup lang="ts">
import { renderMarkdown } from '~/utils/markdown'

const props = defineProps<{
  description: string
}>()

const descriptionMarkdown = computed(() => props.description.trim())
const descriptionHtml = computed(() => descriptionMarkdown.value ? renderMarkdown(descriptionMarkdown.value) : '')
</script>

<template>
  <section
    v-if="descriptionHtml"
    class="hackathon-workspace-detail-panel rounded-xl p-6"
    data-testid="public-hackathon-overview"
  >
    <div
      class="hackathon-markdown"
      v-html="descriptionHtml"
    />
  </section>

  <section
    v-else
    class="hackathon-workspace-detail-panel-dashed rounded-xl p-8 text-center"
    data-testid="public-hackathon-overview-empty"
  >
    <p class="text-[15px] font-medium text-highlighted dark:text-white">
      Overview will appear here once published.
    </p>
  </section>
</template>
