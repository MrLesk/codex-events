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
    class="!border !border-dashed !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.32)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60 rounded-xl p-8 text-center"
    data-testid="public-hackathon-overview-empty"
  >
    <p class="text-[15px] font-medium text-highlighted dark:text-white">
      Overview will appear here once published.
    </p>
  </section>
</template>
