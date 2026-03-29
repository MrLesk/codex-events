<script setup lang="ts">
import { MdEditor, config } from 'md-editor-v3'
import type { Themes, ToolbarNames } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

config({
  markdownItConfig(markdown) {
    markdown.set({
      html: false,
      linkify: true,
      breaks: true
    })
  }
})

const model = defineModel<string>({
  required: true
})

const props = withDefaults(defineProps<{
  editorId: string
  placeholder?: string
  height?: string
}>(), {
  placeholder: '',
  height: '460px'
})

const theme = ref<Themes>('light')
const toolbarsExclude: ToolbarNames[] = ['github', 'save', 'mermaid', 'katex']

let rootClassObserver: MutationObserver | null = null

function syncTheme() {
  if (!import.meta.client) {
    return
  }

  theme.value = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

onMounted(() => {
  syncTheme()

  rootClassObserver = new MutationObserver(syncTheme)
  rootClassObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
})

onBeforeUnmount(() => {
  rootClassObserver?.disconnect()
  rootClassObserver = null
})
</script>

<template>
  <div class="hackathon-markdown-editor">
    <MdEditor
      :id="props.editorId"
      v-model="model"
      :theme="theme"
      language="en-US"
      preview-theme="github"
      :toolbars-exclude="toolbarsExclude"
      no-mermaid
      no-katex
      no-echarts
      no-upload-img
      :placeholder="props.placeholder"
      :style="{ height: props.height }"
    />
  </div>
</template>

<style scoped>
.hackathon-markdown-editor :deep(.md-editor) {
  border-radius: 0.875rem;
  --md-color: var(--text-highlighted);
  --md-hover-color: var(--text-highlighted);
  --md-bk-color: #ffffff;
  --md-bk-color-outstand: #f3f3f5;
  --md-bk-hover-color: #ececf0;
  --md-border-color: rgb(3 2 19 / 0.08);
  --md-border-hover-color: rgb(3 2 19 / 0.2);
  --md-border-active-color: rgb(3 2 19 / 0.25);
}

.hackathon-markdown-editor :deep(.md-editor-dark) {
  --md-color: var(--text-highlighted);
  --md-hover-color: var(--text-highlighted);
  --md-bk-color: #111111;
  --md-bk-color-outstand: #171717;
  --md-bk-hover-color: #171717;
  --md-border-color: rgb(255 255 255 / 0.08);
  --md-border-hover-color: rgb(255 255 255 / 0.18);
  --md-border-active-color: rgb(255 255 255 / 0.24);
}

.hackathon-markdown-editor :deep(.md-editor-toolbar-wrapper) {
  backdrop-filter: blur(12px);
}

.hackathon-markdown-editor :deep(.md-editor-preview) {
  font-size: 15px;
  line-height: 1.75;
}
</style>
