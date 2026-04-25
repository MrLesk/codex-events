<script setup lang="ts">
const props = defineProps<{
  description: string
}>()

const descriptionMarkdown = computed(() => props.description.trim())
</script>

<template>
  <section
    v-if="descriptionMarkdown"
    class="hackathon-workspace-detail-panel rounded-xl p-6"
    data-testid="public-hackathon-overview"
  >
    <AppMarkdownRenderer :source="descriptionMarkdown" />
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
